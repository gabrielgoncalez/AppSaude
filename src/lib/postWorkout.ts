import type { ExerciseLog, TrainingSession, Workout } from "../types/training";
import { getActiveExercises } from "./exerciseAnalytics";
import { formatKg } from "./progression";

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
}: {
  session: TrainingSession;
  previousSessions: TrainingSession[];
  workout: Workout;
  nextWorkout: Workout;
}): WorkoutSummary {
  const activeExercises = getActiveExercises(workout);
  const totalExercises = activeExercises.length || (workout.blocks?.length ? 1 : 0);
  const completedExercises = activeExercises.length
    ? activeExercises.filter((exercise) => {
        const log = session.exercises.find((candidate) => candidate.exerciseId === exercise.id);
        const completedSets = log?.sets.filter((set) => set.completed).length ?? 0;
        return Boolean(log?.completed) || completedSets >= exercise.targetSets;
      }).length
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
        .flatMap((log) => log.sets.map((set) => set.weightKg ?? 0)),
    ),
    0,
  );
}

function getMaxWeight(log: ExerciseLog): number {
  return Math.max(...log.sets.map((set) => set.weightKg ?? 0), 0);
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
