import { format, parseISO } from "date-fns";
import type { DayEvent, PenaltyKind } from "../types/appData";

export const RECOVERY_REST_PENALTIES = [10, 15, 20, 30] as const;
export const MISSED_PENALTIES = [30, 45, 60, 90] as const;

export type MonthlyPenaltySummary = {
  month: string;
  recoveryRestCount: number;
  missedCount: number;
  totalPenaltyXp: number;
  nextRecoveryPenalty: number;
  nextMissedPenalty: number;
};

export function dayKey(date: Date | string = new Date()): string {
  return format(toDate(date), "yyyy-MM-dd");
}

export function monthKey(date: Date | string = new Date()): string {
  return format(toDate(date), "yyyy-MM");
}

export function getTotalPenaltyXp(dayEvents: DayEvent[] = []): number {
  return dayEvents.reduce((sum, event) => sum + (event.penaltyXp ?? 0), 0);
}

export function getMonthlyPenaltyCount(
  dayEvents: DayEvent[],
  kind: PenaltyKind,
  date: Date | string = new Date(),
): number {
  const currentMonth = monthKey(date);
  return dayEvents.filter(
    (event) => event.penaltyKind === kind && monthKey(event.date) === currentMonth,
  ).length;
}

export function getPenaltyFor(
  kind: PenaltyKind,
  dayEvents: DayEvent[],
  date: Date | string = new Date(),
): number {
  return getPenaltyFromCount(kind, getMonthlyPenaltyCount(dayEvents, kind, date) + 1);
}

export function getNextPenaltyFor(
  kind: PenaltyKind,
  dayEvents: DayEvent[],
  date: Date | string = new Date(),
): number {
  return getPenaltyFor(kind, dayEvents, date);
}

export function getMonthlyPenaltySummary(
  dayEvents: DayEvent[],
  date: Date | string = new Date(),
): MonthlyPenaltySummary {
  const month = monthKey(date);
  const currentMonthEvents = dayEvents.filter((event) => monthKey(event.date) === month);

  return {
    month,
    recoveryRestCount: currentMonthEvents.filter(
      (event) => event.penaltyKind === "recovery_rest",
    ).length,
    missedCount: currentMonthEvents.filter((event) => event.penaltyKind === "missed")
      .length,
    totalPenaltyXp: getTotalPenaltyXp(currentMonthEvents),
    nextRecoveryPenalty: getNextPenaltyFor("recovery_rest", dayEvents, date),
    nextMissedPenalty: getNextPenaltyFor("missed", dayEvents, date),
  };
}

function getPenaltyFromCount(kind: PenaltyKind, count: number): number {
  const table = kind === "recovery_rest" ? RECOVERY_REST_PENALTIES : MISSED_PENALTIES;
  return table[Math.min(count - 1, table.length - 1)];
}

function toDate(date: Date | string): Date {
  return date instanceof Date ? date : parseISO(date);
}
