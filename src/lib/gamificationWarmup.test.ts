import { describe, expect, it } from "vitest";
import type { TrainingSession } from "../types/training";
import { calculateSessionXp, XP_RULES } from "./gamification";

describe("gamification warmup", () => {
  it("nao paga XP de serie principal para aquecimento", () => {
    const session: TrainingSession = {
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
            { setIndex: 1, setKind: "warmup", weightKg: 50, reps: 12, completed: true },
            { setIndex: 2, setKind: "work", weightKg: 100, reps: 8, completed: true },
          ],
        },
      ],
    };

    expect(calculateSessionXp(session)).toBe(
      XP_RULES.setLogged +
        XP_RULES.exerciseCompleted +
        XP_RULES.strengthWorkoutCompleted +
        XP_RULES.executionComplete,
    );
  });
});
