import {
  differenceInCalendarDays,
  isSameMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { Exercise, ExerciseLog, TrainingSession } from "../types/training";
import { getLumbarSafetyAlert, hasExerciseAlert } from "./safety";

const WAVE_REP_MIN = 8;
const WAVE_REP_MAX = 15;
const STALL_WEEKS = 3;

export type ProgressionSuggestion = {
  level: "success" | "info" | "warning";
  title: string;
  message: string;
};

export type ExerciseProgressionHistory = {
  exerciseId: string;
  lastSessionDate?: string;
  lastSessionMaxWeightKg?: number;
  maxWeightKg?: number;
  maxWeightFirstDate?: string;
  weeksAtMaxWeight: number;
  monthlyBaselineKg?: number;
  monthlyTargetKg?: number;
  monthlyStretchTargetKg?: number;
};

export function getExerciseProgressionHistory(
  exercise: Exercise,
  sessions: TrainingSession[],
  currentSessionId?: string,
  date = new Date(),
): ExerciseProgressionHistory {
  const entries = sessions
    .filter((session) => session.id !== currentSessionId)
    .flatMap((session) =>
      session.exercises
        .filter((log) => log.exerciseId === exercise.id)
        .map((log) => ({
          date: session.date,
          maxWeightKg: getMaxSetWeight(log),
        })),
    )
    .filter((entry) => entry.maxWeightKg > 0)
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  if (!entries.length) {
    return {
      exerciseId: exercise.id,
      weeksAtMaxWeight: 0,
    };
  }

  const lastEntry = entries.at(-1);
  const maxWeightKg = Math.max(...entries.map((entry) => entry.maxWeightKg));
  const firstMaxEntry = entries.find((entry) => entry.maxWeightKg === maxWeightKg);
  const monthStart = startOfMonth(date);
  const monthEntries = entries.filter((entry) =>
    isSameMonth(parseISO(entry.date), monthStart),
  );
  const monthlyBaselineKg =
    monthEntries[0]?.maxWeightKg ?? lastEntry?.maxWeightKg ?? maxWeightKg;
  const increment = getPositiveIncrement(exercise);

  return {
    exerciseId: exercise.id,
    lastSessionDate: lastEntry?.date,
    lastSessionMaxWeightKg: lastEntry?.maxWeightKg,
    maxWeightKg,
    maxWeightFirstDate: firstMaxEntry?.date,
    weeksAtMaxWeight: firstMaxEntry
      ? Math.floor(differenceInCalendarDays(date, parseISO(firstMaxEntry.date)) / 7)
      : 0,
    monthlyBaselineKg,
    monthlyTargetKg: roundUpToIncrement(monthlyBaselineKg * 1.1, increment),
    monthlyStretchTargetKg: roundUpToIncrement(monthlyBaselineKg * 1.15, increment),
  };
}

export function getProgressionSuggestion(
  exercise: Exercise,
  log?: ExerciseLog,
  history?: ExerciseProgressionHistory,
): ProgressionSuggestion {
  if (!log || log.sets.filter((set) => set.completed).length === 0) {
    return {
      level: "info",
      title: "Sugestão para hoje",
      message: history?.maxWeightKg
        ? `Último máximo: ${formatKg(history.maxWeightKg)}. Entre na zona ${WAVE_REP_MIN}-${WAVE_REP_MAX} com técnica limpa.`
        : "Use carga controlada e registre sem pressa.",
    };
  }

  const lumbarAlert = getLumbarSafetyAlert(exercise, log);
  if (lumbarAlert) {
    return {
      level: "warning",
      title: lumbarAlert.title,
      message: lumbarAlert.message,
    };
  }

  if (hasExerciseAlert(log)) {
    return {
      level: "warning",
      title: "Sem progressão hoje",
      message: "Não subir carga neste exercício. Revisar técnica, amplitude e descanso.",
    };
  }

  const completedSets = log.sets.filter((set) => set.completed);
  const highRpe = completedSets.some((set) => (set.rpe ?? 0) >= 9);
  if (highRpe) {
    return {
      level: "warning",
      title: "Hoje foi pesado",
      message: "Mantenha ou reduza a carga na próxima sessão.",
    };
  }

  const currentMaxWeightKg = Math.max(
    ...completedSets.map((set) => set.weightKg ?? 0),
    0,
  );
  const currentMinReps = Math.min(...completedSets.map((set) => set.reps ?? 0));
  const currentMaxReps = Math.max(...completedSets.map((set) => set.reps ?? 0));
  const allAtTop =
    completedSets.length >= exercise.targetSets &&
    completedSets.every((set) => (set.reps ?? 0) >= WAVE_REP_MAX && (set.rpe ?? 8) <= 8);

  if (allAtTop) {
    if (isReverseProgression(exercise)) {
      return {
        level: "success",
        title: "Reduzir assistência",
        message: "Você dominou 15 reps. No Graviton, progresso é reduzir ajuda.",
      };
    }

    const increment = getPositiveIncrement(exercise);
    return {
      level: "success",
      title: "Hora de subir carga",
      message: `Você dominou ${WAVE_REP_MAX} reps. Sugestão: subir +${formatKg(increment)} na próxima sessão e recomeçar perto de ${WAVE_REP_MIN} reps.`,
    };
  }

  if (
    history?.maxWeightKg &&
    currentMaxWeightKg > history.maxWeightKg &&
    currentMaxReps >= WAVE_REP_MIN
  ) {
    return {
      level: "success",
      title: "Nova carga",
      message: `Mantenha a técnica. A meta agora é chegar em ${Math.min(WAVE_REP_MAX, currentMinReps + 1)} reps com ${formatKg(currentMaxWeightKg)}.`,
    };
  }

  if (
    history?.maxWeightKg &&
    history.weeksAtMaxWeight >= STALL_WEEKS &&
    currentMaxWeightKg <= history.maxWeightKg
  ) {
    const increment = getPositiveIncrement(exercise);
    return {
      level: "warning",
      title: "Tentativa controlada",
      message: `Você está há ${history.weeksAtMaxWeight} semanas em ${formatKg(history.maxWeightKg)}. Se a técnica estiver firme, tente +${formatKg(increment)} na última série hoje.`,
    };
  }

  return {
    level: "info",
    title: "Onda em andamento",
    message: `Fique nessa carga e transforme ${currentMaxReps} reps em ${Math.min(WAVE_REP_MAX, currentMaxReps + 1)} antes de subir.`,
  };
}

export function getWaveRepRangeLabel(exercise: Exercise): string {
  if (exercise.durationSec) {
    return `${exercise.durationSec}s`;
  }
  if (exercise.holdSec || exercise.repMin === exercise.repMax) {
    return exercise.repMin && exercise.repMax
      ? `${exercise.repMin}-${exercise.repMax} reps`
      : "controle";
  }
  return `${WAVE_REP_MIN}-${WAVE_REP_MAX} reps`;
}

export function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} kg`;
}

function getMaxSetWeight(log: ExerciseLog): number {
  return Math.max(...log.sets.map((set) => set.weightKg ?? 0), 0);
}

function getPositiveIncrement(exercise: Exercise): number {
  return Math.abs(exercise.incrementKg ?? 2.5) || 2.5;
}

function roundUpToIncrement(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

function isReverseProgression(exercise: Exercise): boolean {
  return exercise.id === "graviton" || (exercise.incrementKg ?? 0) < 0;
}
