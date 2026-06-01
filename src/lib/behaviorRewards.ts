import { parseISO, subDays } from "date-fns";
import type { AppData } from "../types/appData";
import { daysUntilNextCheckin } from "./dates";
import { getExerciseAnalysis, getPlanExercises } from "./exerciseAnalytics";

export type BehaviorRewardStatus = "unlocked" | "progress";

export type BehaviorRewardTrigger = {
  id: string;
  title: string;
  description: string;
  status: BehaviorRewardStatus;
  bonusXp: number;
};

export function getBehaviorRewardTriggers(
  data: AppData,
  date = new Date(),
): BehaviorRewardTrigger[] {
  return [
    getMonthlyGoalTrigger(data, date),
    getNoMissTrigger(data, date),
    getCheckinTrigger(data, date),
    getLoadIncreaseTrigger(data, date),
  ];
}

function getMonthlyGoalTrigger(data: AppData, date: Date): BehaviorRewardTrigger {
  const hit = getPlanExercises(data.trainingPlan).some(({ exercise }) => {
    const analysis = getExerciseAnalysis(data, exercise.id, date);
    return Boolean(
      analysis.maxWeightKg &&
        analysis.monthlyTargetKg &&
        analysis.maxWeightKg >= analysis.monthlyTargetKg,
    );
  });

  return {
    id: "monthly-goal",
    title: "Meta mensal batida",
    description: hit
      ? "Você já bateu uma meta mensal de carga. Vale recompensa planejada."
      : "Bata a meta do mês em um exercício para liberar uma recompensa comportamental.",
    status: hit ? "unlocked" : "progress",
    bonusXp: 8,
  };
}

function getNoMissTrigger(data: AppData, date: Date): BehaviorRewardTrigger {
  const since = subDays(date, 21);
  const hasMiss = data.dayEvents.some(
    (event) => event.status === "missed" && parseISO(event.date).getTime() >= since.getTime(),
  );
  const hasTraining = data.sessions.some(
    (session) => session.status === "completed" && parseISO(session.date).getTime() >= since.getTime(),
  );

  return {
    id: "three-weeks",
    title: "3 semanas sem falta",
    description:
      !hasMiss && hasTraining
        ? "Três semanas limpas. Consistência virou moeda."
        : "Complete 3 semanas sem falta registrada.",
    status: !hasMiss && hasTraining ? "unlocked" : "progress",
    bonusXp: 12,
  };
}

function getCheckinTrigger(data: AppData, date: Date): BehaviorRewardTrigger {
  const onTime =
    data.bodyCheckins.length > 0 &&
    daysUntilNextCheckin(data.bodyCheckins, data.profile.startedAt, date) > 0;

  return {
    id: "checkin-on-time",
    title: "Check-in em dia",
    description: onTime
      ? "Check-in salvo dentro da janela. Boa manutenção do painel."
      : "Faça o check-in de 15 dias para manter leitura de peso e recuperação.",
    status: onTime ? "unlocked" : "progress",
    bonusXp: 3,
  };
}

function getLoadIncreaseTrigger(data: AppData, date: Date): BehaviorRewardTrigger {
  const since = subDays(date, 14);
  const best = new Map<string, number>();
  let recentIncrease = false;

  [...data.sessions]
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .forEach((session) => {
      session.exercises.forEach((exercise) => {
        const maxWeight = Math.max(...exercise.sets.map((set) => set.weightKg ?? 0), 0);
        const previous = best.get(exercise.exerciseId) ?? 0;
        if (maxWeight > previous) {
          best.set(exercise.exerciseId, maxWeight);
          if (parseISO(session.date).getTime() >= since.getTime()) {
            recentIncrease = true;
          }
        }
      });
    });

  return {
    id: "recent-load",
    title: "Subida de carga recente",
    description: recentIncrease
      ? "Você subiu carga nos últimos 14 dias. Recompensa boa para reforçar execução."
      : "Suba carga com técnica em um exercício-chave para liberar este gatilho.",
    status: recentIncrease ? "unlocked" : "progress",
    bonusXp: 5,
  };
}
