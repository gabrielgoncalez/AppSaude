export type RewardCategory =
  | "treino"
  | "roupa"
  | "equipamento"
  | "lazer"
  | "especial";

export type Reward = {
  id: string;
  title: string;
  description?: string;
  costXp: number;
  category: RewardCategory;
  claimed: boolean;
  createdAt: string;
  claimedAt?: string;
};

export type ClaimedReward = {
  rewardId: string;
  title: string;
  costXp: number;
  claimedAt: string;
};
