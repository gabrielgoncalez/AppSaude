import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import type { BodyCheckin, DayEvent } from "../types/appData";
import type { Exercise, ExerciseLog, TrainingSession, Workout } from "../types/training";
import { getBehaviorRewardTriggers } from "./behaviorRewards";
import { buildCheckinInsight } from "./checkinInsights";
import { getExerciseAnalysis, getRepsByWeight } from "./exerciseAnalytics";
import { buildWorkoutSummary } from "./postWorkout";
import { getTrainingInsights } from "./trainingInsights";

const exercise: Exercise = {
  id: "puxada-alta",
  name: "Puxada Alta",
  type: "hypertrophy",
  targetSets: 3,
  repMin: 8,
  repMax: 15,
  restSec: 90,
  incrementKg: 5,
};

const workout: Workout = {
  id: "treino-a",
  name: "Treino A",
  dayOfWeek: 1,
  type: "strength",
  exercises: [exercise],
};

function log(weightKg: number, reps: number[]): ExerciseLog {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: exercise.type,
    pain: false,
    dizziness: false,
    completed: reps.length >= exercise.targetSets,
    sets: reps.map((rep, index) => ({
      setIndex: index + 1,
      weightKg,
      reps: rep,
      completed: true,
    })),
  };
}

function session(id: string, date: string, exerciseLog: ExerciseLog): TrainingSession {
  return {
    id,
    date,
    workoutId: workout.id,
    workoutName: workout.name,
    status: "completed",
    earnedXp: 64,
    exercises: [exerciseLog],
  };
}

describe("intelligent execution helpers", () => {
  it("resume pós-treino com XP, PR novo e próxima missão", () => {
    const previous = session("s1", "2026-05-01T10:00:00.000Z", log(40, [12, 12, 12]));
    const current = session("s2", "2026-05-08T10:00:00.000Z", log(45, [8, 8, 8]));
    const summary = buildWorkoutSummary({
      session: current,
      previousSessions: [previous],
      workout,
      nextWorkout: { ...workout, id: "boxe", name: "Boxe Técnico", type: "skill_cardio" },
    });

    expect(summary.earnedXp).toBe(64);
    expect(summary.completedExercises).toBe(1);
    expect(summary.newMaxes).toEqual([
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        previousWeightKg: 40,
        weightKg: 45,
      },
    ]);
    expect(summary.nextWorkoutName).toBe("Boxe Técnico");
  });

  it("calcula evolução por exercício e reps por carga", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    data.trainingPlan = { workouts: [workout] };
    data.sessions = [
      session("s1", "2026-05-01T10:00:00.000Z", log(40, [10, 10, 10])),
      session("s2", "2026-05-08T10:00:00.000Z", log(45, [8, 8, 8])),
    ];

    expect(getRepsByWeight(data.sessions, exercise.id)).toEqual([
      { name: "40 kg", value: 30 },
      { name: "45 kg", value: 24 },
    ]);

    const analysis = getExerciseAnalysis(
      data,
      exercise.id,
      new Date("2026-05-15T10:00:00.000Z"),
    );
    expect(analysis.maxWeightKg).toBe(45);
    expect(analysis.lastWeightKg).toBe(45);
    expect(analysis.repsByWeight).toHaveLength(2);
  });

  it("gera leitura acionável de check-in", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    data.sessions = [
      session("s1", "2026-05-16T10:00:00.000Z", log(40, [10, 10, 10])),
      session("s2", "2026-05-18T10:00:00.000Z", log(42.5, [9, 9, 9])),
    ];
    const checkin: BodyCheckin = {
      id: "c1",
      date: "2026-05-20T10:00:00.000Z",
      weightKg: 113,
      energy: 4,
      sleep: 4,
      hunger: 3,
      soreness: 2,
      jointPain: false,
      dizziness: false,
    };

    const insight = buildCheckinInsight(
      { ...data, bodyCheckins: [checkin] },
      checkin,
    );

    expect(insight.weightDiffKg).toBe(-2);
    expect(insight.recommendation).toBe("manter");
    expect(insight.sessions15d).toBe(2);
  });

  it("gera recomendações de agenda e gatilhos de recompensa", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    data.trainingPlan = { workouts: [workout] };
    data.sessions = [
      session("s1", "2026-05-01T10:00:00.000Z", log(40, [15, 15, 15])),
      session("s2", "2026-05-20T10:00:00.000Z", log(45, [8, 8, 8])),
    ];
    data.dayEvents = [
      {
        id: "2026-05-25",
        date: "2026-05-25",
        workoutId: "treino-a",
        workoutName: "Treino A",
        status: "missed",
        penaltyXp: 30,
        penaltyKind: "missed",
        manualSelection: false,
        createdAt: "2026-05-25T10:00:00.000Z",
        updatedAt: "2026-05-25T10:00:00.000Z",
      } satisfies DayEvent,
    ];

    expect(getTrainingInsights(data, new Date("2026-05-28T10:00:00.000Z"))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "strength-delay" }),
        expect.objectContaining({ id: "miss-rebound" }),
      ]),
    );
    expect(getBehaviorRewardTriggers(data, new Date("2026-05-28T10:00:00.000Z"))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "recent-load", status: "unlocked" }),
      ]),
    );
  });
});
