import type { PrescribedBlock } from "./prescriptionEngine";
import type { Exercise, ExerciseLog, TrainingSession, Workout } from "../types/training";
import { getActiveExercises } from "./exerciseAnalytics";
import { isDailyItemCompleted } from "./dailyCompletion";
import { formatKg } from "./progression";
import { countCompletedWorkSets, getCompletedWorkSets, getMaxWorkWeight } from "./sets";
import { isStrengthExercise } from "./workoutItems";

export type WorkoutNewMax = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  previousWeightKg?: number;
};

export type WorkoutSummary = {
  sessionId: string;
  workoutName: string;
  earnedXp: number;
  completedExercises: number;
  totalExercises: number;
  newMaxes: WorkoutNewMax[];
  nextWorkoutName: string;
  nextSuggestion: string;
};

export function buildWorkoutSummary({
  session,
  previousSessions,
  workout,
  nextWorkout,
  prescribedBlocks,
}: {
  session: TrainingSession;
  previousSessions: TrainingSession[];
  workout: Workout;
  nextWorkout: Workout;
  prescribedBlocks?: PrescribedBlock[];
}): WorkoutSummary {
  const summaryItems = getSummaryItems(workout, prescribedBlocks);
  const totalExercises = summaryItems.length || (workout.blocks?.length ? 1 : 0);
  const completedExercises = summaryItems.length
    ? summaryItems.filter(({ blockId, exercise }) =>
        blockId
          ? isDailyItemCompleted({
              blockId,
              item: exercise,
              completedItems: session.completedItems,
              exerciseLogs: session.exercises,
            })
          : isExerciseLogComplete(session, exercise),
      ).length
    : session.status === "completed"
      ? totalExercises
      : 0;
  const newMaxes = getNewMaxes(session, previousSessions);

  return {
    sessionId: session.id,
    workoutName: session.workoutName,
    earnedXp: session.earnedXp,
    completedExercises,
    totalExercises,
    newMaxes,
    nextWorkoutName: nextWorkout.name,
    nextSuggestion: getNextSuggestion({
      completedExercises,
      totalExercises,
      newMaxes,
      nextWorkout,
    }),
  };
}

function getSummaryItems(
  workout: Workout,
  prescribedBlocks?: PrescribedBlock[],
): Array<{ blockId?: string; exercise: Exercise }> {
  const prescribedItems = prescribedBlocks?.flatMap((block) =>
    block.blockMode === "sets"
      ? block.items
          .map((item) => item.exercise)
          .filter(isStrengthExercise)
          .map((exercise) => ({ blockId: block.id, exercise }))
      : [],
  );

  if (prescribedItems?.length) {
    return prescribedItems;
  }

  return getActiveExercises(workout).map((exercise) => ({ exercise }));
}

function isExerciseLogComplete(session: TrainingSession, exercise: Exercise): boolean {
  const log = session.exercises.find((candidate) => candidate.exerciseId === exercise.id);
  const completedSets = countCompletedWorkSets(log);
  return Boolean(log?.completed) || completedSets >= exercise.targetSets;
}

function getNewMaxes(
  session: TrainingSession,
  previousSessions: TrainingSession[],
): WorkoutNewMax[] {
  return session.exercises
    .flatMap((log) => {
      const weightKg = getMaxWeight(log);
      const previousWeightKg = getPreviousMax(previousSessions, log.exerciseId);
      if (weightKg <= 0 || weightKg <= previousWeightKg) {
        return [];
      }

      const max: WorkoutNewMax = {
        exerciseId: log.exerciseId,
        exerciseName: log.exerciseName,
        weightKg,
      };
      if (previousWeightKg > 0) {
        max.previousWeightKg = previousWeightKg;
      }
      return [max];
    });
}

function getPreviousMax(
  sessions: TrainingSession[],
  exerciseId: string,
): number {
  return Math.max(
    ...sessions.flatMap((session) =>
      session.exercises
        .filter((log) => log.exerciseId === exerciseId)
        .flatMap((log) => getCompletedWorkSets(log).map((set) => set.weightKg ?? 0)),
    ),
    0,
  );
}

function getMaxWeight(log: ExerciseLog): number {
  return getMaxWorkWeight(log);
}

function getNextSuggestion({
  completedExercises,
  totalExercises,
  newMaxes,
  nextWorkout,
}: {
  completedExercises: number;
  totalExercises: number;
  newMaxes: WorkoutNewMax[];
  nextWorkout: Workout;
}): string {
  if (completedExercises < totalExercises) {
    return "No próximo treino, priorize fechar os exercícios pendentes antes de buscar carga nova.";
  }

  if (newMaxes.length > 0) {
    const best = newMaxes[0];
    return `Boa: ${best.exerciseName} chegou em ${formatKg(best.weightKg)}. Próxima missão: manter técnica e não transformar PR em pressa.`;
  }

  if (nextWorkout.type === "skill" || nextWorkout.type === "skill_cardio") {
    return "Próxima missão é técnica: ritmo calmo, repetição limpa e respiração.";
  }

  return "Na próxima sessão, tente ganhar 1 repetição em uma série antes de pensar em subir carga.";
}
