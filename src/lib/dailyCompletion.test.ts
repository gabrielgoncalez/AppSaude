import { describe, expect, it } from "vitest";
import type { Exercise, ExerciseLog } from "../types/training";
import {
  getCompletionKey,
  isDailyBlockCompleted,
  isDailyItemCompleted,
  isRequiredItem,
} from "./dailyCompletion";
import { buildReferenceSearchQuery } from "./referenceSearch";

const item: Exercise = {
  id: "mobilidade-tornozelo",
  legacyIds: ["tornozelo-antigo"],
  name: "Tornozelo",
  displayName: "Tornozelo",
  type: "mobility",
  kind: "mobility",
  targetSets: 1,
  restSec: 0,
  active: true,
};

const completedExerciseLog: ExerciseLog = {
  exerciseId: "leg-press-45",
  exerciseName: "Leg Press 45",
  type: "strength",
  completed: true,
  pain: false,
  dizziness: false,
  sets: [{ setIndex: 1, completed: true, weightKg: 100, reps: 8 }],
};

describe("dailyCompletion", () => {
  it("usa chave escopada e aceita IDs antigos crus", () => {
    expect(getCompletionKey("a-mobilidade", item.id)).toBe(
      "a-mobilidade:mobilidade-tornozelo",
    );
    expect(
      isDailyItemCompleted({
        blockId: "a-mobilidade",
        item,
        completedItems: ["a-mobilidade:mobilidade-tornozelo"],
      }),
    ).toBe(true);
    expect(
      isDailyItemCompleted({
        blockId: "a-mobilidade",
        item,
        completedItems: ["tornozelo-antigo"],
      }),
    ).toBe(true);
  });

  it("considera exercicio de musculacao concluido pelo log de series", () => {
    const strengthItem: Exercise = {
      ...item,
      id: "leg-press-45",
      legacyIds: ["leg-press-antigo"],
      type: "strength",
      kind: "strength",
    };

    expect(
      isDailyItemCompleted({
        blockId: "a-musculacao",
        item: strengthItem,
        exerciseLogs: [completedExerciseLog],
      }),
    ).toBe(true);
  });

  it("nao bloqueia item future ou inactive em bloco obrigatorio", () => {
    const futureItem: Exercise = {
      ...item,
      id: "future-wall-sit",
      active: false,
      phaseAvailability: "future",
    };
    const block = {
      id: "base-obrigatoria",
      required: true,
      items: [{ exercise: futureItem }],
    };

    expect(isRequiredItem(block, futureItem)).toBe(false);
    expect(
      isDailyBlockCompleted({
        block,
        completedItems: [],
        exerciseLogs: [],
      }),
    ).toBe(false);
  });

  it("alterna obrigatorio de capoeira entre movimento novo e revisao", () => {
    expect(
      isRequiredItem(
        { id: "capoeira-movimento-novo", required: true },
        item,
        { capoeiraHasNewMovement: true },
      ),
    ).toBe(true);
    expect(
      isRequiredItem(
        { id: "capoeira-revisao-dominados", required: false },
        item,
        { capoeiraHasNewMovement: false },
      ),
    ).toBe(true);
  });

  it("faz fallback de busca por modalidade", () => {
    expect(
      buildReferenceSearchQuery(
        { ...item, referenceSearchQuery: undefined, displayName: "Pound Dribble" },
        {
          id: "basquete-handles",
          name: "Basquete",
          dayOfWeek: 4,
          type: "basketball",
          modality: "basketball",
        },
      ),
    ).toBe("Pound Dribble basketball drill");
  });
});
