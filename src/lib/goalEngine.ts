import type { AppData, BodyGoal } from "../types/appData";
import { getLatestCheckin } from "./bodyMetricsEngine";

export type BodyGoalReading = {
  goal: BodyGoal;
  currentValue?: number;
  remaining?: number;
  status: "missing_data" | "on_track" | "behind" | "done";
};

export function getBodyGoalReadings(data: AppData): BodyGoalReading[] {
  const latest = getLatestCheckin(data.bodyCheckins);

  return (data.bodyGoals ?? []).map((goal) => {
    const currentValue = latest ? getMetricValue(latest, goal.metric) : undefined;
    if (currentValue === undefined) {
      return { goal, status: "missing_data" };
    }

    const remaining = Number((goal.targetValue - currentValue).toFixed(1));
    const done =
      goal.direction === "decrease"
        ? currentValue <= goal.targetValue
        : goal.direction === "increase"
          ? currentValue >= goal.targetValue
          : Math.abs(currentValue - goal.targetValue) <= 0.5;

    return {
      goal,
      currentValue,
      remaining,
      status: done ? "done" : "on_track",
    };
  });
}

function getMetricValue(
  checkin: NonNullable<ReturnType<typeof getLatestCheckin>>,
  metric: BodyGoal["metric"],
): number | undefined {
  if (metric === "weightKg") {
    return checkin.weightKg;
  }
  return checkin[metric];
}
