import { describe, expect, it } from "vitest";
import type { PrescribedBlock } from "./prescriptionEngine";
import type { Exercise, TrainingSession, Workout } from "../types/training";
import { getCompletionKey } from "./dailyCompletion";
import { buildWorkoutSummary } from "./postWorkout";

describe("postWorkout summary", () => {
  it("conta slots prescritos pela onda, nao todas as variacoes ativas", () => {
    const workout = workoutWithActiveVariations(13);
    const prescribedExercises = workout.exercises?.slice(0, 9) ?? [];
    const session = completedSession(
      prescribedExercises.map((exercise) => getCompletionKey("b-musculacao", exercise.id)),
    );
    const summary = buildWorkoutSummary({
      session,
      previousSessions: [],
      workout,
      nextWorkout: { ...workout, id: "boxe", name: "Boxe" },
      prescribedBlocks: [prescribedBlock(prescribedExercises)],
    });

    expect(summary.completedExercises).toBe(9);
    expect(summary.totalExercises).toBe(9);
  });

  it("conta variacao alternativa como o mesmo slot quando completedItems marcou o slot indicado", () => {
    const prescribed = exercise("supino-inclinado-halteres", "Supino Inclinado Halteres");
    const alternative = exercise("supino-inclinado-maquina", "Supino Inclinado Maquina");
    const workout: Workout = {
      id: "treino-b",
      name: "Treino B",
      dayOfWeek: 3,
      type: "strength",
      modality: "strength",
      exercises: [prescribed, alternative],
    };
    const session: TrainingSession = {
      ...completedSession([getCompletionKey("b-musculacao", prescribed.id)]),
      exercises: [
        {
          exerciseId: alternative.id,
          exerciseName: alternative.name,
          type: alternative.type,
          completed: true,
          pain: false,
          dizziness: false,
          sets: [
            { setIndex: 1, setKind: "work", weightKg: 20, reps: 10, completed: true },
            { setIndex: 2, setKind: "work", weightKg: 20, reps: 10, completed: true },
            { setIndex: 3, setKind: "work", weightKg: 20, reps: 10, completed: true },
          ],
        },
      ],
    };
    const summary = buildWorkoutSummary({
      session,
      previousSessions: [],
      workout,
      nextWorkout: { ...workout, id: "boxe", name: "Boxe" },
      prescribedBlocks: [prescribedBlock([prescribed])],
    });

    expect(summary.completedExercises).toBe(1);
    expect(summary.totalExercises).toBe(1);
  });
});

function workoutWithActiveVariations(total: number): Workout {
  const exercises = Array.from({ length: total }, (_, index) =>
    exercise(`slot-${index + 1}`, `Exercicio ${index + 1}`),
  );
  return {
    id: "treino-b",
    name: "Treino B",
    dayOfWeek: 3,
    type: "strength",
    modality: "strength",
    exercises,
    workoutBlocks: [
      {
        id: "b-musculacao",
        name: "Musculacao Principal",
        type: "strength",
        blockMode: "sets",
        required: true,
        items: exercises,
      },
    ],
  };
}

function exercise(id: string, displayName: string): Exercise {
  return {
    id,
    name: displayName,
    displayName,
    type: "strength",
    kind: "strength",
    targetSets: 3,
    repMin: 8,
    repMax: 15,
    restSec: 120,
    active: true,
  };
}

function prescribedBlock(exercises: Exercise[]): PrescribedBlock {
  return {
    id: "b-musculacao",
    name: "Musculacao Principal",
    type: "strength",
    blockMode: "sets",
    required: true,
    items: exercises.map((item) => ({
      exercise: item,
      blockId: "b-musculacao",
      blockName: "Musculacao Principal",
      prescription: {
        wave: "volume",
        targetSets: item.targetSets,
        repMin: item.repMin,
        repMax: item.repMax,
        restSec: item.restSec,
        message: "Teste",
      },
    })),
  };
}

function completedSession(completedItems: string[]): TrainingSession {
  return {
    id: "session",
    date: "2026-06-03T10:00:00.000Z",
    workoutId: "treino-b",
    workoutName: "Treino B",
    status: "completed",
    completedItems,
    exercises: [],
    earnedXp: 0,
  };
}
