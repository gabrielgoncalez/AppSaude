import type { AppData, CapoeiraMovement, CapoeiraMovementStatus } from "../types/appData";
import type {
  Exercise,
  SkillWorkoutMetrics,
  TechnicalBlockLog,
  TechnicalItemLog,
  TechnicalMetricValue,
  TrainingPlan,
  TrainingSession,
} from "../types/training";

type CapoeiraLookup = {
  itemIds: Set<string>;
  scopedKeys: Set<string>;
  names: Set<string>;
  movementNames: Set<string>;
};

type CapoeiraMetricSource = Pick<
  SkillWorkoutMetrics,
  "technicalRatings" | "technicalValues" | "notes"
> & {
  metricValues?: Record<string, TechnicalMetricValue>;
};

type SyncOptions = {
  countReview?: boolean;
  now?: string;
};

export type CapoeiraProgressSummary = {
  completedCards: number;
  mastered: number;
  validating: number;
  movements: number;
};

export function getCapoeiraProgressSummary(data: AppData): CapoeiraProgressSummary {
  const movements = data.capoeiraMovements ?? [];
  const lookup = buildCapoeiraLookup(data.trainingPlan, movements);
  const completedCardKeys = new Set<string>();

  for (const session of data.sessions) {
    collectCompletedCapoeiraItems(session, lookup, completedCardKeys);
    collectTechnicalCapoeiraItems(session, lookup, completedCardKeys);
  }

  return {
    completedCards: completedCardKeys.size,
    mastered: movements.filter((movement) => movement.status === "mastered").length,
    validating: movements.filter((movement) => movement.status === "validating").length,
    movements: movements.length,
  };
}

export function isCapoeiraExercise(exercise: Exercise): boolean {
  return isCapoeiraIdentity(
    [
      exercise.id,
      exercise.referenceId,
      exercise.displayName,
      exercise.name,
      exercise.type,
      exercise.kind,
    ].join(" "),
  );
}

export function syncCapoeiraMovementsFromExercise(
  movements: CapoeiraMovement[] | undefined,
  exercise: Pick<
    Exercise,
    "id" | "referenceId" | "displayName" | "name" | "type" | "kind"
  >,
  metrics?: CapoeiraMetricSource,
  options: SyncOptions = {},
): CapoeiraMovement[] | undefined {
  if (!movements?.length || isGenericCapoeiraReview(exercise)) {
    return movements;
  }

  const movementIndex = findMovementIndex(movements, exercise);
  if (movementIndex < 0) {
    return movements;
  }

  const countReview = options.countReview ?? true;
  const now = options.now ?? new Date().toISOString();
  const patch = getCapoeiraMetricPatch(metrics, now);

  return movements.map((movement, index) => {
    if (index !== movementIndex) {
      return movement;
    }

    const nextStatus =
      patch.status ??
      (countReview && movement.status === "not_started" ? "learning" : movement.status);

    return {
      ...movement,
      ...patch,
      status: nextStatus,
      reviewsCompleted: movement.reviewsCompleted + (countReview ? 1 : 0),
      startedAt:
        movement.startedAt ??
        (countReview || nextStatus !== "not_started" ? now : movement.startedAt),
      masteredAt:
        nextStatus === "mastered" ? (movement.masteredAt ?? now) : movement.masteredAt,
    };
  });
}

