import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import type { CapoeiraMovement } from "../types/appData";
import type { TechnicalBlockLog, TrainingSession } from "../types/training";
import {
  getCapoeiraProgressSummary,
  syncCapoeiraMovementsFromExercise,
  syncCapoeiraMovementsFromTechnicalBlocks,
} from "./capoeiraProgress";

const baseSession: TrainingSession = {
  id: "session",
  date: "2026-06-02T10:00:00.000Z",
  workoutId: "boxe",
  workoutName: "Boxe",
  status: "completed",
  exercises: [],
  earnedXp: 0,
};

describe("capoeiraProgress", () => {
  it("conta cards de capoeira em completedItems e technicalBlocks", () => {
    const data = createInitialAppData(new Date("2026-06-02T10:00:00.000Z"));
    const summary = getCapoeiraProgressSummary({
      ...data,
      sessions: [
        {
          ...baseSession,
          id: "treino-a-2026-06-01",
          workoutId: "treino-a",
          completedItems: ["a-capoeira-leve:a-revisao-ginga"],
        },
        {
          ...baseSession,
          id: "boxe-2026-06-02",
          completedItems: ["boxe-capoeira:boxe-ginga-leve"],
          technicalBlocks: [
            block("boxe-capoeira", [
              item("boxe-ginga-leve", "Ginga"),
              item("boxe-esquiva-lateral-leve", "Esquiva lateral"),
            ]),
          ],
        },
      ],
    });

    expect(summary.completedCards).toBe(3);
    expect(summary.mastered).toBe(0);
    expect(summary.validating).toBe(0);
  });

  it("conta banco generico no resumo sem alterar movimento especifico", () => {
    const data = createInitialAppData(new Date("2026-06-02T10:00:00.000Z"));
    const summary = getCapoeiraProgressSummary({
      ...data,
      sessions: [
        {
          ...baseSession,
          technicalBlocks: [
            block("danca-capoeira-revisao", [
              item("danca-capoeira-revisao-banco", "Banco de revisao automatica"),
            ]),
          ],
        },
      ],
    });
    const ginga = data.capoeiraMovements?.find((movement) => movement.displayName === "Ginga");
    const synced = syncCapoeiraMovementsFromExercise(data.capoeiraMovements, {
      id: "danca-capoeira-revisao-banco",
      referenceId: "capoeira-banco-revisao",
      displayName: "Banco de revisao automatica",
      name: "Banco de revisao automatica",
      type: "capoeira_movement",
      kind: "capoeira_movement",
    })?.find((movement) => movement.displayName === "Ginga");

    expect(summary.completedCards).toBe(1);
    expect(synced?.reviewsCompleted).toBe(ginga?.reviewsCompleted);
  });

  it("incrementa revisao e muda not_started para learning em movimento especifico", () => {
    const data = createInitialAppData(new Date("2026-06-02T10:00:00.000Z"));
    const ginga = syncCapoeiraMovementsFromExercise(data.capoeiraMovements, {
      id: "a-revisao-ginga",
      displayName: "Ginga",
      name: "Ginga",
      type: "capoeira_movement",
      kind: "capoeira_movement",
    })?.find((movement) => movement.displayName === "Ginga");

    expect(ginga).toMatchObject({
      status: "learning",
      reviewsCompleted: 1,
    });
  });

  it("aplica metricas explicitas sem dominar por revisao simples", () => {
    const data = createInitialAppData(new Date("2026-06-02T10:00:00.000Z"));
    const synced = syncCapoeiraMovementsFromTechnicalBlocks(
      data.capoeiraMovements,
      [
        block("capoeira-movimento-novo", [
          {
            ...item("capoeira-movimento-novo-curso", "Ginga"),
            metricValues: {
              capoeira_right_side: true,
              capoeira_left_side: true,
              capoeira_status: "dominado",
            },
            technicalRatings: {
              capoeira_quality: 4,
              capoeira_fluency: 3,
            },
          },
        ]),
      ],
      { previousCompletedItems: [] },
    );
    const ginga = synced?.find((movement) => movement.displayName === "Ginga");

    expect(ginga).toMatchObject({
      status: "mastered",
      reviewsCompleted: 1,
      rightSideDone: true,
      leftSideDone: true,
      quality1to5: 4,
      fluency1to5: 3,
    });
  });

  it("nao duplica revisao quando item ja estava completo antes da missao tecnica", () => {
    const movements = [
      {
        lessonNumber: 1,
        displayName: "Ginga",
        category: "base",
        status: "learning",
        reviewsCompleted: 1,
        canUseBag: false,
        referenceSearchQuery: "Ginga capoeira",
      },
    ] satisfies CapoeiraMovement[];
    const synced = syncCapoeiraMovementsFromTechnicalBlocks(
      movements,
      [block("boxe-capoeira", [item("boxe-ginga-leve", "Ginga")])],
      { previousCompletedItems: ["boxe-capoeira:boxe-ginga-leve"] },
    );

    expect(synced?.[0].reviewsCompleted).toBe(1);
  });
});

function block(blockId: string, items: TechnicalBlockLog["items"]): TechnicalBlockLog {
  return {
    blockId,
    blockName: blockId,
    completed: true,
    completedAt: "2026-06-02T10:00:00.000Z",
    items,
  };
}

function item(itemId: string, itemName: string): TechnicalBlockLog["items"][number] {
  return {
    itemId,
    itemName,
    completed: true,
    completedAt: "2026-06-02T10:00:00.000Z",
  };
}
