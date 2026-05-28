export type ExerciseType =
  | "strength"
  | "hypertrophy"
  | "core"
  | "technical"
  | "cardio"
  | "prehab"
  | "optional"
  | "strength_technical";

export type WorkoutKind =
  | "strength"
  | "skill"
  | "skill_cardio"
  | "cardio_mobility"
  | "rest";

export type WorkoutStatus = "completed" | "partial" | "skipped";

export type TrainingItemKind =
  | "strength"
  | "hypertrophy"
  | "core"
  | "mobility"
  | "skill"
  | "rounds"
  | "timed"
  | "checklist"
  | "test"
  | "measurement";

export type TrainingItemPriority =
  | "base"
  | "support"
  | "optional"
  | "warmup"
  | "cooldown"
  | "technical"
  | "measurement";

export type ProgressionModel =
  | "hybrid_wave"
  | "double_progression"
  | "time_progression"
  | "accuracy_progression"
  | "error_reduction"
  | "quality_progression"
  | "checklist"
  | "measurement_progression";

export type MetricType =
  | "weightKg"
  | "reps"
  | "sets"
  | "durationSec"
  | "rounds"
  | "distanceCm"
  | "errors"
  | "hits"
  | "attempts"
  | "quality1to5"
  | "cleanStreakSec"
  | "side"
  | "completed"
  | "bodyMeasurementCm";

export type ReferenceLink = {
  label: string;
  url: string;
};

export type WaveSlot = "volume" | "volume_2" | "strength" | "consolidation";

export type ExerciseVariantRole =
  | "machine"
  | "dumbbell"
  | "barbell"
  | "free"
  | "cable"
  | "bodyweight";

export type Exercise = {
  id: string;
  name: string;
  type: ExerciseType;
  kind?: TrainingItemKind;
  priority?: TrainingItemPriority;
  movementPattern?: string;
  lineageId?: string;
  lineageName?: string;
  variantRole?: ExerciseVariantRole;
  variantWaves?: WaveSlot[];
  variantNote?: string;
  targetSets: number;
  repMin?: number;
  repMax?: number;
  durationSec?: number;
  holdSec?: number;
  restSec: number;
  incrementKg?: number;
  equipment?: string;
  active?: boolean;
  muscleGroups?: string[];
  isKeyExercise?: boolean;
  strengthWaveEligible?: boolean;
  progressionModel?: ProgressionModel;
  metricSchema?: MetricType[];
  cues?: string[];
  referenceLinks?: ReferenceLink[];
  note?: string;
};

export type WorkoutBlock = {
  id: string;
  name: string;
  type:
    | "warmup"
    | "main"
    | "strength"
    | "hypertrophy"
    | "skill"
    | "core"
    | "mobility"
    | "cooldown"
    | "test";
  items: Exercise[];
};

export type Workout = {
  id: string;
  name: string;
  dayOfWeek: number;
  type: WorkoutKind;
  modality?:
    | "strength"
    | "boxing"
    | "basketball"
    | "dance"
    | "mobility"
    | "recovery"
    | "hybrid";
  cycleOrder?: number;
  active?: boolean;
  exercises?: Exercise[];
  workoutBlocks?: WorkoutBlock[];
  blocks?: string[];
  note?: string;
};

export type WorkoutTemplate = Workout;

export type TrainingPlan = {
  workouts: Workout[];
};

export type SetLog = {
  setIndex: number;
  weightKg?: number;
  reps?: number;
  durationSec?: number;
  rpe?: number;
  pain?: boolean;
  dizziness?: boolean;
  errors?: number;
  hits?: number;
  attempts?: number;
  quality1to5?: 1 | 2 | 3 | 4 | 5;
  cleanStreakSec?: number;
  rounds?: number;
  side?: "left" | "right" | "both";
  technicalRatings?: Record<string, 1 | 2 | 3 | 4 | 5>;
  notes?: string;
  completed: boolean;
};

export type ExerciseLog = {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType | string;
  sets: SetLog[];
  completed?: boolean;
  pain: boolean;
  dizziness: boolean;
  notes?: string;
};

export type TrainingSession = {
  id: string;
  date: string;
  workoutId: string;
  workoutName: string;
  status: WorkoutStatus;
  durationMin?: number;
  readiness?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  planId?: string;
  planVersion?: number;
  exercises: ExerciseLog[];
  earnedXp: number;
  earnedCoins?: number;
  prBonusXp?: number;
  prBonusCoins?: number;
};

export type SkillWorkoutMetrics = {
  durationMin?: number;
  rounds?: number;
  errors?: number;
  hits?: number;
  attempts?: number;
  quality1to5?: 1 | 2 | 3 | 4 | 5;
  cleanStreakSec?: number;
  technicalRatings?: Record<string, 1 | 2 | 3 | 4 | 5>;
  notes?: string;
};