export function syncCapoeiraMovementsFromTechnicalBlocks(
  movements: CapoeiraMovement[] | undefined,
  blocks: TechnicalBlockLog[] | undefined,
  options: {
    previousTechnicalBlocks?: TechnicalBlockLog[];
    previousCompletedItems?: string[];
    now?: string;
  } = {},
): CapoeiraMovement[] | undefined {
  if (!movements?.length || !blocks?.length) {
    return movements;
  }

  const previousTechnicalKeys = getCompletedTechnicalKeys(options.previousTechnicalBlocks);
  const previousCompletedItems = new Set(options.previousCompletedItems ?? []);
  let nextMovements = movements;

  for (const block of blocks) {
    for (const item of block.items) {
      if (!item.completed || !isCapoeiraTechnicalItem(item)) {
        continue;
      }

      const scopedKey = `${block.blockId}:${item.itemId}`;
      const wasAlreadyCompleted =
        previousTechnicalKeys.has(scopedKey) ||
        previousCompletedItems.has(scopedKey) ||
        previousCompletedItems.has(item.itemId);
      const hasMetrics = hasCapoeiraMetricData(item);

      if (wasAlreadyCompleted && !hasMetrics) {
        continue;
      }

      nextMovements =
        syncCapoeiraMovementsFromExercise(
          nextMovements,
          {
            id: item.itemId,
            name: item.itemName,
            displayName: item.itemName,
            type: "capoeira_movement",
            kind: "capoeira_movement",
          },
          item,
          {
            countReview: !wasAlreadyCompleted,
            now: options.now,
          },
        ) ?? nextMovements;
    }
  }

  return nextMovements;
}

function collectCompletedCapoeiraItems(
  session: TrainingSession,
  lookup: CapoeiraLookup,
  completedCardKeys: Set<string>,
) {
  for (const key of session.completedItems ?? []) {
    if (!isCapoeiraCompletionKey(key, lookup)) {
      continue;
    }
    completedCardKeys.add(`${session.id}:${normalizeCompletionKey(key)}`);
  }
}

function collectTechnicalCapoeiraItems(
  session: TrainingSession,
  lookup: CapoeiraLookup,
  completedCardKeys: Set<string>,
) {
  for (const block of session.technicalBlocks ?? []) {
    for (const item of block.items) {
      if (!item.completed || !isCapoeiraTechnicalItem(item, lookup)) {
        continue;
      }
      completedCardKeys.add(`${session.id}:${block.blockId}:${item.itemId}`);
    }
  }
}

function buildCapoeiraLookup(
  plan: TrainingPlan,
  movements: CapoeiraMovement[],
): CapoeiraLookup {
  const lookup: CapoeiraLookup = {
    itemIds: new Set(),
    scopedKeys: new Set(),
    names: new Set(),
    movementNames: new Set(movements.map((movement) => normalizeText(movement.displayName))),
  };

  for (const workout of plan.workouts) {
    for (const block of workout.workoutBlocks ?? []) {
      for (const item of block.items) {
        if (!isCapoeiraExercise(item)) {
          continue;
        }
        lookup.itemIds.add(item.id);
        if (item.referenceId) {
          lookup.itemIds.add(item.referenceId);
        }
        lookup.scopedKeys.add(`${block.id}:${item.id}`);
        lookup.names.add(normalizeText(item.displayName ?? item.name));
      }
    }
  }

  return lookup;
}

function isCapoeiraCompletionKey(key: string, lookup: CapoeiraLookup): boolean {
  const [, itemId = key] = key.includes(":") ? key.split(":") : ["", key];
  return (
    lookup.scopedKeys.has(key) ||
    lookup.itemIds.has(itemId) ||
    isCapoeiraIdentity(key, lookup.movementNames)
  );
}

function isCapoeiraTechnicalItem(
  item: TechnicalItemLog,
  lookup?: CapoeiraLookup,
): boolean {
  return (
    lookup?.itemIds.has(item.itemId) ||
    lookup?.names.has(normalizeText(item.itemName)) ||
    isCapoeiraIdentity(`${item.itemId} ${item.itemName}`, lookup?.movementNames)
  );
}

function getCompletedTechnicalKeys(blocks: TechnicalBlockLog[] = []): Set<string> {
  const keys = new Set<string>();
  for (const block of blocks) {
    for (const item of block.items) {
      if (item.completed) {
        keys.add(`${block.blockId}:${item.itemId}`);
      }
    }
  }
  return keys;
}

