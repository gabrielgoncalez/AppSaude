import { differenceInCalendarWeeks, parseISO } from "date-fns";
import type { AppData, TrainingPhase } from "../types/appData";

export type PhaseReading = {
  phase?: TrainingPhase;
  week: number;
  canSuggestChange: boolean;
  message: string;
};

export function getCurrentPhaseReading(data: AppData, date = new Date()): PhaseReading {
  const phase = data.trainingPhases?.find((item) => item.status === "active");
  if (!phase) {
    return {
      week: 1,
      canSuggestChange: false,
      message: "Fase inicial ainda não configurada.",
    };
  }

  const week = Math.max(1, differenceInCalendarWeeks(date, parseISO(phase.startDate)) + 1);
  const keyExerciseExposures = getMinimumKeyExerciseExposure(data);
  const canSuggestChange = week >= phase.plannedWeeks || keyExerciseExposures >= 6;

  return {
    phase,
    week,
    canSuggestChange,
    message: canSuggestChange
      ? "Já existe base suficiente para revisar com calma."
      : "Mantenha a fase. Ainda é cedo para trocar exercício-chave.",
  };
}

function getMinimumKeyExerciseExposure(data: AppData): number {
  const keyIds = data.trainingPlan.workouts.flatMap((workout) =>
    (workout.exercises ?? [])
      .filter((exercise) => exercise.isKeyExercise || exercise.priority === "base")
      .map((exercise) => exercise.id),
  );

  if (!keyIds.length) {
    return 0;
  }

  return Math.min(
    ...keyIds.map((exerciseId) =>
      data.sessions.filter((session) =>
        session.exercises.some((log) => log.exerciseId === exerciseId),
      ).length,
    ),
  );
}
