export type ExerciseType =
  | "strength"
  | "hypertrophy"
  | "core"
  | "base_body"
  | "mobility"
  | "warmup"
  | "technical"
  | "cardio"
  | "cooldown"
  | "review"
  | "rounds"
  | "test"
  | "dance_external"
  | "capoeira_movement"
  | "prehab"
  | "optional"
  | "strength_technical";

export type WorkoutKind =
  | "strength"
  | "skill"
  | "skill_cardio"
  | "cardio_mobility"
  | "boxing"
  | "basketball"
  | "capoeira"
  | "dance"
  | "recovery"
  | "hybrid"
  | "rest";

export type WorkoutStatus = "completed" | "partial" | "skipped";

export type TrainingItemKind =
  | "strength"
  | "hypertrophy"
  | "core"
  | "base_body"
  | "mobility"
  | "skill"
  | "rounds"
  | "timed"
  | "checklist"
  | "test"
  | "measurement"
  | "dance_external"
  | "capoeira_movement";

export type TrainingItemPriority =
  | "base"
  | "support"
  | "optional"
  | "warmup"
  | "cooldown"
  | "technical"
  | "measurement"
  | "review"
  | "future";

export type ProgressionModel =
  | "hybrid_wave"
  | "double_progression"
  | "time_progression"
  | "accuracy_progression"
  | "error_reduction"
  | "quality_progression"
  | "checklist"
  | "measurement_progression"
  | "spaced_review"
  | "external_course";

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
  | "fluency1to5"
  | "confidence1to5"
  | "memory1to5"
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
  displayName?: string;
  type: ExerciseType;
  kind?: TrainingItemKind;
  priority?: TrainingItemPriority;
  movementPattern?: string;
  lineageId?: string;
  lineageName?: string;
  variationGroupId?: string;
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
  phaseAvailability?: "phase_1" | "phase_2" | "phase_3" | "phase_4" | "future";
  referenceSearchQuery?: string;
  internalItems?: string[];
  cues?: string[];
  referenceLinks?: ReferenceLink[];
  note?: string;
};

export type WorkoutBlock = {
  id: string;
  name: string;
  type:
    | "warmup"
    | "mobility"
    | "base_body"
    | "main"
    | "strength"
    | "hypertrophy"
    | "technical"
    | "skill"
    | "rounds"
    | "core"
    | "cooldown"
    | "test"
    | "review";
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
    | "capoeira"
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