function findMovementIndex(
  movements: CapoeiraMovement[],
  exercise: Pick<Exercise, "id" | "referenceId" | "displayName" | "name">,
): number {
  const identity = normalizeText(
    [
      exercise.displayName,
      exercise.name,
      exercise.referenceId,
      exercise.id,
    ].join(" "),
  );

  return movements.findIndex((movement) => {
    const movementName = normalizeText(movement.displayName);
    return identity === movementName || identity.includes(movementName);
  });
}

function getCapoeiraMetricPatch(
  metrics: CapoeiraMetricSource | undefined,
  now: string,
): Partial<CapoeiraMovement> {
  const values = metrics?.metricValues ?? metrics?.technicalValues ?? {};
  const ratings = metrics?.technicalRatings ?? {};
  const status = parseCapoeiraStatus(values.capoeira_status);
  const quality1to5 = toRating(ratings.capoeira_quality ?? values.capoeira_quality);
  const fluency1to5 = toRating(ratings.capoeira_fluency ?? values.capoeira_fluency);
  const rightSideDone = toBoolean(values.capoeira_right_side);
  const leftSideDone = toBoolean(values.capoeira_left_side);
  const patch: Partial<CapoeiraMovement> = {};

  if (quality1to5) {
    patch.quality1to5 = quality1to5;
  }
  if (fluency1to5) {
    patch.fluency1to5 = fluency1to5;
  }
  if (rightSideDone !== undefined) {
    patch.rightSideDone = rightSideDone;
  }
  if (leftSideDone !== undefined) {
    patch.leftSideDone = leftSideDone;
  }
  if (status) {
    patch.status = status;
    if (status === "mastered") {
      patch.masteredAt = now;
    }
  }
  if (metrics?.notes?.trim()) {
    patch.notes = metrics.notes.trim();
  }

  return patch;
}

function hasCapoeiraMetricData(item: TechnicalItemLog): boolean {
  return Boolean(
    item.notes?.trim() ||
      item.technicalRatings?.capoeira_quality ||
      item.technicalRatings?.capoeira_fluency ||
      item.metricValues?.capoeira_quality ||
      item.metricValues?.capoeira_fluency ||
      item.metricValues?.capoeira_status ||
      item.metricValues?.capoeira_right_side !== undefined ||
      item.metricValues?.capoeira_left_side !== undefined,
  );
}

function parseCapoeiraStatus(value: TechnicalMetricValue): CapoeiraMovementStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeText(value);
  if (normalized === "nao_iniciado") {
    return "not_started";
  }
  if (normalized === "aprendendo") {
    return "learning";
  }
  if (normalized === "em_validacao") {
    return "validating";
  }
  if (normalized === "dominado") {
    return "mastered";
  }
  if (normalized === "revisao") {
    return "review";
  }

  return undefined;
}

function toRating(value: TechnicalMetricValue): 1 | 2 | 3 | 4 | 5 | undefined {
  return typeof value === "number" && value >= 1 && value <= 5
    ? (Math.round(value) as 1 | 2 | 3 | 4 | 5)
    : undefined;
}

function toBoolean(value: TechnicalMetricValue): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function isGenericCapoeiraReview(
  exercise: Pick<Exercise, "id" | "referenceId" | "displayName" | "name">,
): boolean {
  const identity = normalizeText(
    [exercise.id, exercise.referenceId, exercise.displayName, exercise.name].join(" "),
  );
  return identity.includes("banco") || identity.includes("automatica");
}

function isCapoeiraIdentity(identity: string, movementNames: Set<string> = new Set()): boolean {
  const normalized = normalizeText(identity);
  return (
    normalized.includes("capoeira") ||
    normalized.includes("ginga") ||
    normalized.includes("esquiva lateral") ||
    [...movementNames].some((movementName) => normalized.includes(movementName))
  );
}

function normalizeCompletionKey(key: string): string {
  return key.includes(":") ? key : `raw:${key}`;
}

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
