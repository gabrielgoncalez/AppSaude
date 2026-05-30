import type { Exercise, ExerciseLog, SetLog } from "../types/training";

export function isWarmupSet(set: Pick<SetLog, "setKind">): boolean {
  return set.setKind === "warmup";
}

export function isWorkSet(set: Pick<SetLog, "setKind">): boolean {
  return !set.setKind || set.setKind === "work";
}

export function getCompletedWorkSets(log?: Pick<ExerciseLog, "sets">): SetLog[] {
  return (log?.sets ?? []).filter((set) => set.completed && isWorkSet(set));
}

export function countCompletedWorkSets(log?: Pick<ExerciseLog, "sets">): number {
  return getCompletedWorkSets(log).length;
}

export function isExerciseWorkComplete(
  log: Pick<ExerciseLog, "completed" | "sets"> | undefined,
  exercise: Pick<Exercise, "targetSets">,
): boolean {
  return Boolean(log?.completed) || countCompletedWorkSets(log) >= exercise.targetSets;
}

export function getMaxWorkWeight(log: Pick<ExerciseLog, "sets">): number {
  return Math.max(...getCompletedWorkSets(log).map((set) => set.weightKg ?? 0), 0);
}

export function getTotalWorkReps(log: Pick<ExerciseLog, "sets">): number {
  return getCompletedWorkSets(log).reduce((sum, set) => sum + (set.reps ?? 0), 0);
}

