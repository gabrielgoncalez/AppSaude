import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import type { Exercise, WorkoutBlock } from "../types/training";
import { getTodayPrescription } from "./prescriptionEngine";

describe("prescriptionEngine warmup cleanup", () => {
  it("remove aquecimento antigo de musculacao antes do runner", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const treinoA = data.trainingPlan.workouts.find((workout) => workout.id === "treino-a");
    expect(treinoA).toBeTruthy();
    treinoA!.workoutBlocks = [
      ...(treinoA!.workoutBlocks ?? []),
      legacyStrengthWarmupBlock(),
    ];

    const prescription = getTodayPrescription(data, treinoA!);
    const names = prescription.prescribedBlocks.flatMap((block) =>
      block.items.map((item) => item.exercise.displayName ?? item.exercise.name),
    );

    expect(names).toContain("Bike ida - 2,1 km");
    expect(names).not.toContain("Leg Press leve");
    expect(names).not.toContain("Supino leve");
  });
});

function legacyStrengthWarmupBlock(): WorkoutBlock {
  return {
    id: "a-aquecimento-especifico",
    name: "Aquecimento Específico",
    type: "warmup",
    blockMode: "checklist",
    required: false,
    items: [
      legacyWarmupExercise("a-aquecimento-leg-press-leve", "Leg Press leve"),
      legacyWarmupExercise("a-aquecimento-supino-leve", "Supino leve"),
    ],
  };
}

function legacyWarmupExercise(id: string, displayName: string): Exercise {
  return {
    id,
    name: displayName,
    displayName,
    type: "warmup",
    kind: "strength",
    priority: "warmup",
    targetSets: 1,
    repMin: 12,
    repMax: 12,
    restSec: 0,
    equipment: "máquina",
  };
}
