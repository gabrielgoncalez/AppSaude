export function isFinalExerciseSet(nextIndex: number, targetSets: number): boolean {
  return nextIndex >= Math.max(1, targetSets);
}

export function getSetActionLabel(nextIndex: number, targetSets: number): string {
  return isFinalExerciseSet(nextIndex, targetSets)
    ? "Finalizar exercício"
    : "Finalizar série";
}
