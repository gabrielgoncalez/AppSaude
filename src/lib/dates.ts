import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BodyCheckin } from "../types/appData";
import type { TrainingPlan, TrainingSession, Workout } from "../types/training";

export function todayIso(): string {
  return new Date().toISOString();
}

export function formatDateLabel(iso: string): string {
  return format(parseISO(iso), "dd MMM yyyy", { locale: ptBR });
}

export function formatDayName(dayOfWeek: number): string {
  const names = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return names[dayOfWeek] ?? "Dia";
}

export function getWorkoutForDate(plan: TrainingPlan, date = new Date()): Workout {
  return (
    plan.workouts.find((workout) => workout.dayOfWeek === date.getDay()) ??
    plan.workouts[0]
  );
}

export function getNextWorkout(plan: TrainingPlan, date = new Date()): Workout {
  for (let offset = 1; offset <= 7; offset += 1) {
    const next = addDays(date, offset);
    const workout = plan.workouts.find(
      (candidate) => candidate.dayOfWeek === next.getDay() && candidate.type !== "rest",
    );
    if (workout) {
      return workout;
    }
  }

  return plan.workouts[0];
}

export function daysUntilNextCheckin(
  checkins: BodyCheckin[],
  startedAt: string,
  date = new Date(),
): number {
  const lastDate =
    checkins.length > 0
      ? checkins
          .map((checkin) => parseISO(checkin.date))
          .sort((a, b) => b.getTime() - a.getTime())[0]
      : parseISO(startedAt);
  const elapsed = differenceInCalendarDays(date, lastDate);
  return Math.max(0, 15 - elapsed);
}

export function isCheckinDue(
  checkins: BodyCheckin[],
  startedAt: string,
  date = new Date(),
): boolean {
  return daysUntilNextCheckin(checkins, startedAt, date) === 0;
}

export function isSessionToday(session: TrainingSession, date = new Date()): boolean {
  return isSameDay(parseISO(session.date), date);
}

export function weekKey(iso: string): string {
  return format(startOfWeek(parseISO(iso), { weekStartsOn: 1 }), "yyyy-MM-dd");
}
