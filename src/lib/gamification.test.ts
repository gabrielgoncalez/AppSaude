import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import type { TrainingSession } from "../types/training";
import {
  calculateSessionCoins,
  calculateSessionXp,
  claimReward,
  COIN_RULES,
  getAvailableXp,
  getLevel,
  getRewardCoins,
  getTotalXp,
  XP_RULES,
} from "./gamification";

function session(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: "s1",
    date: "2026-05-25T10:00:00.000Z",
    workoutId: "treino-a",
    workoutName: "Treino A",
    status: "completed",
    earnedXp: 0,
    exercises: [
      {
        exerciseId: "leg-press-45",
        exerciseName: "Leg Press 45º",
        type: "strength",
        completed: true,
        pain: false,
        dizziness: false,
        sets: [
          { setIndex: 1, weightKg: 100, reps: 8, rpe: 8, completed: true },
          { setIndex: 2, weightKg: 100, reps: 8, rpe: 8, completed: true },
        ],
      },
    ],
    ...overrides,
  };
}

describe("gamification", () => {
  it("calcula XP positivo por series, exercicio, treino e execucao completa", () => {
    expect(calculateSessionXp(session())).toBe(
      XP_RULES.setLogged * 2 +
        XP_RULES.exerciseCompleted +
        XP_RULES.strengthWorkoutCompleted +
        XP_RULES.executionComplete,
    );
  });

  it("nao aplica XP negativo em treino pulado", () => {
    expect(calculateSessionXp(session({ status: "skipped" }))).toBe(0);
  });

  it("pontua pouco uma sessao parcial e nao paga moedas antes de concluir treino", () => {
    const partial = session({
      status: "partial",
      exercises: [
        {
          exerciseId: "leg-press-45",
          exerciseName: "Leg Press 45º",
          type: "strength",
          completed: true,
          pain: false,
          dizziness: false,
          sets: [
            { setIndex: 1, weightKg: 100, reps: 8, completed: true },
            { setIndex: 2, weightKg: 100, reps: 8, completed: true },
            { setIndex: 3, weightKg: 100, reps: 8, completed: true },
          ],
        },
      ],
    });

    expect(calculateSessionXp(partial)).toBe(
      XP_RULES.setLogged * 3 + XP_RULES.exerciseCompleted,
    );
    expect(calculateSessionCoins(partial)).toBe(0);
  });

  it("pontua serie do fluxo rapido sem RPE ou alertas clinicos", () => {
    const quickSession = session({
      exercises: [
        {
          exerciseId: "leg-press-45",
          exerciseName: "Leg Press 45º",
          type: "strength",
          completed: true,
          pain: false,
          dizziness: false,
          sets: [{ setIndex: 1, weightKg: 100, reps: 8, completed: true }],
        },
      ],
    });

    expect(calculateSessionXp(quickSession)).toBe(
      XP_RULES.setLogged +
        XP_RULES.exerciseCompleted +
        XP_RULES.strengthWorkoutCompleted +
        XP_RULES.executionComplete,
    );
  });

  it("inclui XP de check-in e bonus semanal de tres musculacoes", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    data.settings.onboardingDone = true;
    data.bodyCheckins = [
      {
        id: "c1",
        date: "2026-05-25T10:00:00.000Z",
        weightKg: 114,
        energy: 3,
        sleep: 3,
        hunger: 3,
        soreness: 3,
        jointPain: false,
        dizziness: false,
      },
    ];
    data.sessions = [
      session({ id: "a", workoutId: "treino-a", earnedXp: 10 }),
      session({ id: "b", workoutId: "treino-b", earnedXp: 10 }),
      session({ id: "c", workoutId: "treino-c", earnedXp: 10 }),
    ];

    expect(getTotalXp(data)).toBe(30 + XP_RULES.checkin + XP_RULES.weekWithThreeStrength);
  });

  it("calcula nivel e moedas disponiveis apos recompensa", () => {
    const data = createInitialAppData();
    data.sessions = [session({ earnedXp: 1200, earnedCoins: 350 })];
    data.rewards[0] = claimReward(data.rewards[0], 350);

    expect(getLevel(getTotalXp(data)).name).toBe("Base Forte");
    expect(getAvailableXp(data)).toBe(350 - data.rewards[0].costXp);
  });

  it("mantem XP de jornada e aplica punicao em moedas", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    data.sessions = [session({ workoutId: "boxe", earnedXp: 760, earnedCoins: 30 })];
    data.dayEvents = [
      {
        id: "2026-06-01",
        date: "2026-06-01",
        workoutId: "boxe",
        workoutName: "Boxe",
        status: "missed",
        penaltyXp: 30,
        penaltyKind: "missed",
        manualSelection: false,
        createdAt: "2026-06-01T10:00:00.000Z",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
    ];

    expect(getTotalXp(data)).toBe(760);
    expect(getLevel(getTotalXp(data)).name).toBe("Consistência");
    expect(getRewardCoins(data)).toBe(18);
  });

  it("calcula moedas por treino completo com escala separada do XP", () => {
    expect(calculateSessionCoins(session())).toBe(COIN_RULES.strengthWorkoutCompleted);
  });
});
