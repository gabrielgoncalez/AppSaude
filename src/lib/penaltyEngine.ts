import { endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { AppData, DayEvent, PenaltyEvent } from "../types/appData";
import { daysUntilNextCheckin } from "./dates";

export const MISSED_COIN_PENALTIES = [12, 20, 35, 60] as const;
export const RECOVERY_COIN_PENALTIES = [4, 8, 15] as const;
export const MISSED_COMMITMENT_PENALTY = 20;
export const RECOVERY_COMMITMENT_PENALTY = 8;
export const LATE_CHECKIN_COIN_PENALTY = 8;
export const LATE_MEASUREMENT_COIN_PENALTY = 12;
export const LATE_CHECKIN_COMMITMENT_PENALTY = 10;
export const LATE_MEASUREMENT_COMMITMENT_PENALTY = 10;

export type MonthlyCommitmentSummary = {
  month: string;
  score: number;
  missedCount: number;
  recoveryRestCount: number;
  coinsPenalty: number;
  nextMissedCoinsPenalty: number;
  nextRecoveryCoinsPenalty: number;
  lateCheckin: boolean;
  lateFullMeasurement: boolean;
};

export function createPenaltyEventFromDayEvent(
  event: DayEvent,
  monthEvents: DayEvent[],
): PenaltyEvent | undefined {
  if (event.status === "missed") {
    const count = countKindUntil(monthEvents, event, "missed");
    return {
      id: `${event.id}-missed-workout`,
      date: event.date,
      type: "missed_workout",
      coinsPenalty: getMissedCoinsPenalty(count),
      commitmentScorePenalty: MISSED_COMMITMENT_PENALTY,
      reason: "Falta em treino planejado.",
    };
  }

  if (event.status === "recovery_rest") {
    const count = countKindUntil(monthEvents, event, "recovery_rest");
    return {
      id: `${event.id}-recovery-rest`,
      date: event.date,
      type: "recovery_rest",
      coinsPenalty: getRecoveryCoinsPenalty(count),
      commitmentScorePenalty: RECOVERY_COMMITMENT_PENALTY,
      reason: "Descanso recuperativo não planejado.",
    };
  }

  return undefined;
}

export function getMonthlyCommitmentSummary(
  data: AppData,
  date = new Date(),
): MonthlyCommitmentSummary {
  const month = format(date, "yyyy-MM");
  const monthStart = startOfMonth(date);
  const monthEvents = data.dayEvents.filter(
    (event) => format(parseISO(event.date), "yyyy-MM") === month,
  );
  const penaltyEvents = monthEvents
    .map((event) => createPenaltyEventFromDayEvent(event, monthEvents))
    .filter((event): event is PenaltyEvent => Boolean(event));
  const lateCheckin = daysUntilNextCheckin(data.bodyCheckins, data.profile.startedAt, date) === 0;
  const lateFullMeasurement = isFullMeasurementDue(data, date);
  const completedWeekBonus = getCompletedWeekBonus(data, monthStart, date);
  const coinsPenalty =
    penaltyEvents.reduce((sum, event) => sum + event.coinsPenalty, 0) +
    (lateCheckin ? LATE_CHECKIN_COIN_PENALTY : 0) +
    (lateFullMeasurement ? LATE_MEASUREMENT_COIN_PENALTY : 0);
  const scorePenalty =
    penaltyEvents.reduce((sum, event) => sum + event.commitmentScorePenalty, 0) +
    (lateCheckin ? LATE_CHECKIN_COMMITMENT_PENALTY : 0) +
    (lateFullMeasurement ? LATE_MEASUREMENT_COMMITMENT_PENALTY : 0);

  return {
    month,
    score: Math.max(0, Math.min(100, 100 - scorePenalty + completedWeekBonus)),
    missedCount: monthEvents.filter((event) => event.status === "missed").length,
    recoveryRestCount: monthEvents.filter((event) => event.status === "recovery_rest").length,
    coinsPenalty,
    nextMissedCoinsPenalty: getMissedCoinsPenalty(
      monthEvents.filter((event) => event.status === "missed").length + 1,
    ),
    nextRecoveryCoinsPenalty: getRecoveryCoinsPenalty(
      monthEvents.filter((event) => event.status === "recovery_rest").length + 1,
    ),
    lateCheckin,
    lateFullMeasurement,
  };
}

export function getTotalCoinsPenalty(data: AppData, date = new Date()): number {
  return getMonthlyCommitmentSummary(data, date).coinsPenalty;
}

export function getMissedCoinsPenalty(count: number): number {
  return MISSED_COIN_PENALTIES[Math.min(count - 1, MISSED_COIN_PENALTIES.length - 1)];
}

export function getRecoveryCoinsPenalty(count: number): number {
  return RECOVERY_COIN_PENALTIES[
    Math.min(count - 1, RECOVERY_COIN_PENALTIES.length - 1)
  ];
}

function countKindUntil(
  monthEvents: DayEvent[],
  event: DayEvent,
  status: "missed" | "recovery_rest",
): number {
  return monthEvents.filter(
    (candidate) => candidate.status === status && candidate.date <= event.date,
  ).length;
}

function isFullMeasurementDue(data: AppData, date: Date): boolean {
  const latestFull = [...data.bodyCheckins]
    .filter((checkin) => checkin.type === "full_30d")
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
  const reference = latestFull?.date ?? data.profile.startedAt;
  const elapsedMs = date.getTime() - parseISO(reference).getTime();
  return elapsedMs >= 30 * 24 * 60 * 60 * 1000;
}

function getCompletedWeekBonus(data: AppData, monthStart: Date, date: Date): number {
  let bonus = 0;
  let cursor = startOfWeek(monthStart, { weekStartsOn: 1 });

  while (cursor <= date) {
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    const weekEvents = data.dayEvents.filter((event) => {
      const day = parseISO(event.date);
      return day >= cursor && day <= weekEnd;
    });
    const hasMiss = weekEvents.some((event) => event.status === "missed");
    const strengthCompleted = new Set(
      weekEvents
        .filter(
          (event) => event.status === "completed" && event.workoutId.startsWith("treino-"),
        )
        .map((event) => event.workoutId),
    ).size;
    if (!hasMiss && strengthCompleted >= 3) {
      bonus += 10;
    }
    cursor = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  return bonus;
}
