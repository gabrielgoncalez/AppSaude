import { DEFAULT_REWARDS } from "../data/defaultRewards";
import type { AppData } from "../types/appData";
import type { Reward } from "../types/rewards";
import type { TrainingSession } from "../types/training";
import {
  calculateSessionCoins,
  calculateSessionXp,
  ECONOMY_VERSION,
  getRewardCoins,
} from "./gamification";
import { getPrBonus, getPrCoinBonus } from "./progressionEngine";

const STANDARD_REWARD_COSTS = new Map(
  DEFAULT_REWARDS.map((reward) => [reward.id, reward.costXp]),
);

export function normalizeAppDataForEconomy(data: AppData): {
  data: AppData;
  changed: boolean;
} {
  if ((data.settings.economyVersion ?? 1) >= ECONOMY_VERSION) {
    return { data, changed: false };
  }

  const sessions = recalculateSessions(data.sessions);
  const rewardsWithNewCosts = applyStandardRewardCosts(data.rewards);
  const rewardCoins = getRewardCoins({
    ...data,
    sessions,
    rewards: rewardsWithNewCosts,
  });
  const rewards = normalizeClaimedRewards(rewardsWithNewCosts, rewardCoins);

  return {
    data: {
      ...data,
      settings: {
        ...data.settings,
        economyVersion: ECONOMY_VERSION,
      },
      sessions,
      rewards,
      claimedRewards: rewards
        .filter((reward) => reward.claimed)
        .map((reward) => ({
          rewardId: reward.id,
          title: reward.title,
          costXp: reward.costXp,
          claimedAt: reward.claimedAt ?? new Date().toISOString(),
        })),
    },
    changed: true,
  };
}

function recalculateSessions(sessions: TrainingSession[]): TrainingSession[] {
  const nextSessions = [...sessions];
  const previousSessions: TrainingSession[] = [];

  sessions
    .map((session, index) => ({ index, session }))
    .sort(
      (a, b) =>
        new Date(a.session.date).getTime() - new Date(b.session.date).getTime(),
    )
    .forEach(({ index, session }) => {
      const next = recalculateSession(session, previousSessions);
      nextSessions[index] = next;
      previousSessions.push(next);
    });

  return nextSessions;
}

function recalculateSession(
  session: TrainingSession,
  previousSessions: TrainingSession[],
): TrainingSession {
  const withoutRewards = {
    ...session,
    earnedXp: 0,
    earnedCoins: 0,
    prBonusXp: 0,
    prBonusCoins: 0,
  };
  const prBonusXp =
    session.status === "completed" ? getPrBonus(withoutRewards, previousSessions) : 0;
  const prBonusCoins =
    session.status === "completed"
      ? getPrCoinBonus(withoutRewards, previousSessions)
      : 0;

  return {
    ...withoutRewards,
    earnedXp: calculateSessionXp(withoutRewards) + prBonusXp,
    earnedCoins: calculateSessionCoins(withoutRewards) + prBonusCoins,
    prBonusXp,
    prBonusCoins,
  };
}

function applyStandardRewardCosts(rewards: Reward[]): Reward[] {
  return rewards.map((reward) => {
    const costXp = STANDARD_REWARD_COSTS.get(reward.id);
    return costXp === undefined ? reward : { ...reward, costXp };
  });
}

function normalizeClaimedRewards(rewards: Reward[], rewardCoins: number): Reward[] {
  let remainingCoins = rewardCoins;

  return rewards.map((reward) => {
    if (!reward.claimed) {
      return reward;
    }
    if (remainingCoins >= reward.costXp) {
      remainingCoins -= reward.costXp;
      return reward;
    }

    const next = { ...reward, claimed: false };
    delete next.claimedAt;
    return next;
  });
}
