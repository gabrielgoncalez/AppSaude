import { differenceInCalendarDays, parseISO } from "date-fns";
import type { AppData, BodyCheckin, BodyMetricDiff } from "../types/appData";
import type { TrainingSession } from "../types/training";

export type BodyRouteStatus =
  | "on_track"
  | "slow_but_positive"
  | "stalled"
  | "off_track"
  | "insufficient_data";

export type BodyRouteReading = {
  status: BodyRouteStatus;
  title: string;
  message: string;
  diff?: BodyMetricDiff;
};

export function isQuickCheckinDue(
  checkins: BodyCheckin[],
  startedAt: string,
  today = new Date(),
): boolean {
  const latest = getLatestCheckin(checkins);
  const reference = latest?.date ?? startedAt;
  return differenceInCalendarDays(today, parseISO(reference)) >= 15;
}

export function isFullMeasurementDue(
  checkins: BodyCheckin[],
  startedAt: string,
  today = new Date(),
): boolean {
  const latest = getLatestFullCheckin(checkins);
  const reference = latest?.date ?? startedAt;
  return differenceInCalendarDays(today, parseISO(reference)) >= 30;
}

export function compareBodyMetrics(
  current: BodyCheckin,
  previous: BodyCheckin,
): BodyMetricDiff {
  return {
    weightKg: diff(current.weightKg, previous.weightKg),
    waistNavelCm: diff(current.waistNavelCm ?? current.waistCm, previous.waistNavelCm ?? previous.waistCm),
    abdomenWidestCm: diff(current.abdomenWidestCm, previous.abdomenWidestCm),
    hipCm: diff(current.hipCm, previous.hipCm),
    chestCm: diff(current.chestCm, previous.chestCm),
    rightArmCm: diff(current.rightArmCm, previous.rightArmCm),
    leftArmCm: diff(current.leftArmCm, previous.leftArmCm),
    rightThighCm: diff(current.rightThighCm, previous.rightThighCm),
    leftThighCm: diff(current.leftThighCm, previous.leftThighCm),
    rightCalfCm: diff(current.rightCalfCm, previous.rightCalfCm),
    leftCalfCm: diff(current.leftCalfCm, previous.leftCalfCm),
  };
}

export function getBodyRouteStatus(data: AppData): BodyRouteReading {
  const sorted = [...data.bodyCheckins].sort(
    (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime(),
  );

  if (sorted.length < 2) {
    return {
      status: "insufficient_data",
      title: "Dados iniciais",
      message: "Faça pelo menos 2 check-ins com cintura/abdômen para eu ler sua rota corporal.",
    };
  }

  const previous = sorted.at(-2);
  const current = sorted.at(-1);
  if (!previous || !current) {
    return {
      status: "insufficient_data",
      title: "Dados iniciais",
      message: "Ainda falta histórico corporal.",
    };
  }

  const diffResult = compareBodyMetrics(current, previous);
  const waistDiff = diffResult.waistNavelCm ?? diffResult.abdomenWidestCm;
  const strengthTrend = getStrengthTrend(data.sessions);

  if ((waistDiff ?? 0) < -1 && strengthTrend >= 0) {
    return {
      status: "on_track",
      title: "Na rota",
      message: "Cintura/abdômen caindo e força estável ou subindo. Recomposição muito boa.",
      diff: diffResult,
    };
  }

  if ((waistDiff ?? 0) <= 0 && strengthTrend >= 0) {
    return {
      status: "slow_but_positive",
      title: "Lento, mas positivo",
      message: "As medidas estão estáveis ou levemente melhores. Continue sem mexer demais.",
      diff: diffResult,
    };
  }

  if ((waistDiff ?? 0) > 1 && strengthTrend < 0) {
    return {
      status: "off_track",
      title: "Fora da rota",
      message: "Medida central subiu e treino perdeu força. Ajuste consistência antes de inventar treino novo.",
      diff: diffResult,
    };
  }

  return {
    status: "stalled",
    title: "Estagnado",
    message: "Mudança pequena no corpo. Use mais 15-30 dias de dados antes de trocar o plano.",
    diff: diffResult,
  };
}

export function getLatestCheckin(checkins: BodyCheckin[]): BodyCheckin | undefined {
  return [...checkins].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
}

export function getLatestFullCheckin(checkins: BodyCheckin[]): BodyCheckin | undefined {
  return [...checkins]
    .filter((checkin) => checkin.type === "full_30d")
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
}

function diff(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined) {
    return undefined;
  }
  return Number((current - previous).toFixed(1));
}

function getStrengthTrend(sessions: TrainingSession[]): number {
  const completed = sessions
    .filter((session) => session.status === "completed" && session.workoutId.startsWith("treino-"))
    .slice(-4);
  if (completed.length < 2) {
    return 0;
  }

  const first = sessionMax(completed[0]);
  const last = sessionMax(completed.at(-1));
  return last - first;
}

function sessionMax(session?: TrainingSession): number {
  if (!session) {
    return 0;
  }

  return Math.max(
    ...session.exercises.flatMap((exercise) =>
      exercise.sets.map((set) => set.weightKg ?? 0),
    ),
    0,
  );
}
