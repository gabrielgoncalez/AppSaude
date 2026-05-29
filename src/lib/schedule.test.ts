import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import {
  completeWorkoutDay,
  getDayEvent,
  getNextCycleWorkoutAfter,
  getTodayWorkout,
  markRecoveryRest,
  resolvePendingDays,
  selectWorkoutForToday,
} from "./schedule";

describe("schedule", () => {
  it("troca a missão de hoje sem avançar o ciclo", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00"));
    const selected = selectWorkoutForToday(
      data,
      "treino-b",
      new Date("2026-05-25T10:00:00"),
    );

    expect(selected.schedule.activeWorkoutId).toBe("treino-b");
    expect(selected.schedule.todayWorkoutId).toBe("treino-b");
    expect(selected.schedule.todayStatus).toBe("selected");
    expect(getDayEvent(selected, new Date("2026-05-25T10:00:00"))).toMatchObject({
      status: "selected",
      workoutId: "treino-b",
      penaltyXp: 0,
    });
    expect(getNextCycleWorkoutAfter(selected, selected.schedule.activeWorkoutId).id).toBe(
      "basquete-handles",
    );
  });

  it("concluir treino avança para o próximo da ordem", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00"));
    const workout = data.trainingPlan.workouts.find((item) => item.id === "treino-a");

    const completed = completeWorkoutDay(
      data,
      workout!,
      new Date("2026-05-25T10:00:00"),
    );

    expect(completed.schedule.activeWorkoutId).toBe("boxe");
    expect(completed.schedule.todayWorkoutId).toBe("treino-a");
    expect(completed.schedule.todayStatus).toBe("completed");
    expect(getDayEvent(completed, new Date("2026-05-25T10:00:00"))).toMatchObject({
      status: "completed",
      penaltyXp: 0,
    });
  });

  it("descanso recuperativo aplica penalidade menor e não avança", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00"));
    const rested = markRecoveryRest(data, new Date("2026-05-25T10:00:00"));

    expect(rested.schedule.activeWorkoutId).toBe("treino-a");
    expect(rested.schedule.todayWorkoutId).toBe("treino-a");
    expect(rested.schedule.todayStatus).toBe("recovery_rest");
    expect(getDayEvent(rested, new Date("2026-05-25T10:00:00"))).toMatchObject({
      status: "recovery_rest",
      penaltyKind: "recovery_rest",
      penaltyXp: 10,
    });
  });

  it("falta aplica penalidade maior e não avança o ciclo", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00"));
    data.settings.onboardingDone = true;

    const resolved = resolvePendingDays(data, new Date("2026-05-26T10:00:00"));

    expect(resolved.changed).toBe(true);
    expect(resolved.data.schedule.activeWorkoutId).toBe("treino-a");
    expect(resolved.data.schedule.hasDebtAlert).toBe(true);
    expect(getDayEvent(resolved.data, new Date("2026-05-25T10:00:00"))).toMatchObject({
      status: "missed",
      penaltyKind: "missed",
      penaltyXp: 30,
    });
  });

  it("descanso fixo de domingo não pune", () => {
    const data = createInitialAppData(new Date("2026-05-31T10:00:00"));
    data.settings.onboardingDone = true;

    const resolved = resolvePendingDays(data, new Date("2026-06-01T10:00:00"));

    expect(getDayEvent(resolved.data, new Date("2026-05-31T10:00:00"))).toMatchObject({
      status: "planned_rest",
      penaltyXp: 0,
    });
  });

  it("domingo escolhido manualmente vira falta se não concluir", () => {
    const data = createInitialAppData(new Date("2026-05-31T10:00:00"));
    data.settings.onboardingDone = true;
    const selected = selectWorkoutForToday(
      data,
      "treino-a",
      new Date("2026-05-31T10:00:00"),
    );

    const resolved = resolvePendingDays(selected, new Date("2026-06-01T10:00:00"));

    expect(getDayEvent(resolved.data, new Date("2026-05-31T10:00:00"))).toMatchObject({
      status: "missed",
      penaltyKind: "missed",
      penaltyXp: 30,
    });
  });
  it("usa a agenda atual mesmo quando existe evento antigo concluido", () => {
    const data = createInitialAppData(new Date("2026-05-28T10:00:00"));
    const stale = {
      ...data,
      schedule: {
        ...data.schedule,
        activeWorkoutId: "basquete-handles",
        activeDate: "2026-05-28",
        updatedAt: "2026-05-28T13:00:00.000Z",
      },
      dayEvents: [
        {
          id: "2026-05-28",
          date: "2026-05-28",
          workoutId: "treino-c",
          workoutName: "Treino C",
          status: "completed" as const,
          penaltyXp: 0,
          manualSelection: false,
          createdAt: "2026-05-28T12:00:00.000Z",
          updatedAt: "2026-05-28T12:00:00.000Z",
        },
      ],
    };

    expect(getDayEvent(stale, new Date("2026-05-28T14:00:00"))).toMatchObject({
      status: "selected",
      workoutId: "basquete-handles",
    });
  });

  it("duas trocas seguidas mantem a ultima escolha", () => {
    const data = createInitialAppData(new Date("2026-05-28T10:00:00"));
    const first = selectWorkoutForToday(
      data,
      "treino-c",
      new Date("2026-05-28T10:00:00"),
    );
    const second = selectWorkoutForToday(
      first,
      "boxe",
      new Date("2026-05-28T10:01:00"),
    );

    expect(second.schedule.activeWorkoutId).toBe("boxe");
    expect(second.schedule.todayWorkoutId).toBe("boxe");
    expect(second.schedule.todayStatus).toBe("selected");
    expect(getDayEvent(second, new Date("2026-05-28T10:02:00"))).toMatchObject({
      status: "selected",
      workoutId: "boxe",
    });
  });

  it("sabado composto permite parcial e so avanca depois de capoeira e danca", () => {
    const data = createInitialAppData(new Date("2026-05-30T10:00:00"));
    const capoeira = data.trainingPlan.workouts.find((item) => item.id === "capoeira")!;
    const danca = data.trainingPlan.workouts.find((item) => item.id === "danca")!;

    const partial = completeWorkoutDay(data, capoeira, new Date("2026-05-30T10:00:00"));
    expect(partial.schedule.activeWorkoutId).toBe("danca");
    expect(partial.schedule.todayStatus).toBe("partial");
    expect(getDayEvent(partial, new Date("2026-05-30T10:00:00"))?.groupParts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ workoutId: "capoeira", status: "completed" }),
        expect.objectContaining({ workoutId: "danca", status: "selected" }),
      ]),
    );
    expect(getTodayWorkout(partial, new Date("2026-05-30T10:00:00")).id).toBe("danca");

    const completed = completeWorkoutDay(partial, danca, new Date("2026-05-30T11:00:00"));
    expect(completed.schedule.todayStatus).toBe("completed");
    expect(completed.schedule.activeWorkoutId).toBe("treino-a");
  });
});
