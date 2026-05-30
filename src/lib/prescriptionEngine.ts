import type { AppData } from "../types/appData";
import type { Exercise, Workout, WorkoutBlock } from "../types/training";
import { getActiveExercises } from "./exerciseAnalytics";
import { getExerciseProgressionHistory } from "./progression";
import { deriveStrengthExercises } from "./workoutItems";
import {
  getItemPrescription,
  getVariantRoleLabel,
  getWaveLabel,
  getWorkoutWave,
  type WavePrescription,
  type WaveType,
} from "./waveEngine";

export type PrescribedExercise = {
  exercise: Exercise;
  prescription: WavePrescription;
};

export type PrescribedItem = PrescribedExercise & {
  blockId: string;
  blockName: string;
};

export type PrescribedBlock = Omit<WorkoutBlock, "items"> & {
  items: PrescribedItem[];
};

export type TodayPrescription = {
  workoutId: string;
  workoutName: string;
  wave?: WaveType;
  waveLabel?: string;
  exercises: PrescribedExercise[];
  prescribedBlocks: PrescribedBlock[];
  shortMessage: string;
};

const LEGACY_STRENGTH_WARMUP_ARTIFACTS = [
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
  "a-aquecimento",
  "b-aquecimento",
  "c-aquecimento",
];

const STRENGTH_WARMUP_TYPES = new Set([
  "strength",
  "hypertrophy",
  "strength_technical",
]);

export function getTodayPrescription(
  data: AppData,
  workout: Workout,
  date = new Date(),
): TodayPrescription {
  if (!workout.exercises?.length && !workout.workoutBlocks?.length) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: [],
      prescribedBlocks: [],
      shortMessage: getSkillMessage(workout),
    };
  }

  const wave = getWorkoutWave(workout.id, data.sessions);
  const prescribedBlocks = getPrescribedBlocks(workout, wave, data, date);
  const exercises = getExercisesForWave(
    { ...workout, workoutBlocks: undefined, exercises: deriveStrengthExercises(workout) },
    wave,
  )
    .map((exercise) => prescribeExercise(exercise, wave, data, date));

  return {
    workoutId: workout.id,
    workoutName: workout.name,
    wave,
    waveLabel: getWaveLabel(wave),
    exercises,
    prescribedBlocks,
    shortMessage: `${workout.name} - ${getWaveLabel(wave)}.`,
  };
}

export function getPrescribedBlocks(
  workout: Workout,
  wave: WaveType,
  data: AppData,
  date = new Date(),
): PrescribedBlock[] {
  if (!workout.workoutBlocks?.length) {
    return [];
  }

  return workout.workoutBlocks
    .map((block) => {
      const blockWorkout = { ...workout, workoutBlocks: undefined, exercises: block.items };
      const selectedItems = getExercisesForWave(blockWorkout, wave)
        .filter((exercise) => exercise.active !== false)
        .filter((exercise) => exercise.phaseAvailability !== "future")
        .filter((exercise) => !isLegacyStrengthWarmupItem(workout, block, exercise))
        .map((exercise) => ({
          ...prescribeExercise(exercise, wave, data, date),
          blockId: block.id,
          blockName: block.name,
        }));

      return { ...block, items: selectedItems };
    })
    .filter((block) => block.items.length > 0);
}

function isLegacyStrengthWarmupItem(
  workout: Workout,
  block: WorkoutBlock,
  exercise: Exercise,
): boolean {
  if (workout.modality !== "strength") {
    return false;
  }

  const haystack = [
    block.id,
    block.name,
    exercise.id,
    exercise.name,
    exercise.displayName,
  ]
    .filter(Boolean)
    .join(" ");

  if (LEGACY_STRENGTH_WARMUP_ARTIFACTS.some((artifact) => haystack.includes(artifact))) {
    return true;
  }

  if (block.type !== "warmup") {
    return false;
  }

  return STRENGTH_WARMUP_TYPES.has(exercise.type) ||
    STRENGTH_WARMUP_TYPES.has(exercise.kind ?? "");
}

export function getExercisesForWave(workout: Workout, wave: WaveType): Exercise[] {
  const activeExercises = getActiveExercises(workout);
  const variantGroups = new Map<string, Exercise[]>();

  activeExercises.forEach((exercise) => {
    if (!exercise.lineageId || !exercise.variantWaves?.length) {
      return;
    }
    variantGroups.set(exercise.lineageId, [
      ...(variantGroups.get(exercise.lineageId) ?? []),
      exercise,
    ]);
  });

  const fallbackVariantIds = new Set<string>();
  variantGroups.forEach((group) => {
    if (group.length < 2) {
      return;
    }
    const hasSelectedVariant = group.some((exercise) =>
      exercise.variantWaves?.includes(wave),
    );
    if (!hasSelectedVariant && group[0]) {
      fallbackVariantIds.add(group[0].id);
    }
  });

  return activeExercises.filter((exercise) => {
    if (!exercise.variantWaves?.length) {
      return true;
    }
    return exercise.variantWaves.includes(wave) || fallbackVariantIds.has(exercise.id);
  });
}

function prescribeExercise(
  exercise: Exercise,
  wave: WaveType,
  data: AppData,
  date: Date,
): PrescribedExercise {
  const prescription = getItemPrescription(
    exercise,
    wave,
    getExerciseProgressionHistory(exercise, data.sessions, undefined, date),
  );

  return {
    exercise,
    prescription: withVariantContext(prescription, exercise, wave),
  };
}

function withVariantContext(
  prescription: WavePrescription,
  exercise: Exercise,
  wave: WaveType,
): WavePrescription {
  const variantLabel = getVariantRoleLabel(exercise.variantRole);
  const variantMessage = getVariantMessage(exercise, wave, variantLabel);

  return {
    ...prescription,
    lineageName: exercise.lineageName,
    variantLabel,
    message: variantMessage
      ? `${variantMessage} ${prescription.message}`
      : prescription.message,
  };
}

function getVariantMessage(
  exercise: Exercise,
  wave: WaveType,
  variantLabel?: string,
): string {
  if (!exercise.variantRole || !exercise.lineageId) {
    return "";
  }

  if (exercise.variantNote && (wave === "volume_2" || wave === "consolidation")) {
    return exercise.variantNote;
  }

  if (exercise.variantRole === "dumbbell" || exercise.variantRole === "free") {
    return `Hoje a variacao e ${variantLabel ?? "livre"}. Tudo bem se a carga cair: controle, amplitude, estabilidade, simetria e coordenacao primeiro.`;
  }

  if (exercise.variantRole === "machine") {
    return `Hoje a variacao e ${variantLabel ?? "maquina"}. Use a estabilidade para empurrar progresso sem perder controle.`;
  }

  return variantLabel ? `Hoje a variacao e ${variantLabel}.` : "";
}

function getSkillMessage(workout: Workout): string {
  if (workout.id === "boxe") {
    return "Boxe tecnico: rounds limpos, guarda e respiracao.";
  }
  if (workout.id === "basquete-handles") {
    return "Handles: controle, olhos para cima e menos perdas.";
  }
  if (workout.id === "danca") {
    return "Danca: aprender, ligar movimentos e repetir com fluidez.";
  }
  if (workout.id === "capoeira") {
    return "Capoeira: base, revisão espaçada e movimento novo com controle.";
  }
  return workout.name;
}
