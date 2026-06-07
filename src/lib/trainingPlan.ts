import type { AppData } from "../types/appData";
import type { Exercise, TrainingPlan, Workout } from "../types/training";
import { CAPOEIRA_MOVEMENTS } from "../data/capoeiraMovements";
import {
  INITIAL_TRAINING_PLAN,
  MASTER_TRAINING_PLAN_ID,
  MASTER_TRAINING_PLAN_VERSION,
} from "../data/initialTrainingPlan";
import { withDerivedExercises } from "./workoutItems";

export const WAVE_REP_MIN = 8;
export const WAVE_REP_MAX = 15;

const LEGACY_WARMUP_ARTIFACTS = [
  "Aquecimento Específico",
  "Leg Press leve",
  "Leg Press moderado",
  "Supino leve",
  "Supino Inclinado leve",
  "Stiff com halteres leves",
  "Stiff leve",
  "Stiff com carga moderada",
  "Remada leve",
  "Graviton leve",
  "Agachamento sem carga",
  "Agachamento com carga leve",
  "Dobradiça de quadril sem carga",
  "a-aquecimento-especifico",
  "b-aquecimento-especifico",
  "c-aquecimento-especifico",
];

export function normalizeAppDataForWave(data: AppData): {
  data: AppData;
  changed: boolean;
} {
  const basePlan = shouldUpgradeToMasterPlan(data.trainingPlan)
    ? cloneTrainingPlan(INITIAL_TRAINING_PLAN)
    : data.trainingPlan;
  const nextPlan = withDerivedExercises(normalizeTrainingPlanForWave(basePlan));
  const withDefaults = ensureAppDataDefaults({ ...data, trainingPlan: nextPlan });
  if (basePlan === data.trainingPlan && nextPlan === data.trainingPlan && withDefaults === data) {
    return { data, changed: false };
  }

  return {
    data: withDefaults,
    changed: true,
  };
}

export function normalizeTrainingPlanForWave(plan: TrainingPlan): TrainingPlan {
  let changed = false;
  const planWithDefaultVariants = ensureDefaultLineageVariants(plan);
  if (planWithDefaultVariants !== plan) {
    changed = true;
  }

  const workouts = planWithDefaultVariants.workouts.map((workout) => {
    if (!workout.exercises?.length) {
      return workout;
    }

    const exercises = workout.exercises.map((exercise) => {
      if (!shouldUseWaveRange(workout, exercise)) {
        const enriched = enrichExerciseMetadata(workout, exercise);
        if (enriched !== exercise) {
          changed = true;
        }
        return enriched;
      }

      const enriched = enrichExerciseMetadata(workout, {
        ...exercise,
        repMin: WAVE_REP_MIN,
        repMax: WAVE_REP_MAX,
      });
      if (
        exercise.repMin === WAVE_REP_MIN &&
        exercise.repMax === WAVE_REP_MAX &&
        enriched === exercise
      ) {
        return exercise;
      }

      changed = true;
      return enriched;
    });

    return exercises === workout.exercises ? workout : { ...workout, exercises };
  });

  const normalized = changed ? { ...planWithDefaultVariants, workouts } : plan;
  return withDerivedExercises(normalized);
}

function ensureAppDataDefaults(data: AppData): AppData {
  const missing =
    data.trainingPhases === undefined ||
    data.trainingPhases.length === 0 ||
    data.bodyGoals === undefined ||
    data.penaltyEvents === undefined ||
    data.trainingPlanHistory === undefined ||
    data.monthlyReviews === undefined ||
    data.capoeiraMovements === undefined ||
    data.capoeiraMovements.length === 0;

  if (!missing) {
    return data;
  }

  return {
    ...data,
    trainingPhases:
      data.trainingPhases?.length
        ? data.trainingPhases
        :
      [
        {
          id: "fase-1-base-hibrida",
          name: "Fase 1 — Base Híbrida",
          startDate: data.profile.startedAt,
          plannedWeeks: 8,
          status: "active",
          mainGoal: "recomposition",
          notes:
            "Consistência, recomposição corporal, técnica, força inicial e mobilidade.",
        },
      ],
    bodyGoals: data.bodyGoals ?? [],
    penaltyEvents: data.penaltyEvents ?? [],
    trainingPlanHistory: data.trainingPlanHistory ?? [],
    monthlyReviews: data.monthlyReviews ?? [],
    capoeiraMovements: data.capoeiraMovements?.length
      ? data.capoeiraMovements
      : CAPOEIRA_MOVEMENTS,
  };
}

