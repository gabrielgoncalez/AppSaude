import type { Exercise, ExerciseLog, WorkoutBlock } from "../types/training";

export type RequiredItemContext = {
  capoeiraHasNewMovement?: boolean;
  isTestExposure?: boolean;
};

export function getCompletionKey(blockId: string, itemId: string): string {
  return `${blockId}:${itemId}`;
}

export function isActiveDailyItem(item: Exercise): boolean {
  return item.active !== false && item.phaseAvailability !== "future";
}

export function getCompletionKeys(blockId: string, item: Exercise): string[] {
  const ids = [item.id, ...(item.legacyIds ?? [])];
  return ids.flatMap((id) => [getCompletionKey(blockId, id), id]);
}

export function isDailyItemCompleted({
  blockId,
  item,
  completedItems = [],
  exerciseLogs = [],
}: {
  blockId: string;
  item: Exercise;
  completedItems?: string[];
  exerciseLogs?: ExerciseLog[];
}): boolean {
  const keys = getCompletionKeys(blockId, item);
  if (keys.some((key) => completedItems.includes(key))) {
    return true;
  }

  return exerciseLogs.some(
    (log) =>
      log.completed &&
      (log.exerciseId === item.id || Boolean(item.legacyIds?.includes(log.exerciseId))),
  );
}

export function isRequiredItem(
  block: Pick<WorkoutBlock, "id" | "required">,
  item: Exercise,
  context: RequiredItemContext = {},
): boolean {
  if (!isActiveDailyItem(item)) {
    return false;
  }
  if (item.required !== undefined) {
    return item.required;
  }
  if (block.id === "basquete-teste-5min") {
    return Boolean(context.isTestExposure);
  }
  if (block.id === "capoeira-movimento-novo") {
    return context.capoeiraHasNewMovement ?? true;
  }
  if (block.id === "capoeira-revisao-dominados") {
    return !(context.capoeiraHasNewMovement ?? true);
  }
  if (!block.required) {
    return false;
  }

  return item.priority !== "optional" && item.priority !== "future";
}

export function getRequiredBlockItems(
  block: Pick<WorkoutBlock, "id" | "required"> & { items: Array<{ exercise: Exercise }> },
  context: RequiredItemContext = {},
): Exercise[] {
  return block.items
    .map((item) => item.exercise)
    .filter((item) => isRequiredItem(block, item, context));
}

export function isDailyBlockCompleted({
  block,
  completedItems = [],
  exerciseLogs = [],
  requiredContext,
}: {
  block: Pick<WorkoutBlock, "id" | "required"> & { items: Array<{ exercise: Exercise }> };
  completedItems?: string[];
  exerciseLogs?: ExerciseLog[];
  requiredContext?: RequiredItemContext;
}): boolean {
  const requiredItems = getRequiredBlockItems(block, requiredContext);
  const relevantItems = requiredItems.length
    ? requiredItems
    : block.items.map((item) => item.exercise).filter(isActiveDailyItem);

  return (
    relevantItems.length > 0 &&
    relevantItems.every((item) =>
      isDailyItemCompleted({
        blockId: block.id,
        item,
        completedItems,
        exerciseLogs,
      }),
    )
  );
}

export function toggleScopedCompletion(
  completedItems: string[],
  blockId: string,
  item: Exercise,
): string[] {
  const key = getCompletionKey(blockId, item.id);
  const identityKeys = getCompletionKeys(blockId, item);
  return identityKeys.some((candidate) => completedItems.includes(candidate))
    ? completedItems.filter((candidate) => !identityKeys.includes(candidate))
    : [...completedItems, key];
}

export function addScopedCompletions(
  completedItems: string[],
  blockId: string,
  items: Exercise[],
): string[] {
  return unique([
    ...completedItems,
    ...items.filter(isActiveDailyItem).map((item) => getCompletionKey(blockId, item.id)),
  ]);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
