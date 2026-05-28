import type { Exercise, TrainingSession } from "../types/training";
import type { ExerciseProgressionHistory } from "./progression";

export type WaveType = "volume" | "volume_2" | "strength" | "consolidation";

export type WavePrescription = {
  wave: WaveType;
  targetSets?: number;
  repMin?: number;
  repMax?: number;
  restSec?: number;
  lineageName?: string;
  variantLabel?: string;
  message: string;
};

const WAVE_ORDER: WaveType[] = ["volume", "volume_2", "strength", "consolidation"];

export function getWorkoutWave(
  workoutId: string,
  completedSessions: TrainingSession[],
): WaveType {
  const exposures = getWorkoutExposureCount(workoutId, completedSessions);

  return WAVE_ORDER[exposures % WAVE_ORDER.length];
}

export function getWorkoutExposureCount(
  workoutId: string,
  completedSessions: TrainingSession[],
): number {
  return completedSessions.filter(
    (session) => session.workoutId === workoutId && session.status === "completed",
  ).length;
}

export function getVariantRoleLabel(role?: Exercise["variantRole"]): string | undefined {
  if (role === "machine") {
    return "Maquina";
  }
  if (role === "dumbbell") {
    return "Halteres";
  }
  if (role === "barbell") {
    return "Barra";
  }
  if (role === "free") {
    return "Livre";
  }
  if (role === "cable") {
    return "Cabo";
  }
  if (role === "bodyweight") {
    return "Peso corporal";
  }
  return undefined;
}

export function getWaveLabel(wave: WaveType): string {
  if (wave === "volume") {
    return "Onda Volume";
  }
  if (wave === "volume_2") {
    return "Onda Volume 2";
  }
  if (wave === "strength") {
    return "Onda Força";
  }
  return "Onda Consolidação";
}

export function getItemPrescription(
  item: Exercise,
  wave: WaveType,
  _history?: ExerciseProgressionHistory,
): WavePrescription {
  void _history;
  if (item.progressionModel === "time_progression" || item.durationSec) {
    return {
      wave,
      targetSets: item.targetSets,
      restSec: item.restSec,
      message: "Controle limpo. Progrida tempo, pausa ou qualidade antes de complicar.",
    };
  }

  if (item.type === "core" || item.kind === "core") {
    return {
      wave,
      targetSets: item.targetSets,
      repMin: item.repMin,
      repMax: item.repMax,
      restSec: item.restSec,
      message: "Core evolui por controle, simetria e tempo limpo.",
    };
  }

  if (isStrengthBase(item)) {
    if (wave === "strength") {
      const technical = item.type === "strength_technical";
      return {
        wave,
        targetSets: item.targetSets,
        repMin: technical ? 6 : 5,
        repMax: technical ? 10 : 8,
        restSec: item.restSec + 30,
        message: technical
          ? "Força técnica: carga firme, coluna e controle mandam."
          : "Força: menos reps, mais descanso e execução limpa.",
      };
    }

    if (wave === "consolidation") {
      return {
        wave,
        targetSets: item.targetSets,
        repMin: 8,
        repMax: 12,
        restSec: item.restSec,
        message: "Consolidação: confirme a carga sem ansiedade de trocar tudo.",
      };
    }

    return {
      wave,
      targetSets: item.targetSets,
      repMin: 8,
      repMax: 15,
      restSec: item.restSec,
      message: "Volume: construa reps fortes na zona 8-15.",
    };
  }

  if (wave === "strength") {
    return {
      wave,
      targetSets: item.targetSets,
      repMin: 8,
      repMax: 12,
      restSec: item.restSec,
      message: "Suporte: um pouco mais firme, sem virar força pesada.",
    };
  }

  return {
    wave,
    targetSets: item.targetSets,
    repMin: 10,
    repMax: item.repMax && item.repMax > 15 ? item.repMax : 15,
    restSec: item.restSec,
    message: "Suporte: reps limpas, controle e volume útil.",
  };
}

export function isStrengthBase(item: Exercise): boolean {
  if (item.strengthWaveEligible !== undefined) {
    return item.strengthWaveEligible;
  }

  return item.priority === "base" ||
    item.type === "strength" ||
    item.type === "strength_technical";
}