function shouldUpgradeToMasterPlan(plan: TrainingPlan): boolean {
  if (
    plan.id === MASTER_TRAINING_PLAN_ID &&
    plan.version === MASTER_TRAINING_PLAN_VERSION &&
    isStructuredMasterPlan(plan)
  ) {
    return false;
  }

  return true;
}

function isStructuredMasterPlan(plan: TrainingPlan): boolean {
  if (hasLegacyWarmupArtifacts(plan)) {
    return false;
  }
  if (hasDeadBugInTreinoBStrength(plan)) {
    return false;
  }

  const workoutsById = new Map(plan.workouts.map((workout) => [workout.id, workout]));
  const requiredWorkoutIds = [
    "treino-a",
    "boxe",
    "treino-b",
    "basquete-handles",
    "treino-c",
    "danca",
  ];

  return requiredWorkoutIds.every((id) => {
    const workout = workoutsById.get(id);
    return Boolean(workout?.workoutBlocks?.length);
  });
}

function hasLegacyWarmupArtifacts(plan: TrainingPlan): boolean {
  const serialized = JSON.stringify(plan);
  return LEGACY_WARMUP_ARTIFACTS.some((artifact) => serialized.includes(artifact));
}

function hasDeadBugInTreinoBStrength(plan: TrainingPlan): boolean {
  const treinoB = plan.workouts.find((workout) => workout.id === "treino-b");
  const strengthBlock = treinoB?.workoutBlocks?.find((block) => block.id === "b-musculacao");
  return Boolean(strengthBlock?.items.some((item) => item.id === "dead-bug-b"));
}

function cloneTrainingPlan(plan: TrainingPlan): TrainingPlan {
  return structuredClone(plan);
}

function enrichExerciseMetadata(workout: Workout, exercise: Exercise): Exercise {
  const priority = exercise.priority ?? inferPriority(exercise);
  const progressionModel =
    exercise.progressionModel ?? inferProgressionModel(workout, exercise, priority);
  const strengthWaveEligible =
    exercise.strengthWaveEligible ?? (priority === "base" && progressionModel === "hybrid_wave");
  const metricSchema = exercise.metricSchema ?? inferMetricSchema(exercise);
  const kind = exercise.kind ?? inferKind(exercise);
  const isKeyExercise = exercise.isKeyExercise ?? priority === "base";
  const lineageDefaults = getDefaultLineageVariant(exercise);
  const lineageId = exercise.lineageId ?? lineageDefaults?.lineageId;
  const lineageName = exercise.lineageName ?? lineageDefaults?.lineageName;
  const movementPattern = exercise.movementPattern ?? lineageDefaults?.movementPattern;
  const variantRole = exercise.variantRole ?? lineageDefaults?.variantRole;
  const variantWaves = exercise.variantWaves ?? lineageDefaults?.variantWaves;
  const variantNote = exercise.variantNote ?? lineageDefaults?.variantNote;
  const note = exercise.note ?? lineageDefaults?.note;
  const equipment = exercise.equipment ?? lineageDefaults?.equipment;

  if (
    exercise.priority === priority &&
    exercise.progressionModel === progressionModel &&
    exercise.strengthWaveEligible === strengthWaveEligible &&
    exercise.metricSchema === metricSchema &&
    exercise.kind === kind &&
    exercise.isKeyExercise === isKeyExercise &&
    exercise.lineageId === lineageId &&
    exercise.lineageName === lineageName &&
    exercise.movementPattern === movementPattern &&
    exercise.variantRole === variantRole &&
    exercise.variantWaves === variantWaves &&
    exercise.variantNote === variantNote &&
    exercise.note === note &&
    exercise.equipment === equipment
  ) {
    return exercise;
  }

  return {
    ...exercise,
    kind,
    priority,
    progressionModel,
    metricSchema,
    strengthWaveEligible,
    isKeyExercise,
    lineageId,
    lineageName,
    movementPattern,
    variantRole,
    variantWaves,
    variantNote,
    note,
    equipment,
  };
}

