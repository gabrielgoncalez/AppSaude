import { describe, expect, it } from "vitest";
import type { ExerciseLog } from "../types/training";
import {
  countCompletedWorkSets,
  getMaxWorkWeight,
  getTotalWorkReps,
  isExerciseWorkComplete,
  isWorkSet,
} from "./sets";

const log: ExerciseLog = {
  exerciseId: "leg-press-45",
  exerciseName: "Leg Press 45º",
  type: "strength",
  pain: false,
  dizziness: false,
  sets: [
    { setIndex: 1, setKind: "warmup", weightKg: 120, reps: 15, completed: true },
    { setIndex: 2, setKind: "work", weightKg: 80, reps: 10, completed: true },
    { setIndex: 3, weightKg: 85, reps: 9, completed: true },
    { setIndex: 4, setKind: "work", weightKg: 90, reps: 8, completed: false },
  ],
};

describe("sets", () => {
  it("trata set antigo sem setKind como trabalho", () => {
    expect(isWorkSet({})).toBe(true);
  });

  it("ignora aquecimento em contagem, carga maxima e reps de trabalho", () => {
    expect(countCompletedWorkSets(log)).toBe(2);
    expect(getMaxWorkWeight(log)).toBe(85);
    expect(getTotalWorkReps(log)).toBe(19);
  });

  it("aquecimento sozinho nao conclui exercicio", () => {
    expect(
      isExerciseWorkComplete(
        {
          completed: false,
          sets: [{ setIndex: 1, setKind: "warmup", completed: true }],
        },
        { targetSets: 1 },
      ),
    ).toBe(false);
  });

  it("conclui exercicio ao bater todas as series de trabalho", () => {
    expect(isExerciseWorkComplete(log, { targetSets: 2 })).toBe(true);
  });
});
