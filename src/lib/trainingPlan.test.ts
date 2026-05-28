import { describe, expect, it } from "vitest";
import type { TrainingPlan } from "../types/training";
import { normalizeTrainingPlanForWave } from "./trainingPlan";

describe("trainingPlan", () => {
  it("normaliza exercícios de musculação com reps para 8-15", () => {
    const plan: TrainingPlan = {
      workouts: [
        {
          id: "treino-a",
          name: "Treino A",
          dayOfWeek: 1,
          type: "strength",
          exercises: [
            {
              id: "supino",
              name: "Supino",
              type: "strength",
              targetSets: 3,
              repMin: 5,
              repMax: 8,
              restSec: 120,
              incrementKg: 2.5,
            },
            {
              id: "prancha",
              name: "Prancha",
              type: "core",
              targetSets: 3,
              durationSec: 30,
              restSec: 60,
            },
          ],
        },
      ],
    };

    const normalized = normalizeTrainingPlanForWave(plan);

    expect(normalized.workouts[0].exercises?.[0]).toMatchObject({
      repMin: 8,
      repMax: 15,
    });
    expect(normalized.workouts[0].exercises?.[1].durationSec).toBe(30);
  });
});
