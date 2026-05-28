import type { AppData } from "../types/appData";
import type { Exercise, ExerciseLog, TrainingPlan, TrainingSession, Workout } from "../types/training";
import {
  formatKg,
  getExerciseProgressionHistory,
  getProgressionSuggestion,
  type ProgressionSuggestion,
} from "./progression";

export type PlanExercise = {
  workoutId: string;
  workoutName: string;
  exercise: Exercise;
};

export type RepsByWeightPoint = {
  name: string;
  value: number;
};

export type ExerciseSessionPoint = {
  date: string;
  maxWeightKg: number;
  totalReps: number;
};

export type ExerciseAnalysis = {
  item?: PlanExercise;
  maxWeightKg?: number;
  lastWeightKg?: number;
  monthlyTargetKg?: number;
  monthlyStretchTargetKg?: number;
  weeksAtMaxWeight: number;
  repsByWeight: RepsByWeightPoint[];
  sessions: ExerciseSessionPoint[];
  suggestion: ProgressionSuggestion;
  emptyHint: string;
};

export type LineageOption = {
  id: string;
  name: string;
};

export type LineageVariantAnalysis = {
  exerciseId: string;
  exerciseName: string;
  variantLabel: string;
  maxWeightKg?: number;
  lastWeightKg?: number;
  sessions: number;
};

export type LineageAnalysis = {
  id: string;
  name: string;
  variants: LineageVariantAnalysis[];
  totalSessions: number;
  emptyHint: string;
};

export function getActiveExercises(workout: Workout): Exercise[] {
  return (workout.exercises ?? []).filter((exercise) => exercise.active !== false);
}

export function getPlanExercises(plan: TrainingPlan, includeInactive = true): PlanExercise[] {
  return plan.workouts.flatMap((workout) =>
    (workout.exercises ?? [])
      .filter((exercise) => includeInactive || exercise.active !== false)
      .map((exercise) => ({
        workoutId: workout.id,
        workoutName: workout.name,
        exercise,
      })),
  );
}

export function getExerciseAnalysis(
  data: AppData,
  exerciseId: string,
  date = new Date(),
): ExerciseAnalysis {
  const item = getPlanExercises(data.trainingPlan).find(
    (candidate) => candidate.exercise.id === exerciseId,
  );

  if (!item) {
    return createEmptyAnalysis("Escolha um exercício para abrir a análise da Onda.");
  }

  const matchingSessions = getSessionsWithExercise(data.sessions, exerciseId);
  if (matchingSessions.length === 0) {
    return {
      ...createEmptyAnalysis("Primeira carga máxima aparece após um treino registrado."),
      item,
    };
  }

  const latest = matchingSessions.at(-1);
  const latestLog = latest?.log;
  const history = getExerciseProgressionHistory(item.exercise, data.sessions, undefined, date);
  const suggestionHistory = getExerciseProgressionHistory(
    item.exercise,
    data.sessions,
    latest?.session.id,
    date,
  );
  const repsByWeight = getRepsByWeight(data.sessions, exerciseId);
  const sessionPoints = matchingSessions.map(({ session, log }) => ({
    date: session.date,
    maxWeightKg: getMaxWeight(log),
    totalReps: log.sets.reduce(
      (sum, set) => sum + (set.completed ? (set.reps ?? 0) : 0),
      0,
    ),
  }));

  return {
    item,
    maxWeightKg: history.maxWeightKg,
    lastWeightKg: latestLog ? getMaxWeight(latestLog) : undefined,
    monthlyTargetKg: history.monthlyTargetKg,
    monthlyStretchTargetKg: history.monthlyStretchTargetKg,
    weeksAtMaxWeight: history.weeksAtMaxWeight,
    repsByWeight,
    sessions: sessionPoints,
    suggestion: getProgressionSuggestion(item.exercise, latestLog, suggestionHistory),
    emptyHint:
      matchingSessions.length < 2
        ? "Registre 2 treinos para eu calcular sua Onda com mais confiança."
        : "",
  };
}

export function getPlanLineages(plan: TrainingPlan): LineageOption[] {
  const lineages = new Map<string, string>();
  getPlanExercises(plan).forEach(({ exercise }) => {
    if (!exercise.lineageId) {
      return;
    }
    lineages.set(exercise.lineageId, exercise.lineageName ?? exercise.lineageId);
  });

  return [...lineages.entries()].map(([id, name]) => ({ id, name }));
}

export function getLineageAnalysis(
  data: AppData,
  lineageId: string,
  date = new Date(),
): LineageAnalysis {
  const variants = getPlanExercises(data.trainingPlan)
    .filter(({ exercise }) => exercise.lineageId === lineageId)
    .map(({ exercise }) => {
      const matchingSessions = getSessionsWithExercise(data.sessions, exercise.id);
      const latest = matchingSessions.at(-1);
      const history = getExerciseProgressionHistory(exercise, data.sessions, undefined, date);
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        variantLabel: getVariantLabel(exercise),
        maxWeightKg: history.maxWeightKg,
        lastWeightKg: latest?.log ? getMaxWeight(latest.log) : undefined,
        sessions: matchingSessions.length,
      };
    });

  return {
    id: lineageId,
    name:
      getPlanLineages(data.trainingPlan).find((lineage) => lineage.id === lineageId)?.name ??
      lineageId,
    variants,
    totalSessions: variants.reduce((sum, variant) => sum + variant.sessions, 0),
    emptyHint: variants.some((variant) => variant.sessions > 0)
      ? ""
      : "Registre as variacoes dessa linhagem para comparar maquina, halteres e livre sem misturar cargas.",
  };
}

export function getRepsByWeight(
  sessions: TrainingSession[],
  exerciseId: string,
): RepsByWeightPoint[] {
  const totals = new Map<number, number>();

  sessions.forEach((session) => {
    session.exercises
      .filter((log) => log.exerciseId === exerciseId)
      .forEach((log) => {
        log.sets.forEach((set) => {
          if (!set.completed || !set.weightKg) {
            return;
          }
          totals.set(set.weightKg, (totals.get(set.weightKg) ?? 0) + (set.reps ?? 0));
        });
      });
  });

  return [...totals.entries()]
    .sort(([left], [right]) => left - right)
    .map(([weightKg, value]) => ({
      name: formatKg(weightKg),
      value,
    }));
}

function getSessionsWithExercise(sessions: TrainingSession[], exerciseId: string) {
  return [...sessions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .flatMap((session) => {
      const log = session.exercises.find((exercise) => exercise.exerciseId === exerciseId);
      return log ? [{ session, log }] : [];
    });
}

function createEmptyAnalysis(emptyHint: string): ExerciseAnalysis {
  return {
    repsByWeight: [],
    sessions: [],
    weeksAtMaxWeight: 0,
    suggestion: {
      level: "info",
      title: "Ainda sem histórico",
      message: emptyHint,
    },
    emptyHint,
  };
}

function getMaxWeight(log: ExerciseLog): number {
  return Math.max(...log.sets.map((set) => set.weightKg ?? 0), 0);
}

function getVariantLabel(exercise: Exercise): string {
  if (exercise.variantRole === "machine") {
    return "Maquina";
  }
  if (exercise.variantRole === "dumbbell") {
    return "Halteres";
  }
  if (exercise.variantRole === "barbell") {
    return "Barra";
  }
  if (exercise.variantRole === "free") {
    return "Livre";
  }
  if (exercise.variantRole === "cable") {
    return "Cabo";
  }
  if (exercise.variantRole === "bodyweight") {
    return "Peso corporal";
  }
  return exercise.equipment ?? "Especifico";
}
