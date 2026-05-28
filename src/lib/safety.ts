import type { Exercise, ExerciseLog, TrainingSession } from "../types/training";

export type SafetyAlert = {
  level: "info" | "warning" | "danger";
  title: string;
  message: string;
};

export function hasExerciseAlert(log: ExerciseLog): boolean {
  return (
    log.pain ||
    log.dizziness ||
    log.sets.some((set) => set.pain || set.dizziness)
  );
}

export function hasAnyAlert(session: TrainingSession): boolean {
  return session.exercises.some(hasExerciseAlert);
}

export function isExerciseFinished(log: ExerciseLog): boolean {
  return log.completed === true;
}

export function getLumbarSafetyAlert(
  exercise: Pick<Exercise, "name">,
  log?: Pick<ExerciseLog, "dizziness" | "sets">,
): SafetyAlert | undefined {
  const name = exercise.name.toLowerCase();
  const isLumbar = name.includes("lombar") || name.includes("banco romano");
  const hasDizziness =
    log?.dizziness || log?.sets.some((set) => set.dizziness) || false;

  if (!isLumbar || !hasDizziness) {
    return undefined;
  }

  return {
    level: "warning",
    title: "Tontura na lombar",
    message:
      "Não progrida este exercício hoje. Mantenha a cabeça neutra, reduza a amplitude, suba devagar e respire. Se continuar, troque temporariamente por Bird Dog, Dead Bug, Pallof Press ou prancha inclinada.",
  };
}

export function getRecentAlerts(sessions: TrainingSession[], limit = 3): SafetyAlert[] {
  return sessions
    .flatMap((session) =>
      session.exercises
        .filter(hasExerciseAlert)
        .map((exercise) => ({
          level: "warning" as const,
          title: exercise.dizziness ? "Tontura registrada" : "Dor registrada",
          message: `${exercise.exerciseName} em ${new Date(session.date).toLocaleDateString("pt-BR")}. Técnica limpa > ego.`,
        })),
    )
    .slice(-limit)
    .reverse();
}
