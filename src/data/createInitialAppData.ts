import type { AppData } from "../types/appData";
import { createInitialSchedule } from "../lib/schedule";
import { normalizeTrainingPlanForWave } from "../lib/trainingPlan";
import { DEFAULT_ACHIEVEMENTS } from "./achievements";
import { DEFAULT_REWARDS } from "./defaultRewards";
import { INITIAL_TRAINING_PLAN } from "./initialTrainingPlan";

export function createInitialAppData(now = new Date()): AppData {
  const iso = now.toISOString();
  const trainingPlan = normalizeTrainingPlanForWave(INITIAL_TRAINING_PLAN);

  return {
    version: 1,
    profile: {
      heightCm: 188,
      startWeightKg: 115,
      currentWeightKg: 115,
      goal: "fat_loss_muscle_gain",
      startedAt: iso,
    },
    settings: {
      onboardingDone: false,
      preferredWeightStepKg: 2.5,
      theme: "dark",
    },
    trainingPlan,
    schedule: createInitialSchedule(trainingPlan, now),
    dayEvents: [],
    sessions: [],
    bodyCheckins: [],
    rewards: DEFAULT_REWARDS,
    claimedRewards: [],
    achievements: DEFAULT_ACHIEVEMENTS,
    trainingPhases: [
      {
        id: "fase-1-base-hibrida",
        name: "Fase 1 — Base Híbrida",
        startDate: iso,
        plannedWeeks: 8,
        status: "active",
        mainGoal: "recomposition",
        notes:
          "Consistência, recomposição corporal, técnica, força inicial e mobilidade.",
      },
    ],
    bodyGoals: [],
    penaltyEvents: [],
    trainingPlanHistory: [],
    monthlyReviews: [],
  };
}
