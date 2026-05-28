import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import type { AppData } from "../types/appData";
import type { TrainingSession } from "../types/training";

export type TrainingInsight = {
  id: string;
  title: string;
  message: string;
  tone: "info" | "warning" | "success";
};

export function getTrainingInsights(
  data: AppData,
  date = new Date(),
): TrainingInsight[] {
  const completed = [...data.sessions]
    .filter((session) => session.status === "completed")
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  const insights: TrainingInsight[] = [];

  const lastStrength = completed.find(isStrengthSession);
  if (!lastStrength) {
    insights.push({
      id: "start-strength",
      title: "Primeira base",
      message: "Registre 2 treinos de musculação para eu começar a ler sua frequência.",
      tone: "info",
    });
  } else {
    const daysWithoutStrength = differenceInCalendarDays(date, parseISO(lastStrength.date));
    if (daysWithoutStrength >= 5) {
      insights.push({
        id: "strength-delay",
        title: "Muito tempo sem musculação",
        message: `Última musculação foi há ${daysWithoutStrength} dias. Se estiver bem, volte para o treino do ciclo.`,
        tone: "warning",
      });
    }
  }

  if (hasHeavySequence(completed, date)) {
    insights.push({
      id: "heavy-sequence",
      title: "Sequência pesada",
      message: "Você acumulou treinos próximos. Hoje pode ser um bom dia para técnica limpa ou descanso consciente.",
      tone: "warning",
    });
  }

  const recentMiss = data.dayEvents.some(
    (event) =>
      event.status === "missed" &&
      parseISO(event.date).getTime() >= subDays(date, 7).getTime(),
  );
  if (recentMiss) {
    insights.push({
      id: "miss-rebound",
      title: "Retomada",
      message: "Teve falta recente. Um treino concluído hoje limpa o alerta visual e recoloca o ciclo no trilho.",
      tone: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "steady",
      title: "Ritmo controlado",
      message: "Agenda sem alerta forte. Execute a missão de hoje e deixe o ciclo avançar.",
      tone: "success",
    });
  }

  return insights;
}

function isStrengthSession(session: TrainingSession): boolean {
  return session.workoutId.startsWith("treino-");
}

function hasHeavySequence(sessions: TrainingSession[], date: Date): boolean {
  const recent = sessions.filter(
    (session) => parseISO(session.date).getTime() >= subDays(date, 3).getTime(),
  );
  const recentStrength = recent.filter(isStrengthSession);
  const lastTwo = sessions.slice(0, 2);

  return recent.length >= 3 || lastTwo.length === 2 && lastTwo.every(isStrengthSession) ||
    recentStrength.length >= 2;
}
