import type { TrainingSession } from "../types/training";
import { getCompletedWorkSets, getMaxWorkWeight, isWorkSet } from "./sets";

export type PrEvent = {
  id: string;
  itemId: string;
  itemName: string;
  type: "max_weight" | "same_weight_reps" | "duration" | "technical";
  value: number;
  previousValue?: number;
  date: string;
};

export function detectSessionPrs(
  session: TrainingSession,
  previousSessions: TrainingSession[],
): PrEvent[] {
  return session.exercises.flatMap((exercise) => {
    const prs: PrEvent[] = [];
    const maxWeight = getMaxWorkWeight(exercise);
    const previousMax = getPreviousMaxWeight(previousSessions, exercise.exerciseId);
    if (maxWeight > previousMax) {
      prs.push({
        id: `${session.id}-${exercise.exerciseId}-max-weight`,
        itemId: exercise.exerciseId,
        itemName: exercise.exerciseName,
        type: "max_weight",
        value: maxWeight,
        previousValue: previousMax > 0 ? previousMax : undefined,
        date: session.date,
      });
      return prs;
    }

    const sameWeightReps = exercise.sets
      .filter((set) => set.completed && isWorkSet(set) && (set.weightKg ?? 0) === maxWeight)
      .reduce((sum, set) => sum + (set.reps ?? 0), 0);
    const previousSameWeightReps = getPreviousBestRepsAtWeight(
      previousSessions,
      exercise.exerciseId,
      maxWeight,
    );
    if (maxWeight > 0 && sameWeightReps > previousSameWeightReps) {
      prs.push({
        id: `${session.id}-${exercise.exerciseId}-same-weight-reps`,
        itemId: exercise.exerciseId,
        itemName: exercise.exerciseName,
        type: "same_weight_reps",
        value: sameWeightReps,
        previousValue:
          previousSameWeightReps > 0 ? previousSameWeightReps : undefined,
        date: session.date,
      });
      return prs;
    }

    const technicalScore = getTechnicalScore(exercise);
    const previousTechnicalScore = getPreviousBestTechnicalScore(
      previousSessions,
      exercise.exerciseId,
    );
    if (
      technicalScore !== undefined &&
      technicalScore > previousTechnicalScore
    ) {
      prs.push({
        id: `${session.id}-${exercise.exerciseId}-technical`,
        itemId: exercise.exerciseId,
        itemName: exercise.exerciseName,
        type: "technical",
        value: technicalScore,
        previousValue:
          previousTechnicalScore > 0 ? previousTechnicalScore : undefined,
        date: session.date,
      });
    }

    return prs;
  });
}

export function getPrBonus(session: TrainingSession, previousSessions: TrainingSession[]): number {
  return detectSessionPrs(session, previousSessions).length * 20;
}

function getPreviousMaxWeight(
  sessions: TrainingSession[],
  exerciseId: string,
): number {
  return Math.max(
    ...sessions.flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .flatMap((exercise) => getCompletedWorkSets(exercise).map((set) => set.weightKg ?? 0)),
    ),
    0,
  );
}

function getPreviousBestRepsAtWeight(
  sessions: TrainingSession[],
  exerciseId: string,
  weightKg: number,
): number {
  return Math.max(
    ...sessions.flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) =>
          exercise.sets
            .filter((set) => set.completed && isWorkSet(set) && (set.weightKg ?? 0) === weightKg)
            .reduce((sum, set) => sum + (set.reps ?? 0), 0),
        ),
    ),
    0,
  );
}

function getTechnicalScore(exercise: TrainingSession["exercises"][number]): number | undefined {
  const scores = exercise.sets
    .filter((set) => set.completed)
    .map((set) => {
      if (set.attempts && set.attempts > 0 && set.hits !== undefined) {
        return (set.hits / set.attempts) * 100;
      }

      if (set.cleanStreakSec !== undefined || set.errors !== undefined) {
        return (set.cleanStreakSec ?? 0) - (set.errors ?? 0) * 10;
      }

      if (set.quality1to5 !== undefined) {
        return set.quality1to5 * 20;
      }

      const ratingValues = Object.values(set.technicalRatings ?? {});
      if (ratingValues.length) {
        return (
          ratingValues.reduce((sum, rating) => sum + rating, 0) /
          ratingValues.length
        ) * 20;
      }

      return undefined;
    })
    .filter((score): score is number => score !== undefined);

  return scores.length ? Math.max(...scores) : undefined;
}

function getPreviousBestTechnicalScore(
  sessions: TrainingSession[],
  exerciseId: string,
): number {
  return Math.max(
    ...sessions.flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) => getTechnicalScore(exercise) ?? 0),
    ),
    0,
  );
}
