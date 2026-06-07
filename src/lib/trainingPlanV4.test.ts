import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import { MASTER_TRAINING_PLAN_VERSION } from "../data/initialTrainingPlan";
import type { AppData } from "../types/appData";
import { normalizeAppDataForWave } from "./trainingPlan";

describe("training plan v8", () => {
  it("remove aquecimento especifico separado dos treinos A/B/C", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const serialized = JSON.stringify(data.trainingPlan);

    expect(data.trainingPlan.version).toBe(MASTER_TRAINING_PLAN_VERSION);
    expect(MASTER_TRAINING_PLAN_VERSION).toBe(8);
    expect(serialized).not.toContain("a-aquecimento-especifico");
    expect(serialized).not.toContain("b-aquecimento-especifico");
    expect(serialized).not.toContain("c-aquecimento-especifico");
    expect(serialized).not.toContain("Leg Press leve");
    expect(serialized).not.toContain("Supino leve");
    expect(serialized).not.toContain("Stiff com halteres leves");
    expect(serialized).not.toContain("Remada leve");
  });

  it("configura warmup interno sem aumentar total de series do Leg Press", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const treinoA = data.trainingPlan.workouts.find((workout) => workout.id === "treino-a");
    const legPress = treinoA?.exercises?.find((exercise) => exercise.id === "leg-press-45");

    expect(legPress).toMatchObject({
      warmupSets: 1,
      targetSets: 3,
    });
  });

  it("configura warmup opcional da Puxada Alta", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const treinoA = data.trainingPlan.workouts.find((workout) => workout.id === "treino-a");
    const puxada = treinoA?.exercises?.find((exercise) => exercise.id === "puxada-alta");

    expect(puxada).toMatchObject({
      warmupSets: 1,
      warmupOptional: true,
      targetSets: 3,
    });
  });

  it("substitui plano v4 contaminado por aquecimento antigo", () => {
    const data = withLegacyWarmupArtifact(4, "Leg Press leve");
    const normalized = normalizeAppDataForWave(data);

    expect(normalized.changed).toBe(true);
    expect(normalized.data.trainingPlan.version).toBe(8);
    expect(JSON.stringify(normalized.data.trainingPlan)).not.toContain("Leg Press leve");
  });

  it("substitui plano v6 contaminado por id antigo", () => {
    const data = withLegacyWarmupArtifact(6, "a-aquecimento-especifico");
    const normalized = normalizeAppDataForWave(data);

    expect(normalized.changed).toBe(true);
    expect(normalized.data.trainingPlan.version).toBe(8);
    expect(JSON.stringify(normalized.data.trainingPlan)).not.toContain("a-aquecimento-especifico");
  });

  it("mantem Dead Bug na base corporal e remove da musculacao principal do Treino B", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const treinoB = data.trainingPlan.workouts.find((workout) => workout.id === "treino-b");
    const strengthIds =
      treinoB?.workoutBlocks
        ?.find((block) => block.id === "b-musculacao")
        ?.items.map((item) => item.id) ?? [];
    const baseIds =
      treinoB?.workoutBlocks
        ?.find((block) => block.id === "b-base-corporal")
        ?.items.map((item) => item.id) ?? [];

    expect(strengthIds).not.toContain("dead-bug-b");
    expect(baseIds).toContain("base-dead-bug-ativacao");
  });

  it("substitui plano v7 com Dead Bug dentro da musculacao principal", () => {
    const data = withDeadBugInTreinoBStrength();
    const normalized = normalizeAppDataForWave(data);
    const treinoB = normalized.data.trainingPlan.workouts.find(
      (workout) => workout.id === "treino-b",
    );
    const strengthIds =
      treinoB?.workoutBlocks
        ?.find((block) => block.id === "b-musculacao")
        ?.items.map((item) => item.id) ?? [];

    expect(normalized.changed).toBe(true);
    expect(normalized.data.trainingPlan.version).toBe(8);
    expect(strengthIds).not.toContain("dead-bug-b");
  });
});

function withLegacyWarmupArtifact(version: number, artifact: string): AppData {
  const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
  data.trainingPlan = structuredClone(data.trainingPlan);
  data.trainingPlan.version = version;
  const treinoA = data.trainingPlan.workouts.find((workout) => workout.id === "treino-a");
  if (!treinoA) {
    throw new Error("Treino A nao encontrado.");
  }
  treinoA.workoutBlocks = [
    ...(treinoA.workoutBlocks ?? []),
    {
      id: artifact,
      name: artifact,
      type: "warmup",
      blockMode: "checklist",
      required: false,
      items: [
        {
          id: artifact,
          displayName: artifact,
          name: artifact,
          type: "warmup",
          kind: "strength",
          targetSets: 1,
          repMin: 12,
          repMax: 12,
          restSec: 0,
        },
      ],
    },
  ];
  return data;
}

function withDeadBugInTreinoBStrength(): AppData {
  const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
  data.trainingPlan = structuredClone(data.trainingPlan);
  data.trainingPlan.version = 7;
  const treinoB = data.trainingPlan.workouts.find((workout) => workout.id === "treino-b");
  const strengthBlock = treinoB?.workoutBlocks?.find((block) => block.id === "b-musculacao");
  if (!strengthBlock) {
    throw new Error("Bloco de musculacao do Treino B nao encontrado.");
  }
  strengthBlock.items.push({
    id: "dead-bug-b",
    displayName: "Dead Bug",
    name: "Dead Bug",
    type: "core",
    kind: "core",
    targetSets: 2,
    repMin: 8,
    repMax: 12,
    restSec: 60,
    active: true,
  });
  return data;
}
