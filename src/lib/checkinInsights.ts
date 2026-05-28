import { parseISO, subDays } from "date-fns";
import type { AppData, BodyCheckin } from "../types/appData";

export type CheckinRecommendation =
  | "manter"
  | "apertar um pouco"
  | "reduzir volume"
  | "observar recuperação";

export type CheckinInsight = {
  recommendation: CheckinRecommendation;
  weightDiffKg: number;
  sessions15d: number;
  strength15d: number;
  message: string;
};

export function buildCheckinInsight(
  data: AppData,
  checkin: BodyCheckin,
  date = new Date(checkin.date),
): CheckinInsight {
  const previous = [...data.bodyCheckins]
    .filter((candidate) => candidate.id !== checkin.id)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
  const previousWeight = previous?.weightKg ?? data.profile.startWeightKg;
  const weightDiffKg = checkin.weightKg - previousWeight;
  const since = subDays(date, 15);
  const recentSessions = data.sessions.filter(
    (session) => parseISO(session.date).getTime() >= since.getTime(),
  );
  const strength15d = recentSessions.filter((session) =>
    session.workoutId.startsWith("treino-"),
  ).length;
  const recommendation = getRecommendation(checkin, recentSessions.length, strength15d);

  return {
    recommendation,
    weightDiffKg,
    sessions15d: recentSessions.length,
    strength15d,
    message: getMessage(recommendation, weightDiffKg, recentSessions.length, strength15d),
  };
}

function getRecommendation(
  checkin: BodyCheckin,
  sessions15d: number,
  strength15d: number,
): CheckinRecommendation {
  if (checkin.dizziness || checkin.jointPain || (checkin.soreness ?? 0) >= 5) {
    return "observar recuperação";
  }

  if ((checkin.energy ?? 3) <= 2 || (checkin.sleep ?? 3) <= 2 || sessions15d >= 11) {
    return "reduzir volume";
  }

  if (
    (checkin.energy ?? 3) >= 4 &&
    (checkin.sleep ?? 3) >= 4 &&
    (checkin.hunger ?? 3) <= 3 &&
    strength15d >= 5
  ) {
    return "apertar um pouco";
  }

  return "manter";
}

function getMessage(
  recommendation: CheckinRecommendation,
  weightDiffKg: number,
  sessions15d: number,
  strength15d: number,
): string {
  const weightLabel =
    weightDiffKg === 0
      ? "peso estável"
      : weightDiffKg > 0
        ? `peso subiu ${weightDiffKg.toFixed(1)} kg`
        : `peso caiu ${Math.abs(weightDiffKg).toFixed(1)} kg`;

  if (recommendation === "apertar um pouco") {
    return `${weightLabel}, ${sessions15d} treinos e boa energia. Dá para buscar uma repetição extra ou uma tentativa controlada.`;
  }

  if (recommendation === "reduzir volume") {
    return `${weightLabel}, ${sessions15d} treinos em 15 dias. Segure volume e preserve execução limpa.`;
  }

  if (recommendation === "observar recuperação") {
    return `${weightLabel}. Sintoma ou fadiga alta apareceu; mantenha técnica, reduza pressa e observe recuperação.`;
  }

  return `${weightLabel}, ${strength15d}/6 musculações. Mantenha o plano e deixe a Onda trabalhar.`;
}
