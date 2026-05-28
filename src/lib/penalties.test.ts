import { describe, expect, it } from "vitest";
import type { DayEvent } from "../types/appData";
import {
  getMonthlyPenaltySummary,
  getPenaltyFor,
  getTotalPenaltyXp,
} from "./penalties";

function event(
  id: string,
  date: string,
  penaltyKind: DayEvent["penaltyKind"],
  penaltyXp: number,
): DayEvent {
  return {
    id,
    date,
    workoutId: "treino-a",
    workoutName: "Treino A",
    status: penaltyKind === "missed" ? "missed" : "recovery_rest",
    penaltyXp,
    penaltyKind,
    manualSelection: false,
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  };
}

describe("penalties", () => {
  it("escala descanso recuperativo dentro do mês", () => {
    const events = [
      event("2026-05-01", "2026-05-01", "recovery_rest", 10),
      event("2026-05-05", "2026-05-05", "recovery_rest", 15),
      event("2026-05-10", "2026-05-10", "recovery_rest", 20),
    ];

    expect(getPenaltyFor("recovery_rest", events, "2026-05-12")).toBe(30);
  });

  it("escala falta mais pesado e soma o XP perdido", () => {
    const events = [
      event("2026-05-01", "2026-05-01", "missed", 30),
      event("2026-05-05", "2026-05-05", "missed", 45),
      event("2026-05-10", "2026-05-10", "missed", 60),
    ];

    expect(getPenaltyFor("missed", events, "2026-05-12")).toBe(90);
    expect(getTotalPenaltyXp(events)).toBe(135);
  });

  it("reseta a escala no dia 01 do mês seguinte", () => {
    const events = [
      event("2026-05-01", "2026-05-01", "missed", 30),
      event("2026-05-05", "2026-05-05", "missed", 45),
    ];

    expect(getPenaltyFor("missed", events, "2026-06-01")).toBe(30);
  });

  it("resume punições do mês atual", () => {
    const events = [
      event("2026-05-01", "2026-05-01", "missed", 30),
      event("2026-05-03", "2026-05-03", "recovery_rest", 10),
      event("2026-04-30", "2026-04-30", "missed", 30),
    ];

    expect(getMonthlyPenaltySummary(events, "2026-05-20")).toMatchObject({
      month: "2026-05",
      missedCount: 1,
      recoveryRestCount: 1,
      totalPenaltyXp: 40,
      nextMissedPenalty: 45,
      nextRecoveryPenalty: 15,
    });
  });
});
