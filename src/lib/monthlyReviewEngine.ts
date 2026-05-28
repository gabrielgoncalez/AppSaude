import { format, parseISO } from "date-fns";
import type { AppData, MonthlyReview } from "../types/appData";
import { getBodyRouteStatus } from "./bodyMetricsEngine";
import { getMonthlyCommitmentSummary } from "./penaltyEngine";

export function buildMonthlyReview(
  data: AppData,
  date = new Date(),
): MonthlyReview {
  const month = format(date, "yyyy-MM");
  const sessions = data.sessions.filter((session) => format(parseISO(session.date), "yyyy-MM") === month);
  const dayEvents = data.dayEvents.filter((event) => format(parseISO(event.date), "yyyy-MM") === month);
  const body = getBodyRouteStatus(data);
  const commitment = getMonthlyCommitmentSummary(data, date);
  const recommendation = getRecommendation(body.status, commitment.score);

  return {
    id: `review-${month}`,
    month,
    workoutsCompleted: sessions.filter((session) => session.status === "completed").length,
    strengthSessions: sessions.filter((session) => session.workoutId.startsWith("treino-")).length,
    boxingSessions: sessions.filter((session) => session.workoutId === "boxe").length,
    basketballSessions: sessions.filter((session) => session.workoutId === "basquete-handles").length,
    danceSessions: sessions.filter((session) => session.workoutId === "danca").length,
    missedWorkouts: dayEvents.filter((event) => event.status === "missed").length,
    recoveryRests: dayEvents.filter((event) => event.status === "recovery_rest").length,
    commitmentScore: commitment.score,
    bodyChanges: body.diff ?? {},
    keyExerciseProgress: [],
    technicalProgress: [],
    recommendation,
    message: getMessage(recommendation),
  };
}

function getRecommendation(
  bodyStatus: ReturnType<typeof getBodyRouteStatus>["status"],
  commitmentScore: number,
): MonthlyReview["recommendation"] {
  if (commitmentScore < 65) {
    return "review_phase";
  }
  if (bodyStatus === "on_track" || bodyStatus === "slow_but_positive") {
    return "keep_plan";
  }
  if (bodyStatus === "stalled") {
    return "small_adjustment";
  }
  return "review_phase";
}

function getMessage(recommendation: MonthlyReview["recommendation"]): string {
  if (recommendation === "keep_plan") {
    return "Você está evoluindo. Não precisa mudar o treino agora.";
  }
  if (recommendation === "small_adjustment") {
    return "Ajuste pequeno em um ponto travado, sem desmontar o plano.";
  }
  if (recommendation === "new_phase") {
    return "Fase concluída. Pode planejar um novo bloco.";
  }
  return "Revise consistência e recuperação antes de trocar exercícios.";
}
