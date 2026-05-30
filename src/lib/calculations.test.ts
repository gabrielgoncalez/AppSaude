import { describe, expect, it } from "vitest";
import type { TrainingSession } from "../types/training";
import { calculateSessionVolume, getWeeklyVolume } from "./calculations";

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
      pain: false,
      dizziness: false,
      sets: [
        { setIndex: 1, setKind: "warmup", weightKg: 200, reps: 20, completed: true },
        { setIndex: 2, setKind: "work", weightKg: 100, reps: 8, completed: true },
        { setIndex: 3, weightKg: 100, reps: 6, completed: true },
        { setIndex: 4, setKind: "work", weightKg: 100, reps: 6, completed: false },
      ],
    },
  ],
};

describe("calculations", () => {
  it("calcula volume so de series de trabalho concluidas", () => {
    expect(calculateSessionVolume(session)).toBe(1400);
  });

  it("agrega volume semanal ignorando aquecimento", () => {
    expect(getWeeklyVolume([session])).toEqual([
      { name: "2026-05-25", value: 1400 },
    ]);
  });
});
