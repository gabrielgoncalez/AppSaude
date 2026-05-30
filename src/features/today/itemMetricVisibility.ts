import type { Exercise } from "../../types/training";
import type { PrescribedBlock } from "../../lib/prescriptionEngine";

export function shouldShowItemMetrics(block: PrescribedBlock, exercise: Exercise): boolean {
  if (
    block.blockMode === "test" ||
    block.type === "test" ||
    exercise.kind === "test" ||
    exercise.type === "test"
  ) {
    return true;
  }

  if (exercise.kind === "dance_external" || exercise.type === "dance_external") {
    return true;
  }

  if (exercise.kind === "capoeira_movement" || exercise.type === "capoeira_movement") {
    return (
      block.id === "capoeira-movimento-novo" ||
      exercise.id === "capoeira-movimento-novo-curso" ||
      exercise.priority === "technical"
    );
  }

  return false;
}
