import { LEVELS, type Level } from "../data/levels";
import type { AppData } from "../types/appData";
import type { Reward } from "../types/rewards";
import type { TrainingSession } from "../types/training";
import { weekKey } from "./dates";
import { getTotalCoinsPenalty } from "./penaltyEngine";
import { isWorkSet } from "./sets";
import { isExerciseFinished } from "./safety";

export const XP_RULES = {
  setLogged: 1,
  exerciseCompleted: 2,
  strengthWorkoutCompleted: 6,
  boxingCompleted: 8,
  basketballCompleted: 8,
  danceCompleted: 8,
  capoeiraCompleted: 8,
  weekWithThreeStrength: 30,
  checkin: 10,
  executionComplete: 4,
  cleanWorkout: 4,
  pr: 8,
} as const;

export const ECONOMY_VERSION = 2;

export const COIN_RULES = {
  strengthWorkoutCompleted: 4,
  boxingCompleted: 3,
  basketballCompleted: 3,
  danceCompleted: 3,
  capoeiraCompleted: 3,
  weekWithThreeStrength: 10,
  checkin: 2,
  pr: 1,
} as const;

export function getTotalXp(data: AppData): number {
  return getJourneyXp(data);
}

export function getJourneyXp(data: AppData): number {
  return Math.max(0, getGrossXp(data));
}

export function getRewardCoins(data: AppData): number {
  return Math.max(0, getGrossCoins(data) - getTotalCoinsPenalty(data));
}

export function getGrossXp(data: AppData): number {
  const sessionXp = data.sessions.reduce(
    (sum, session) => sum + session.earnedXp,
    0,
  );
  const checkinXp = data.bodyCheckins.length * XP_RULES.checkin;
  return sessionXp + checkinXp + getWeeklyStrengthBonus(data.sessions);
}

export function getGrossCoins(data: AppData): number {
  const sessionCoins = data.sessions.reduce(
    (sum, session) => sum + (session.earnedCoins ?? calculateSessionCoins(session)),
    0,
  );
  const checkinCoins = data.bodyCheckins.length * COIN_RULES.checkin;
  return sessionCoins + checkinCoins + getWeeklyStrengthCoinBonus(data.sessions);
}

export function getClaimedXp(rewards: Reward[]): number {
  return rewards
    .filter((reward) => reward.claimed)
    .reduce((sum, reward) => sum + reward.costXp, 0);
}

export function getAvailableXp(data: AppData): number {
  return Math.max(0, getRewardCoins(data) - getClaimedXp(data.rewards));
}

export function getLevel(totalXp: number): Level {
  return LEVELS.reduce(
    (current, level) => (totalXp >= level.minXp ? level : current),
    LEVELS[0],
  );
}

export function getNextLevel(totalXp: number): Level | undefined {
  return LEVELS.find((level) => level.minXp > totalXp);
}

export function calculateSessionXp(session: TrainingSession): number {
  if (session.status === "skipped") {
    return 0;
  }

  const xpEligibleExercises = session.exercises.filter(
    (exercise) => exercise.type !== "technical_metric",
  );
  const setXp = xpEligibleExercises.reduce(
    (sum, exercise) =>
      sum +
      exercise.sets.filter((set) => set.completed && isWorkSet(set)).length *
        XP_RULES.setLogged,
    0,
  );
  const exerciseXp =
    xpEligibleExercises.filter(isExerciseFinished).length * XP_RULES.exerciseCompleted;
  const executionXp =
    isExecutionComplete(session)
      ? XP_RULES.executionComplete
      : 0;

  return setXp + exerciseXp + executionXp + workoutBonus(session);
}

export function calculateSessionCoins(session: TrainingSession): number {
  if (!isExecutionComplete(session)) {
    return 0;
  }

  return workoutCoinBonus(session);
}

function isExecutionComplete(session: TrainingSession): boolean {
  if (session.status !== "completed") {
    return false;
  }

  return (
    session.exercises.some((exercise) => exercise.completed) ||
    Boolean(session.completedBlocks?.length) ||
    Boolean(session.technicalBlocks?.some((block) => block.completed))
  );
}

export function getWeeklyStrengthBonus(sessions: TrainingSession[]): number {
  return countWeeksWithThreeStrengthSessions(sessions) *
    XP_RULES.weekWithThreeStrength;
}

export function getWeeklyStrengthCoinBonus(sessions: TrainingSession[]): number {
  return countWeeksWithThreeStrengthSessions(sessions) *
    COIN_RULES.weekWithThreeStrength;
}

function countWeeksWithThreeStrengthSessions(sessions: TrainingSession[]): number {
  const weeks = new Map<string, Set<string>>();

  sessions
    .filter(
      (session) =>
        session.status === "completed" && session.workoutId.startsWith("treino-"),
    )
    .forEach((session) => {
      const key = weekKey(session.date);
      const workouts = weeks.get(key) ?? new Set<string>();
      workouts.add(session.workoutId);
      weeks.set(key, workouts);
    });

  return [...weeks.values()].filter((workouts) => workouts.size >= 3).length;
}

function workoutBonus(session: TrainingSession): number {
  if (session.status !== "completed") {
    return 0;
  }

  if (session.workoutId.startsWith("treino-")) {
    return XP_RULES.strengthWorkoutCompleted;
  }
  if (session.workoutId === "boxe") {
    return XP_RULES.boxingCompleted;
  }
  if (session.workoutId === "basquete-handles") {
    return XP_RULES.basketballCompleted;
  }
  if (session.workoutId === "danca") {
    return XP_RULES.danceCompleted;
  }
  if (session.workoutId === "capoeira") {
    return XP_RULES.capoeiraCompleted;
  }
  return 0;
}

function workoutCoinBonus(session: TrainingSession): number {
  if (session.status !== "completed") {
    return 0;
  }

  if (session.workoutId.startsWith("treino-")) {
    return COIN_RULES.strengthWorkoutCompleted;
  }
  if (session.workoutId === "boxe") {
    return COIN_RULES.boxingCompleted;
  }
  if (session.workoutId === "basquete-handles") {
    return COIN_RULES.basketballCompleted;
  }
  if (session.workoutId === "danca") {
    return COIN_RULES.danceCompleted;
  }
  if (session.workoutId === "capoeira") {
    return COIN_RULES.capoeiraCompleted;
  }
  return 0;
}

export function getNearestReward(data: AppData): Reward | undefined {
  return [...data.rewards]
    .filter((reward) => !reward.claimed)
    .sort((a, b) => a.costXp - b.costXp)[0];
}

export function claimReward(
  reward: Reward,
  availableXp: number,
  now = new Date(),
): Reward {
  if (reward.claimed || reward.costXp > availableXp) {
    return reward;
  }

  return {
    ...reward,
    claimed: true,
    claimedAt: now.toISOString(),
  };
}

export function undoClaimReward(reward: Reward): Reward {
  return {
    ...reward,
    claimed: false,
    claimedAt: undefined,
  };
}
