import { describe, expect, it } from "vitest";
import { createInitialAppData } from "../data/createInitialAppData";
import type { BodyCheckin } from "../types/appData";
import type { Exercise, TrainingSession } from "../types/training";
import {
  compareBodyMetrics,
  isFullMeasurementDue,
  isQuickCheckinDue,
} from "./bodyMetricsEngine";
import { calculateSessionXp } from "./gamification";
import { getLineageAnalysis } from "./exerciseAnalytics";
import { getMonthlyCommitmentSummary } from "./penaltyEngine";
import { getTodayPrescription } from "./prescriptionEngine";
import { getPrBonus } from "./progressionEngine";
import { getItemPrescription, getWorkoutWave } from "./waveEngine";

const baseExercise: Exercise = {
  id: "leg-press-45",
  name: "Leg Press 45º",
  type: "strength",
  priority: "base",
  targetSets: 4,
  repMin: 8,
  repMax: 15,
  restSec: 150,
  incrementKg: 5,
  progressionModel: "hybrid_wave",
  strengthWaveEligible: true,
};

const supportExercise: Exercise = {
  ...baseExercise,
  id: "elevacao-lateral",
  name: "Elevação Lateral",
  type: "hypertrophy",
  priority: "support",
  strengthWaveEligible: false,
};

function session(id: string, date: string, weightKg = 40): TrainingSession {
  return {
    id,
    date,
    workoutId: "treino-a",
    workoutName: "Treino A",
    status: "completed",
    earnedXp: 0,
    exercises: [
      {
        exerciseId: baseExercise.id,
        exerciseName: baseExercise.name,
        type: baseExercise.type,
        completed: true,
        pain: false,
        dizziness: false,
        sets: [
          { setIndex: 1, weightKg, reps: 10, completed: true },
        ],
      },
    ],
  };
}

