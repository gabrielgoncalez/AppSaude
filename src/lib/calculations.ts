import { format, parseISO, subDays } from "date-fns";
import type { AppData, BodyCheckin, DayEvent } from "../types/appData";
import type { ExerciseLog, TrainingSession } from "../types/training";
import { weekKey } from "./dates";
import { getCompletedWorkSets, getMaxWorkWeight, getTotalWorkReps } from "./sets";

export type ChartPoint = {
  name: string;
  value: number;
};

export function calculateExerciseVolume(exercise: ExerciseLog): number {
  return getCompletedWorkSets(exercise).reduce(
    (sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0),
    0,
  );
}

export function calculateSessionVolume(session: TrainingSession): number {
  return session.exercises.reduce(
    (sum, exercise) => sum + calculateExerciseVolume(exercise),
    0,
  );
}

export function getWeeklyVolume(sessions: TrainingSession[]): ChartPoint[] {
  const totals = new Map<string, number>();
  sessions.forEach((session) => {
    const key = weekKey(session.date);
    totals.set(key, (totals.get(key) ?? 0) + calculateSessionVolume(session));
  });

  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

export function getWeeklyXp(sessions: TrainingSession[]): ChartPoint[] {
  const totals = new Map<string, number>();
  sessions.forEach((session) => {
    const key = weekKey(session.date);
    totals.set(key, (totals.get(key) ?? 0) + session.earnedXp);
  });

  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

export function getFrequencyByWeek(sessions: TrainingSession[]): ChartPoint[] {
  const totals = new Map<string, number>();
  sessions
    .filter((session) => session.status === "completed")
    .forEach((session) => {
      const key = weekKey(session.date);
      totals.set(key, (totals.get(key) ?? 0) + 1);
    });

  return [...totals.entries()].map(([name, value]) => ({ name, value }));
}

export function getWeightTrend(checkins: BodyCheckin[], startWeightKg: number): ChartPoint[] {
  if (checkins.length === 0) {
    return [{ name: "Início", value: startWeightKg }];
  }

  return checkins.map((checkin) => ({
    name: new Date(checkin.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: checkin.weightKg,
  }));
}

export function getExerciseLoadTrend(
  sessions: TrainingSession[],
  exerciseId: string,
): ChartPoint[] {
  return sessions
    .flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) => ({
          name: new Date(session.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          value: getMaxWorkWeight(exercise),
        })),
    )
    .filter((point) => point.value > 0);
}

export function getExerciseRepsTrend(
  sessions: TrainingSession[],
  exerciseId: string,
): ChartPoint[] {
  return sessions
    .flatMap((session) =>
      session.exercises
        .filter((exercise) => exercise.exerciseId === exerciseId)
        .map((exercise) => ({
          name: new Date(session.date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          value: getTotalWorkReps(exercise),
        })),
    )
    .filter((point) => point.value > 0);
}

export function getRecentPrs(sessions: TrainingSession[], limit = 5): string[] {
  const best = new Map<string, number>();
  const prs: string[] = [];

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      const load = getMaxWorkWeight(exercise);
      const previous = best.get(exercise.exerciseId) ?? 0;
      if (load > previous) {
        best.set(exercise.exerciseId, load);
        prs.push(`${exercise.exerciseName}: ${load} kg`);
      }
    });
  });

  return prs.slice(-limit).reverse();
}

export function getStreak(
  sessions: TrainingSession[],
  dayEventsOrDate: DayEvent[] | Date = [],
  date = new Date(),
): number {
  const dayEvents = Array.isArray(dayEventsOrDate) ? dayEventsOrDate : [];
  const currentDate = Array.isArray(dayEventsOrDate) ? date : dayEventsOrDate;
  const completedDates = new Set(
    sessions
      .filter((session) => session.status === "completed")
      .map((session) => format(parseISO(session.date), "yyyy-MM-dd")),
  );
  const pausedDates = new Set(
    dayEvents
      .filter((event) => ["planned_rest", "recovery_rest"].includes(event.status))
      .map((event) => event.date),
  );
  let streak = 0;

  for (let offset = 0; offset < 60; offset += 1) {
    const day = format(subDays(currentDate, offset), "yyyy-MM-dd");
    if (completedDates.has(day)) {
      streak += 1;
    } else if (pausedDates.has(day)) {
      continue;
    } else if (offset > 0) {
      break;
    }
  }

  return streak;
}

export function getRadarProfile(data: AppData): ChartPoint[] {
  const strengthSessions = data.sessions.filter((session) =>
    session.workoutId.startsWith("treino-"),
  ).length;
  const cardioSessions = data.sessions.filter((session) =>
    ["boxe", "danca"].includes(session.workoutId),
  ).length;
  const technicalSessions = data.sessions.filter((session) =>
    ["boxe", "basquete-handles", "danca"].includes(session.workoutId),
  ).length;

  return [
    { name: "Força", value: Math.min(100, strengthSessions * 12) },
    { name: "Consistência", value: Math.min(100, getStreak(data.sessions, data.dayEvents) * 15) },
    { name: "Cardio", value: Math.min(100, cardioSessions * 15) },
    { name: "Técnica", value: Math.min(100, technicalSessions * 12) },
    { name: "Mobilidade", value: Math.min(100, data.bodyCheckins.length * 18) },
  ];
}

export function summarizeLastCheckin(data: AppData): string {
  const checkins = [...data.bodyCheckins].sort(
    (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime(),
  );
  if (checkins.length === 0) {
    return "Nenhum check-in ainda";
  }

  return `${checkins[0].weightKg.toFixed(1)} kg em ${new Date(checkins[0].date).toLocaleDateString("pt-BR")}`;
}
