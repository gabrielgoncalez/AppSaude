import type { Reward, ClaimedReward } from "./rewards";
import type { TrainingPlan, TrainingSession } from "./training";

export type Profile = {
  heightCm: number;
  startWeightKg: number;
  currentWeightKg: number;
  goal: "fat_loss_muscle_gain";
  startedAt: string;
};

export type Settings = {
  onboardingDone: boolean;
  preferredWeightStepKg: number;
  theme: "dark";
};

export type BodyCheckin = {
  id: string;
  date: string;
  type?: "quick_15d" | "full_30d";
  weightKg: number;
  waistNavelCm?: number;
  abdomenWidestCm?: number;
  hipCm?: number;
  neckCm?: number;
  chestCm?: number;
  rightArmCm?: number;
  leftArmCm?: number;
  rightThighCm?: number;
  leftThighCm?: number;
  rightCalfCm?: number;
  leftCalfCm?: number;
  waistCm?: number;
  energy?: 1 | 2 | 3 | 4 | 5;
  sleep?: 1 | 2 | 3 | 4 | 5;
  hunger?: 1 | 2 | 3 | 4 | 5;
  adherence?: 1 | 2 | 3 | 4 | 5;
  soreness?: 1 | 2 | 3 | 4 | 5;
  jointPain?: boolean;
  dizziness?: boolean;
  notes?: string;
  createdAt?: string;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
};

export type ScheduleState = {
  activeWorkoutId: string;
  activeDate: string;
  lastResolvedDate: string;
  cycleOrder: string[];
  hasDebtAlert: boolean;
  updatedAt: string;
  todayWorkoutId: string;
  todayStatus: DayEventStatus;
  todayDate: string;
  revision: number;
};

export type DayEventStatus =
  | "selected"
  | "completed"
  | "recovery_rest"
  | "missed"
  | "planned_rest";

export type PenaltyKind = "recovery_rest" | "missed";

export type DayEvent = {
  id: string;
  date: string;
  workoutId: string;
  workoutName: string;
  status: DayEventStatus;
  scheduleRevision?: number;
  penaltyXp: number;
  penaltyKind?: PenaltyKind;
  reason?: string;
  manualSelection: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TrainingPhase = {
  id: string;
  name: string;
  startDate: string;
  plannedWeeks: number;
  status: "active" | "completed";
  mainGoal: "fat_loss" | "recomposition" | "strength" | "skill" | "mobility";
  notes?: string;
};

export type BodyGoal = {
  id: string;
  metric:
    | "weightKg"
    | "waistNavelCm"
    | "abdomenWidestCm"
    | "hipCm"
    | "chestCm"
    | "rightArmCm"
    | "leftArmCm"
    | "rightThighCm"
    | "leftThighCm"
    | "rightCalfCm"
    | "leftCalfCm";
  direction: "decrease" | "increase" | "maintain";
  startValue: number;
  targetValue: number;
  startDate: string;
  targetDate?: string;
  priority: "primary" | "secondary";
};

export type PenaltyEvent = {
  id: string;
  date: string;
  type:
    | "missed_workout"
    | "recovery_rest"
    | "late_checkin"
    | "late_measurement"
    | "manual_penalty";
  coinsPenalty: number;
  commitmentScorePenalty: number;
  reason: string;
};

export type TrainingPlanVersion = {
  id: string;
  version: number;
  savedAt: string;
  reason: string;
  trainingPlan: TrainingPlan;
};

export type BodyMetricDiff = {
  weightKg?: number;
  waistNavelCm?: number;
  abdomenWidestCm?: number;
  hipCm?: number;
  chestCm?: number;
  rightArmCm?: number;
  leftArmCm?: number;
  rightThighCm?: number;
  leftThighCm?: number;
  rightCalfCm?: number;
  leftCalfCm?: number;
};

export type MonthlyReview = {
  id: string;
  month: string;
  workoutsCompleted: number;
  strengthSessions: number;
  boxingSessions: number;
  basketballSessions: number;
  danceSessions: number;
  missedWorkouts: number;
  recoveryRests: number;
  commitmentScore: number;
  bodyChanges: BodyMetricDiff;
  keyExerciseProgress: string[];
  technicalProgress: string[];
  recommendation: "keep_plan" | "small_adjustment" | "review_phase" | "new_phase";
  message: string;
};

export type CapoeiraMovementStatus =
  | "not_started"
  | "learning"
  | "validating"
  | "mastered"
  | "review";

export type CapoeiraMovement = {
  lessonNumber: number;
  displayName: string;
  category: string;
  status: CapoeiraMovementStatus;
  rightSideDone?: boolean;
  leftSideDone?: boolean;
  quality1to5?: number;
  fluency1to5?: number;
  reviewsCompleted: number;
  startedAt?: string;
  masteredAt?: string;
  canUseBag: boolean;
  referenceSearchQuery: string;
  notes?: string;
};

export type AppData = {
  version: number;
  profile: Profile;
  settings: Settings;
  trainingPlan: TrainingPlan;
  schedule: ScheduleState;
  dayEvents: DayEvent[];
  sessions: TrainingSession[];
  bodyCheckins: BodyCheckin[];
  rewards: Reward[];
  claimedRewards: ClaimedReward[];
  achievements: Achievement[];
  trainingPhases?: TrainingPhase[];
  bodyGoals?: BodyGoal[];
  penaltyEvents?: PenaltyEvent[];
  trainingPlanHistory?: TrainingPlanVersion[];
  monthlyReviews?: MonthlyReview[];
  capoeiraMovements?: CapoeiraMovement[];
};

export type BackupSummary = {
  version: number;
  sessions: number;
  checkins: number;
  rewards: number;
  exportedAt?: string;
};