describe("hybrid engines", () => {
  it("alterna treino por exposições: volume, volume_2, strength, consolidation", () => {
    expect(getWorkoutWave("treino-a", [])).toBe("volume");
    expect(getWorkoutWave("treino-a", [session("s1", "2026-05-01T10:00:00.000Z")])).toBe("volume_2");
    expect(getWorkoutWave("treino-a", [
      session("s1", "2026-05-01T10:00:00.000Z"),
      session("s2", "2026-05-08T10:00:00.000Z"),
    ])).toBe("strength");
    expect(getWorkoutWave("treino-a", [
      session("s1", "2026-05-01T10:00:00.000Z"),
      session("s2", "2026-05-08T10:00:00.000Z"),
      session("s3", "2026-05-15T10:00:00.000Z"),
    ])).toBe("consolidation");
  });

  it("base vira força e suporte não vira força pesada", () => {
    expect(getItemPrescription(baseExercise, "strength").repMin).toBe(5);
    expect(getItemPrescription(baseExercise, "strength").repMax).toBe(8);
    expect(getItemPrescription(supportExercise, "strength").repMin).toBe(8);
    expect(getItemPrescription(supportExercise, "strength").repMax).toBe(12);
  });

  it("check-ins vencem em 15 e 30 dias e compara medidas", () => {
    const start = "2026-05-01T10:00:00.000Z";
    const current: BodyCheckin = {
      id: "c2",
      date: "2026-05-31T10:00:00.000Z",
      type: "full_30d",
      weightKg: 113,
      waistNavelCm: 104,
    };
    const previous: BodyCheckin = {
      id: "c1",
      date: start,
      type: "quick_15d",
      weightKg: 115,
      waistNavelCm: 107,
    };

    expect(isQuickCheckinDue([previous], start, new Date("2026-05-16T10:00:00.000Z"))).toBe(true);
    expect(isFullMeasurementDue([], start, new Date("2026-05-31T10:00:00.000Z"))).toBe(true);
    expect(compareBodyMetrics(current, previous).waistNavelCm).toBe(-3);
  });

  it("penaltyEngine aplica moedas e score mensal", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    data.dayEvents = [
      {
        id: "2026-05-10",
        date: "2026-05-10",
        workoutId: "treino-a",
        workoutName: "Treino A",
        status: "missed",
        penaltyXp: 30,
        penaltyKind: "missed",
        manualSelection: false,
        createdAt: "2026-05-10T10:00:00.000Z",
        updatedAt: "2026-05-10T10:00:00.000Z",
      },
    ];

    const summary = getMonthlyCommitmentSummary(data, new Date("2026-05-12T10:00:00.000Z"));
    expect(summary.coinsPenalty).toBeGreaterThanOrEqual(100);
    expect(summary.score).toBeLessThanOrEqual(80);
  });

  it("bonus semanal de compromisso exige tres musculacoes", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    data.dayEvents = [
      {
        id: "2026-05-04",
        date: "2026-05-04",
        workoutId: "treino-a",
        workoutName: "Treino A",
        status: "completed",
        penaltyXp: 0,
        manualSelection: false,
        createdAt: "2026-05-04T10:00:00.000Z",
        updatedAt: "2026-05-04T10:00:00.000Z",
      },
      {
        id: "2026-05-05",
        date: "2026-05-05",
        workoutId: "treino-b",
        workoutName: "Treino B",
        status: "completed",
        penaltyXp: 0,
        manualSelection: false,
        createdAt: "2026-05-05T10:00:00.000Z",
        updatedAt: "2026-05-05T10:00:00.000Z",
      },
      {
        id: "2026-05-06",
        date: "2026-05-06",
        workoutId: "boxe",
        workoutName: "Boxe",
        status: "completed",
        penaltyXp: 0,
        manualSelection: false,
        createdAt: "2026-05-06T10:00:00.000Z",
        updatedAt: "2026-05-06T10:00:00.000Z",
      },
      {
        id: "2026-05-07",
        date: "2026-05-07",
        workoutId: "treino-c",
        workoutName: "Treino C",
        status: "recovery_rest",
        penaltyXp: 0,
        manualSelection: false,
        createdAt: "2026-05-07T10:00:00.000Z",
        updatedAt: "2026-05-07T10:00:00.000Z",
      },
    ];

    expect(getMonthlyCommitmentSummary(data, new Date("2026-05-08T10:00:00.000Z")).score).toBe(92);
    data.dayEvents[3] = {
      ...data.dayEvents[3],
      status: "completed",
    };
    expect(getMonthlyCommitmentSummary(data, new Date("2026-05-08T10:00:00.000Z")).score).toBe(100);
  });

  it("PR aplica bônus uma vez por item no dia", () => {
    const previous = session("s1", "2026-05-01T10:00:00.000Z", 40);
    const current = session("s2", "2026-05-08T10:00:00.000Z", 45);

    expect(getPrBonus(current, [previous])).toBe(20);
  });
  it("modo tecnico salva metricas sem inflar XP de serie/exercicio", () => {
    const technical: TrainingSession = {
      id: "boxe-1",
      date: "2026-05-20T10:00:00.000Z",
      workoutId: "boxe",
      workoutName: "Boxe Tecnico",
      status: "completed",
      earnedXp: 0,
      exercises: [
        {
          exerciseId: "boxe-metricas",
          exerciseName: "Registro tecnico",
          type: "technical_metric",
          completed: true,
          pain: false,
          dizziness: false,
          sets: [
            {
              setIndex: 1,
              completed: true,
              rounds: 5,
              hits: 35,
              attempts: 50,
              technicalRatings: { guarda: 4, base: 3, respiracao: 4 },
            },
          ],
        },
      ],
    };

    expect(calculateSessionXp(technical)).toBe(35);
    expect(getPrBonus(technical, [])).toBe(20);
  });
  it("varia supino por linhagem mantendo historicos separados", () => {
    const data = createInitialAppData(new Date("2026-05-01T10:00:00.000Z"));
    const workout = data.trainingPlan.workouts.find((item) => item.id === "treino-a");
    expect(workout).toBeTruthy();

    const volume = getTodayPrescription(data, workout!);
    expect(volume.wave).toBe("volume");
    expect(volume.exercises.map((item) => item.exercise.id)).toContain("supino-reto-maquina");
    expect(volume.exercises.map((item) => item.exercise.id)).not.toContain("supino-reto-halteres");

    data.sessions = [session("s1", "2026-05-01T10:00:00.000Z", 40)];
    const volumeTecnico = getTodayPrescription(data, workout!);
    expect(volumeTecnico.wave).toBe("volume_2");
    expect(volumeTecnico.exercises.map((item) => item.exercise.id)).toContain("supino-reto-halteres");
    expect(volumeTecnico.exercises.map((item) => item.exercise.id)).not.toContain("supino-reto-maquina");

    data.sessions = [
      {
        ...session("s1", "2026-05-01T10:00:00.000Z", 40),
        exercises: [
          {
            exerciseId: "supino-reto-maquina",
            exerciseName: "Supino Reto Maquina",
            type: "strength",
            completed: true,
            pain: false,
            dizziness: false,
            sets: [{ setIndex: 1, weightKg: 40, reps: 12, completed: true }],
          },
        ],
      },
      {
        ...session("s2", "2026-05-08T10:00:00.000Z", 20),
        exercises: [
          {
            exerciseId: "supino-reto-halteres",
            exerciseName: "Supino Reto Halteres",
            type: "strength_technical",
            completed: true,
            pain: false,
            dizziness: false,
            sets: [{ setIndex: 1, weightKg: 20, reps: 10, completed: true }],
          },
        ],
      },
    ];

    const lineage = getLineageAnalysis(data, "empurrar-horizontal-principal");
    expect(lineage.variants.find((item) => item.exerciseId === "supino-reto-maquina")?.maxWeightKg).toBe(40);
    expect(lineage.variants.find((item) => item.exerciseId === "supino-reto-halteres")?.maxWeightKg).toBe(20);
  });

  it("gera prescribedBlocks para musculacao, tecnicos e danca com capoeira corporal", () => {
    const data = createInitialAppData(new Date("2026-05-25T10:00:00.000Z"));
    const ids = ["treino-a", "boxe", "basquete-handles", "danca"];

    ids.forEach((id) => {
      const workout = data.trainingPlan.workouts.find((item) => item.id === id);
      expect(workout).toBeTruthy();
      expect(getTodayPrescription(data, workout!).prescribedBlocks.length).toBeGreaterThan(0);
    });
    expect(data.trainingPlan.workouts.find((item) => item.id === "capoeira")).toBeUndefined();
  });
});
