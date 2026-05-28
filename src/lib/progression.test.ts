import { describe, expect, it } from "vitest";
import type { Exercise, ExerciseLog, TrainingSession } from "../types/training";
import {
  getExerciseProgressionHistory,
  getProgressionSuggestion,
} from "./progression";
import { getLumbarSafetyAlert } from "./safety";

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

function log(weightKg: number, reps: number[], overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: "strength",
    pain: false,
    dizziness: false,
    sets: reps.map((rep, index) => ({
      setIndex: index + 1,
      weightKg,
      reps: rep,
      completed: true,
    })),
    ...overrides,
  };
}

function session(id: string, date: string, exerciseLog: ExerciseLog): TrainingSession {
  return {
    id,
    date,
    workoutId: "treino-a",
    workoutName: "Treino A",
    status: "completed",
    earnedXp: 0,
    exercises: [exerciseLog],
  };
}

describe("progression", () => {
  it("sem histórico mostra sugestão neutra", () => {
    expect(getProgressionSuggestion(exercise).title).toBe("Sugestão para hoje");
  });

  it("calcula maior carga real e meta mensal arredondada por incremento", () => {
    const history = getExerciseProgressionHistory(
      exercise,
      [session("s1", "2026-05-01T10:00:00.000Z", log(20, [8, 8, 8]))],
      undefined,
      new Date("2026-05-20T10:00:00.000Z"),
    );

    expect(history.maxWeightKg).toBe(20);
    expect(history.lastSessionMaxWeightKg).toBe(20);
    expect(history.monthlyTargetKg).toBe(25);
  });

  it("3x15 ativa hora de subir carga", () => {
    const suggestion = getProgressionSuggestion(exercise, log(40, [15, 15, 15]));

    expect(suggestion.title).toBe("Hora de subir carga");
  });

  it("3x15 sem RPE no fluxo rápido também ativa subida", () => {
    const suggestion = getProgressionSuggestion(exercise, log(40, [15, 15, 15]));

    expect(suggestion.title).toBe("Hora de subir carga");
  });

  it("nova carga com reps caindo para 8 é adaptação positiva", () => {
    const history = getExerciseProgressionHistory(
      exercise,
      [session("s1", "2026-05-01T10:00:00.000Z", log(40, [15, 15, 15]))],
      undefined,
      new Date("2026-05-08T10:00:00.000Z"),
    );
    const suggestion = getProgressionSuggestion(exercise, log(45, [8, 8, 8]), history);

    expect(suggestion.title).toBe("Nova carga");
    expect(suggestion.message).toContain("meta agora é chegar em 9");
  });

  it("3+ semanas na mesma carga sugere tentativa controlada", () => {
    const history = getExerciseProgressionHistory(
      exercise,
      [session("s1", "2026-05-01T10:00:00.000Z", log(40, [10, 10, 10]))],
      undefined,
      new Date("2026-05-25T10:00:00.000Z"),
    );
    const suggestion = getProgressionSuggestion(exercise, log(40, [12, 12, 12]), history);

    expect(history.weeksAtMaxWeight).toBeGreaterThanOrEqual(3);
    expect(suggestion.title).toBe("Tentativa controlada");
  });

  it("bloqueia progressão com RPE alto em dados antigos", () => {
    const suggestion = getProgressionSuggestion(exercise, {
      ...log(40, [10]),
      sets: [{ setIndex: 1, weightKg: 40, reps: 10, rpe: 9, completed: true }],
    });

    expect(suggestion.title).toBe("Hoje foi pesado");
  });

  it("bloqueia progressão com dor ou tontura em dados antigos", () => {
    const suggestion = getProgressionSuggestion(exercise, {
      ...log(40, [10]),
      pain: true,
    });

    expect(suggestion.title).toBe("Sem progressão hoje");
  });

  it("trata Graviton como redução de assistência", () => {
    const suggestion = getProgressionSuggestion(
      { ...exercise, id: "graviton", name: "Graviton", incrementKg: -2.5 },
      log(40, [15, 15, 15]),
    );

    expect(suggestion.title).toBe("Reduzir assistência");
  });

  it("mostra alerta específico de lombar/banco romano com tontura", () => {
    const alert = getLumbarSafetyAlert(
      { name: "Banco Romano Lombar" },
      { dizziness: true, sets: [] },
    );

    expect(alert?.title).toBe("Tontura na lombar");
    expect(alert?.message).toContain("Não progrida");
  });
});
