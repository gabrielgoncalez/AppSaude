import { LEVELS, type Level } from "../data/levels";
import type { AppData } from "../types/appData";
import type { Reward } from "../types/rewards";
import type { TrainingSession } from "../types/training";
import { weekKey } from "./dates";
import { getTotalCoinsPenalty } from "./penaltyEngine";
import { hasAnyAlert, isExerciseFinished } from "./safety";

export const XP_RULES = {
  setLogged: 3,
  exerciseCompleted: 10,
  strengthWorkoutCompleted: 25,
  boxingCompleted: 20,
  basketballCompleted: 15,
  danceCompleted: 20,
  weekWithThreeStrength: 50,
  checkin: 30,
  cleanWorkout: 15,
  pr: 20,
} as const;

export function getTotalXp(data: AppData): number {
  return getJourneyXp(data);
}

export function getJourneyXp(data: AppData): number {
  return Math.max(0, getGrossXp(data));
}

export function getRewardCoins(data: AppData): number {
  return Math.max(0, getGrossXp(data) - getTotalCoinsPenalty(data));
}

export function getGrossXp(data: AppData): number {
  const sessionXp = data.sessions.reduce(
    (sum, session) => sum + session.earnedXp,
    0,
  );
  const checkinXp = data.bodyCheckins.length * XP_RULES.checkin;
  return sessionXp + checkinXp + getWeeklyStrengthBonus(data.sessions);
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
      sum + exercise.sets.filter((set) => set.completed).length * XP_RULES.setLogged,
    0,
  );
  const exerciseXp =
    xpEligibleExercises.filter(isExerciseFinished).length * XP_RULES.exerciseCompleted;
  const cleanXp =
    session.status === "completed" && !hasAnyAlert(session)
      ? XP_RULES.cleanWorkout
      : 0;

  return setXp + exerciseXp + cleanXp + workoutBonus(session);
}

export function getWeeklyStrengthBonus(sessions: TrainingSession[]): number {
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

  return [...weeks.values()].filter((workouts) => workouts.size >= 3).length *
    XP_RULES.weekWithThreeStrength;
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
