import { describe, expect, it } from "vitest";
import type { Exercise, Workout } from "../../types/training";
import type { PrescribedBlock } from "../../lib/prescriptionEngine";
import { shouldShowItemMetrics } from "./itemMetricVisibility";

const danceWorkout: Workout = {
  id: "danca",
  name: "Danca + Capoeira Corporal",
  dayOfWeek: 6,
  type: "dance",
  modality: "dance",
};

const reviewBlock: PrescribedBlock = {
  id: "danca-capoeira-revisao",
  name: "Revisao Tecnica de Capoeira",
  type: "review",
  blockMode: "checklist",
  required: false,
  items: [],
};

describe("DailyWorkoutRunner", () => {
  it("mostra metricas de danca apenas em itens dance_external", () => {
    const capoeiraReview: Exercise = {
      id: "danca-capoeira-revisao-ginga",
      name: "Ginga",
      displayName: "Ginga",
      type: "capoeira_movement",
      kind: "capoeira_movement",
      priority: "review",
      targetSets: 1,
      durationSec: 180,
      restSec: 0,
    };
    const steezy: Exercise = {
      id: "steezy-aula-do-dia",
      name: "Steezy - Aula do dia",
      displayName: "Steezy - Aula do dia",
      type: "dance_external",
      kind: "dance_external",
      targetSets: 1,
      durationSec: 1800,
      restSec: 0,
    };

    expect(danceWorkout.modality).toBe("dance");
    expect(shouldShowItemMetrics(reviewBlock, capoeiraReview)).toBe(false);
    expect(shouldShowItemMetrics(reviewBlock, steezy)).toBe(true);
  });
});
