import type { AppData } from "../types/appData";
import type { Exercise, Workout } from "../types/training";
import { getActiveExercises } from "./exerciseAnalytics";
import { getExerciseProgressionHistory } from "./progression";
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

export type TodayPrescription = {
  workoutId: string;
  workoutName: string;
  wave?: WaveType;
  waveLabel?: string;
  exercises: PrescribedExercise[];
  shortMessage: string;
};

export function getTodayPrescription(
  data: AppData,
  workout: Workout,
  date = new Date(),
): TodayPrescription {
  if (!workout.exercises?.length) {
    return {
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: [],
      shortMessage: getSkillMessage(workout),
    };
  }

  const wave = getWorkoutWave(workout.id, data.sessions);
  const exercises = getExercisesForWave(workout, wave).map((exercise) => {
    const prescription = getItemPrescription(
      exercise,
      wave,
      getExerciseProgressionHistory(exercise, data.sessions, undefined, date),
    );

    return {
      exercise,
      prescription: withVariantContext(prescription, exercise, wave),
    };
  });

  return {
    workoutId: workout.id,
    workoutName: workout.name,
    wave,
    waveLabel: getWaveLabel(wave),
    exercises,
    shortMessage: `${workout.name} - ${getWaveLabel(wave)}.`,
  };
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
