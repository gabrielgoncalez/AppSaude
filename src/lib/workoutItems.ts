import type {
  Exercise,
  TrainingPlan,
  Workout,
  WorkoutBlock,
} from "../types/training";

const STRENGTH_BLOCK_TYPES = new Set<WorkoutBlock["type"]>(["main", "strength", "hypertrophy"]);
const STRENGTH_ITEM_TYPES = new Set<string>([
  "strength",
  "hypertrophy",
  "strength_technical",
  "core",
  "prehab",
  "optional",
]);

export type PlanItem = {
  workoutId: string;
  workoutName: string;
  blockId?: string;
  blockName?: string;
  exercise: Exercise;
};

export function getWorkoutBlocks(workout: Workout): WorkoutBlock[] {
  return workout.workoutBlocks ?? [];
}

export function getStrengthBlock(workout: Workout): WorkoutBlock | undefined {
  const blocks = getWorkoutBlocks(workout);
  return (
    blocks.find((block) => block.id.includes("musculacao")) ??
    blocks.find((block) => STRENGTH_BLOCK_TYPES.has(block.type)) ??
    blocks.find((block) => block.name.toLowerCase().includes("muscula"))
  );
}

export function deriveStrengthExercises(workout: Workout): Exercise[] {
  const strengthBlock = getStrengthBlock(workout);
  if (!strengthBlock) {
    return workout.exercises ?? [];
  }

  return strengthBlock.items.filter((item) => isStrengthExercise(item));
}

export function withDerivedExercises(plan: TrainingPlan): TrainingPlan {
  let changed = false;
  const workouts = plan.workouts.map((workout) => {
    if (!workout.workoutBlocks?.length) {
      return workout;
    }

    const exercises = deriveStrengthExercises(workout);
    if (arraysSameById(exercises, workout.exercises ?? [])) {
      return workout;
    }

    changed = true;
    return { ...workout, exercises };
  });

  return changed ? { ...plan, workouts } : plan;
}

export function getWorkoutItems(workout: Workout, includeInactive = false): Exercise[] {
  if (workout.workoutBlocks?.length) {
    return workout.workoutBlocks.flatMap((block) =>
      block.items.filter((item) => includeInactive || item.active !== false),
    );
  }

  return (workout.exercises ?? []).filter((item) => includeInactive || item.active !== false);
}

export function getPlanItems(plan: TrainingPlan, includeInactive = true): PlanItem[] {
  return plan.workouts.flatMap((workout) =>
    workout.workoutBlocks?.length
      ? workout.workoutBlocks.flatMap((block) =>
          block.items
            .filter((exercise) => includeInactive || exercise.active !== false)
            .map((exercise) => ({
              workoutId: workout.id,
              workoutName: workout.name,
              blockId: block.id,
              blockName: block.name,
              exercise,
            })),
        )
      : (workout.exercises ?? [])
          .filter((exercise) => includeInactive || exercise.active !== false)
          .map((exercise) => ({
            workoutId: workout.id,
            workoutName: workout.name,
            exercise,
          })),
  );
}

export function getPlanStrengthExercises(
  plan: TrainingPlan,
  includeInactive = true,
): PlanItem[] {
  return plan.workouts.flatMap((workout) =>
    deriveStrengthExercises(workout)
      .filter((exercise) => includeInactive || exercise.active !== false)
      .map((exercise) => ({
        workoutId: workout.id,
        workoutName: workout.name,
        blockId: getStrengthBlock(workout)?.id,
        blockName: getStrengthBlock(workout)?.name,
        exercise,
      })),
  );
}

export function getPlanTechnicalItems(
  plan: TrainingPlan,
  includeInactive = true,
): PlanItem[] {
  return getPlanItems(plan, includeInactive).filter(
    ({ exercise }) => !isStrengthExercise(exercise),
  );
}

export function exerciseMatchesLogId(exercise: Exercise, logExerciseId: string): boolean {
  return exercise.id === logExerciseId || Boolean(exercise.legacyIds?.includes(logExerciseId));
}

export function isStrengthExercise(exercise: Exercise): boolean {
  return STRENGTH_ITEM_TYPES.has(exercise.type) || STRENGTH_ITEM_TYPES.has(exercise.kind ?? "");
}

function arraysSameById(left: Exercise[], right: Exercise[]): boolean {
  return left.length === right.length && left.every((item, index) => item.id === right[index]?.id);
}
