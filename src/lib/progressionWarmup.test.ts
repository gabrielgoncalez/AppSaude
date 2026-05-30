import { describe, expect, it } from "vitest";
import type { Exercise, ExerciseLog, TrainingSession } from "../types/training";
import { getExerciseProgressionHistory, getProgressionSuggestion } from "./progression";

const exercise: Exercise = {
  id: "leg-press-45",
  name: "Leg Press 45º",
  type: "strength",
  targetSets: 3,
  repMin: 8,
  repMax: 15,
  restSec: 150,
  incrementKg: 5,
};

function session(log: ExerciseLog): TrainingSession {
  return {
    id: "s1",
    date: "2026-05-01T10:00:00.000Z",
    workoutId: "treino-a",
    workoutName: "Treino A",
    status: "completed",
    earnedXp: 0,
    exercises: [log],
  };
}

describe("progression warmup", () => {
  it("warmup sozinho nao ativa progressao", () => {
    const suggestion = getProgressionSuggestion(exercise, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      type: "strength",
      pain: false,
      dizziness: false,
      sets: [
        { setIndex: 1, setKind: "warmup", weightKg: 100, reps: 15, completed: true },
      ],
    });

    expect(suggestion.title).toBe("Aquecimento registrado");
  });

  it("historico ignora carga de aquecimento em PR e meta", () => {
    const history = getExerciseProgressionHistory(
      exercise,
      [
        session({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          type: "strength",
          pain: false,
          dizziness: false,
          sets: [
            { setIndex: 1, setKind: "warmup", weightKg: 200, reps: 12, completed: true },
            { setIndex: 2, setKind: "work", weightKg: 80, reps: 10, completed: true },
          ],
        }),
      ],
      undefined,
      new Date("2026-05-20T10:00:00.000Z"),
    );

    expect(history.maxWeightKg).toBe(80);
    expect(history.monthlyTargetKg).toBe(90);
  });
});
