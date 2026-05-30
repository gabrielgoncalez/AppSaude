import type { SetKind } from "../types/training";

export function isFinalExerciseSet(nextIndex: number, targetSets: number): boolean {
  return nextIndex >= Math.max(1, targetSets);
}

export function getSetActionLabel(nextIndex: number, targetSets: number): string {
  return isFinalExerciseSet(nextIndex, targetSets)
    ? "Finalizar exercício"
    : "Finalizar série";
}

export function getSetKindForIndex(nextIndex: number, warmupSets = 0): SetKind {
  return nextIndex <= warmupSets ? "warmup" : "work";
}

export function getEffectiveWarmupSets(warmupSets?: number): number {
  return warmupSets ?? 1;
}

export function getWarmupLoadRange(
  workWeightKg?: number,
): { minKg: number; maxKg: number } | undefined {
  if (!workWeightKg) {
    return undefined;
  }

  return {
    minKg: roundWarmupLoad(workWeightKg * 0.4),
    maxKg: roundWarmupLoad(workWeightKg * 0.5),
  };
}

export function getWorkSetNumber(nextIndex: number, warmupSets = 0): number {
  return Math.max(0, nextIndex - warmupSets);
}

export function getTotalDisplayedSets(targetSets: number, warmupSets = 0): number {
  return Math.max(1, targetSets + warmupSets);
}

export function isFinalWorkSet(nextIndex: number, targetSets: number, warmupSets = 0): boolean {
  return getSetKindForIndex(nextIndex, warmupSets) === "work" &&
    getWorkSetNumber(nextIndex, warmupSets) >= Math.max(1, targetSets);
}

function roundWarmupLoad(value: number): number {
  return Math.max(0, Math.round(value / 2.5) * 2.5);
}
