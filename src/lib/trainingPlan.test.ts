import { describe, expect, it } from "vitest";
import type { TrainingPlan } from "../types/training";
import { createInitialAppData } from "../data/createInitialAppData";
import { getTodayPrescription } from "./prescriptionEngine";
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

  it("mantem workout.exercises derivado do bloco Musculacao Principal", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const workout = data.trainingPlan.workouts.find((item) => item.id === "treino-a");
    const strengthBlock = workout?.workoutBlocks?.find((block) => block.id === "a-musculacao");

    expect(workout?.exercises?.map((item) => item.id)).toEqual(
      strengthBlock?.items.map((item) => item.id),
    );
  });

  it("usa danca como sabado unico e mantem biblioteca de capoeira", () => {
    const data = createInitialAppData(new Date("2026-05-30T10:00:00.000Z"));
    const workoutIds = data.trainingPlan.workouts.map((item) => item.id);
    const danca = data.trainingPlan.workouts.find((item) => item.id === "danca");

    expect(workoutIds).not.toContain("capoeira");
    expect(data.capoeiraMovements?.length).toBeGreaterThan(0);
    expect(danca).toMatchObject({
      name: "Dança + Capoeira Corporal",
      dayOfWeek: 6,
      cycleOrder: 6,
    });
    expect(danca?.sameDayGroupId).toBeUndefined();
    expect(danca?.groupOrder).toBeUndefined();
  });

  it("filtra posturas de capoeira corporal por onda em base_body", () => {
    const data = createInitialAppData(new Date("2026-05-30T10:00:00.000Z"));
    const danca = data.trainingPlan.workouts.find((item) => item.id === "danca")!;

    const posturesByExposure = [0, 1, 2, 3].map((completedExposures) => {
      const sessions = Array.from({ length: completedExposures }, (_, index) => ({
        id: `danca-${index}`,
        date: `2026-05-${20 + index}T10:00:00.000Z`,
        workoutId: "danca",
        workoutName: danca.name,
        status: "completed" as const,
        exercises: [],
        earnedXp: 0,
      }));
      const prescription = getTodayPrescription({ ...data, sessions }, danca);
      return prescription.prescribedBlocks
        .find((block) => block.id === "danca-posturas-isometricas")
        ?.items.map((item) => item.exercise.displayName);
    });

    expect(posturesByExposure).toEqual([
      ["Postura do Cavalo / Ma Bu", "Postura do Arco / Gong Bu"],
      ["Postura do Cavalo / Ma Bu", "Postura Vazia / Xu Bu"],
      ["Postura do Arco / Gong Bu", "Postura Rasteira / Pu Bu"],
      ["Postura do Cavalo / Ma Bu", "Postura Cruzada / Xie Bu"],
    ]);
  });
});