function ensureDefaultLineageVariants(plan: TrainingPlan): TrainingPlan {
  let changed = false;
  const workouts = plan.workouts.map((workout) => {
    if (workout.id !== "treino-a" || !workout.exercises?.length) {
      return workout;
    }

    const machineIndex = workout.exercises.findIndex(
      (exercise) => exercise.id === "supino-reto-maquina",
    );
    const hasDumbbellVariant = workout.exercises.some(
      (exercise) => exercise.id === "supino-reto-halteres",
    );

    if (machineIndex < 0 || hasDumbbellVariant) {
      return workout;
    }

    changed = true;
    const exercises = [...workout.exercises];
    exercises.splice(machineIndex + 1, 0, createSupinoDumbbellVariant(exercises[machineIndex]));
    return { ...workout, exercises };
  });

  return changed ? { ...plan, workouts } : plan;
}

function createSupinoDumbbellVariant(machine: Exercise): Exercise {
  return {
    id: "supino-reto-halteres",
    name: "Supino Reto Halteres",
    type: "strength_technical",
    priority: "base",
    movementPattern: "empurrar horizontal",
    lineageId: "empurrar-horizontal-principal",
    lineageName: "Empurrar Horizontal Principal",
    variantRole: "dumbbell",
    variantWaves: ["volume_2", "consolidation"],
    targetSets: machine.targetSets,
    repMin: 8,
    repMax: 15,
    restSec: machine.restSec,
    incrementKg: 1,
    equipment: "Halteres",
    note: "Variacao tecnica. Tudo bem a carga cair: controle, amplitude, estabilidade, simetria e coordenacao.",
    variantNote:
      "Hoje o supino e com halteres. A carga pode cair bastante; o objetivo inicial e controlar amplitude, estabilidade, simetria e coordenacao.",
  };
}

function getDefaultLineageVariant(exercise: Exercise): Partial<Exercise> | undefined {
  if (exercise.id === "supino-reto-maquina") {
    return {
      priority: "base",
      movementPattern: "empurrar horizontal",
      lineageId: "empurrar-horizontal-principal",
      lineageName: "Empurrar Horizontal Principal",
      variantRole: "machine",
      variantWaves: ["volume", "strength"],
      equipment: "Maquina",
    };
  }

  if (exercise.id === "supino-reto-halteres") {
    return {
      priority: "base",
      movementPattern: "empurrar horizontal",
      lineageId: "empurrar-horizontal-principal",
      lineageName: "Empurrar Horizontal Principal",
      variantRole: "dumbbell",
      variantWaves: ["volume_2", "consolidation"],
      equipment: "Halteres",
      note: "Variacao tecnica. Tudo bem a carga cair: controle, amplitude, estabilidade, simetria e coordenacao.",
      variantNote:
        "Hoje o supino e com halteres. A carga pode cair bastante; o objetivo inicial e controlar amplitude, estabilidade, simetria e coordenacao.",
    };
  }

  return undefined;
}

function inferPriority(exercise: Exercise): Exercise["priority"] {
  if (exercise.type === "core") {
    return "technical";
  }
  if (exercise.type === "strength" || exercise.type === "strength_technical") {
    return "base";
  }
  if (exercise.type === "optional") {
    return "optional";
  }
  return "support";
}

function inferProgressionModel(
  workout: Workout,
  exercise: Exercise,
  priority: Exercise["priority"],
): NonNullable<Exercise["progressionModel"]> {
  if (exercise.type === "core") {
    return exercise.durationSec ? "time_progression" : "quality_progression";
  }
  if (workout.type === "strength" && priority === "base") {
    return "hybrid_wave";
  }
  if (workout.type === "strength") {
    return "double_progression";
  }
  return "checklist";
}

function inferMetricSchema(exercise: Exercise): NonNullable<Exercise["metricSchema"]> {
  if (exercise.durationSec) {
    return ["durationSec", "quality1to5", "completed"];
  }
  if (exercise.type === "core") {
    return ["reps", "durationSec", "quality1to5", "completed"];
  }
  return ["weightKg", "reps", "sets", "completed"];
}

function inferKind(exercise: Exercise): NonNullable<Exercise["kind"]> {
  if (exercise.type === "core") {
    return "core";
  }
  if (exercise.type === "strength" || exercise.type === "strength_technical") {
    return "strength";
  }
  if (exercise.type === "cardio") {
    return "timed";
  }
  if (exercise.type === "technical") {
    return "skill";
  }
  return "hypertrophy";
}

function shouldUseWaveRange(workout: Workout, exercise: Exercise): boolean {
  return (
    workout.id.startsWith("treino-") &&
    !exercise.progressionModel &&
    exercise.repMin !== undefined &&
    exercise.repMax !== undefined &&
    exercise.durationSec === undefined &&
    exercise.holdSec === undefined
  );
}
