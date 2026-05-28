import { addDays, isBefore, parseISO, subDays } from "date-fns";
import type { AppData, DayEvent, ScheduleState } from "../types/appData";
import type { TrainingPlan, Workout } from "../types/training";
import { getWorkoutForDate } from "./dates";
import { dayKey, getPenaltyFor } from "./penalties";

const RESOLVED_STATUSES = new Set<DayEvent["status"]>([
  "completed",
  "recovery_rest",
  "missed",
  "planned_rest",
]);

export function getCycleWorkouts(plan: TrainingPlan): Workout[] {
  return [...plan.workouts]
    .filter((workout) => workout.type !== "rest")
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function createInitialSchedule(
  plan: TrainingPlan,
  date: Date | string = new Date(),
): ScheduleState {
  const currentDate = toDate(date);
  const cycleWorkouts = getCycleWorkouts(plan);
  const fixedWorkout = getWorkoutForDate(plan, currentDate);
  const activeWorkout =
    fixedWorkout.type !== "rest" ? fixedWorkout : cycleWorkouts[0] ?? fixedWorkout;

  return {
    activeWorkoutId: activeWorkout.id,
    activeDate: dayKey(currentDate),
    lastResolvedDate: dayKey(subDays(currentDate, 1)),
    cycleOrder: cycleWorkouts.map((workout) => workout.id),
    hasDebtAlert: false,
    updatedAt: currentDate.toISOString(),
    todayWorkoutId: activeWorkout.id,
    todayStatus: "selected",
    todayDate: dayKey(currentDate),
    revision: 1,
  };
}

export function ensureSchedule(data: AppData, date: Date | string = new Date()): AppData {
  const maybeData = data as AppData & Partial<Pick<AppData, "schedule" | "dayEvents">>;
  const schedule =
    maybeData.schedule ?? createInitialSchedule(maybeData.trainingPlan, toDate(date));
  const normalizedSchedule = normalizeScheduleState(
    maybeData.trainingPlan,
    schedule,
    toDate(date),
  );

  if (
    maybeData.schedule &&
    maybeData.dayEvents &&
    schedulesEqual(maybeData.schedule, normalizedSchedule)
  ) {
    return data;
  }

  return {
    ...maybeData,
    schedule: normalizedSchedule,
    dayEvents: maybeData.dayEvents ?? [],
  };
}

export function getDayEvent(
  data: AppData,
  date: Date | string = new Date(),
): DayEvent | undefined {
  const key = dayKey(date);
  const scheduleDate = data.schedule?.todayDate ?? data.schedule?.activeDate ?? date;
  const safeData = ensureSchedule(data, scheduleDate);
  const currentScheduleEvent = getScheduleDayEvent(safeData, key);
  if (currentScheduleEvent) {
    return currentScheduleEvent;
  }

  return getStoredDayEvent(safeData, key);
}

export function getTodayWorkout(
  data: AppData,
  date: Date | string = new Date(),
): Workout {
  const safeData = ensureSchedule(data, date);
  const key = dayKey(date);
  const currentScheduleWorkoutId =
    key === safeData.schedule.todayDate
      ? safeData.schedule.todayWorkoutId
      : safeData.schedule.activeWorkoutId;
  const scheduledWorkout = safeData.trainingPlan.workouts.find(
    (workout) => workout.id === currentScheduleWorkoutId,
  );
  const historicalEvent = key === safeData.schedule.todayDate
    ? undefined
    : getStoredDayEvent(safeData, key);
  const eventWorkout = historicalEvent
    ? safeData.trainingPlan.workouts.find((workout) => workout.id === historicalEvent.workoutId)
    : undefined;
  const fixedWorkout = getWorkoutForDate(safeData.trainingPlan, toDate(date));

  return (
    eventWorkout ??
    scheduledWorkout ??
    getCycleWorkouts(safeData.trainingPlan)[0] ??
    fixedWorkout
  );
}

export function getNextCycleWorkout(data: AppData): Workout {
  const safeData = ensureSchedule(data);
  return getNextCycleWorkoutAfter(safeData, safeData.schedule.activeWorkoutId);
}

export function getNextCycleWorkoutAfter(data: AppData, workoutId: string): Workout {
  const safeData = ensureSchedule(data);
  const cycleWorkouts = getOrderedCycleWorkouts(safeData.trainingPlan, safeData.schedule);
  if (cycleWorkouts.length === 0) {
    return safeData.trainingPlan.workouts[0];
  }

  const activeIndex = cycleWorkouts.findIndex(
    (workout) => workout.id === workoutId,
  );
  const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % cycleWorkouts.length : 0;
  return cycleWorkouts[nextIndex];
}

export function selectWorkoutForToday(
  data: AppData,
  workoutId: string,
  date: Date | string = new Date(),
): AppData {
  const safeData = ensureSchedule(data, date);
  const currentDate = toDate(date);
  const workout = findWorkoutOrCurrent(safeData, workoutId, currentDate);
  const existing = getStoredDayEvent(safeData, dayKey(currentDate));
  const revision = getNextRevision(safeData.schedule);
  const event = createDayEvent({
    existing,
    date: currentDate,
    workout,
    status: "selected",
    penaltyXp: 0,
    manualSelection: true,
    scheduleRevision: revision,
    reason: "Treino escolhido manualmente para hoje.",
  });

  return {
    ...safeData,
    schedule: {
      ...safeData.schedule,
      activeWorkoutId: workout.id,
      activeDate: dayKey(currentDate),
      todayWorkoutId: workout.id,
      todayStatus: "selected",
      todayDate: dayKey(currentDate),
      cycleOrder: reconcileCycleOrder(safeData.trainingPlan, safeData.schedule),
      revision,
      updatedAt: currentDate.toISOString(),
    },
    dayEvents: upsertDayEvent(safeData.dayEvents, event),
  };
}

export function completeWorkoutDay(
  data: AppData,
  workout: Workout,
  date: Date | string = new Date(),
): AppData {
  const safeData = ensureSchedule(data, date);
  const currentDate = toDate(date);
  const existing = getStoredDayEvent(safeData, dayKey(currentDate));
  const revision = getNextRevision(safeData.schedule);
  const nextWorkout = getNextCycleWorkout({
    ...safeData,
    schedule: { ...safeData.schedule, activeWorkoutId: workout.id },
  });
  const event = createDayEvent({
    existing,
    date: currentDate,
    workout,
    status: "completed",
    penaltyXp: 0,
    manualSelection: existing?.manualSelection ?? false,
    scheduleRevision: revision,
    reason: "Missao concluida.",
  });

  return {
    ...safeData,
    schedule: {
      ...safeData.schedule,
      activeWorkoutId: nextWorkout.id,
      activeDate: dayKey(currentDate),
      todayWorkoutId: workout.id,
      todayStatus: "completed",
      todayDate: dayKey(currentDate),
      cycleOrder: reconcileCycleOrder(safeData.trainingPlan, safeData.schedule),
      hasDebtAlert: false,
      revision,
      updatedAt: currentDate.toISOString(),
    },
    dayEvents: upsertDayEvent(safeData.dayEvents, event),
  };
}

export function markRecoveryRest(
  data: AppData,
  date: Date | string = new Date(),
): AppData {
  const safeData = ensureSchedule(data, date);
  const currentDate = toDate(date);
  const workout = getTodayWorkout(safeData, currentDate);
  const existing = getStoredDayEvent(safeData, dayKey(currentDate));
  const revision = getNextRevision(safeData.schedule);
  const penaltyXp = getPenaltyFor("recovery_rest", safeData.dayEvents, currentDate);
  const event = createDayEvent({
    existing,
    date: currentDate,
    workout,
    status: "recovery_rest",
    penaltyXp,
    penaltyKind: "recovery_rest",
    manualSelection: existing?.manualSelection ?? false,
    scheduleRevision: revision,
    reason: "Descanso de recuperacao escolhido.",
  });

  return {
    ...safeData,
    schedule: {
      ...safeData.schedule,
      activeDate: dayKey(currentDate),
      todayWorkoutId: workout.id,
      todayStatus: "recovery_rest",
      todayDate: dayKey(currentDate),
      cycleOrder: reconcileCycleOrder(safeData.trainingPlan, safeData.schedule),
      revision,
      updatedAt: currentDate.toISOString(),
    },
    dayEvents: upsertDayEvent(safeData.dayEvents, event),
  };
}

export function resolvePendingDays(
  data: AppData,
  date: Date | string = new Date(),
): { data: AppData; changed: boolean } {
  const currentDate = toDate(date);
  let nextData = ensureSchedule(data, currentDate);

  if (!nextData.settings.onboardingDone) {
    return { data: nextData, changed: nextData !== data };
  }

  let changed = nextData !== data;
  let cursor = addDays(parseISO(nextData.schedule.lastResolvedDate), 1);
  const today = parseISO(dayKey(currentDate));

  while (isBefore(cursor, today)) {
    const existing = getDayEvent(nextData, cursor);
    if (existing && RESOLVED_STATUSES.has(existing.status)) {
      cursor = addDays(cursor, 1);
      continue;
    }

    const fixedWorkout = getWorkoutForDate(nextData.trainingPlan, cursor);
    if (fixedWorkout.type === "rest" && !existing?.manualSelection) {
      nextData = applyPlannedRest(nextData, fixedWorkout, cursor);
      changed = true;
      cursor = addDays(cursor, 1);
      continue;
    }

    const workout = existing?.manualSelection
      ? findWorkoutOrCurrent(nextData, existing.workoutId, cursor)
      : getTodayWorkout(nextData, cursor);
    nextData = applyMissedDay(nextData, workout, cursor, existing);
    changed = true;
    cursor = addDays(cursor, 1);
  }

  const lastResolvedDate = dayKey(subDays(currentDate, 1));
  if (nextData.schedule.lastResolvedDate !== lastResolvedDate) {
    nextData = {
      ...nextData,
      schedule: {
        ...nextData.schedule,
        lastResolvedDate,
        updatedAt: currentDate.toISOString(),
      },
    };
    changed = true;
  }

  return { data: nextData, changed };
}

function applyMissedDay(
  data: AppData,
  workout: Workout,
  date: Date,
  existing?: DayEvent,
): AppData {
  const penaltyXp = getPenaltyFor("missed", data.dayEvents, date);
  const event = createDayEvent({
    existing,
    date,
    workout,
    status: "missed",
    penaltyXp,
    penaltyKind: "missed",
    manualSelection: existing?.manualSelection ?? false,
    reason: "Treino pendente nao foi concluido.",
  });

  return {
    ...data,
    schedule: {
      ...data.schedule,
      hasDebtAlert: true,
      updatedAt: date.toISOString(),
    },
    dayEvents: upsertDayEvent(data.dayEvents, event),
  };
}

function applyPlannedRest(data: AppData, workout: Workout, date: Date): AppData {
  const event = createDayEvent({
    date,
    workout,
    status: "planned_rest",
    penaltyXp: 0,
    manualSelection: false,
    reason: "Descanso planejado.",
  });

  return {
    ...data,
    schedule: {
      ...data.schedule,
      updatedAt: date.toISOString(),
    },
    dayEvents: upsertDayEvent(data.dayEvents, event),
  };
}

function createDayEvent({
  existing,
  date,
  workout,
  status,
  penaltyXp,
  penaltyKind,
  manualSelection,
  scheduleRevision,
  reason,
}: {
  existing?: DayEvent;
  date: Date;
  workout: Workout;
  status: DayEvent["status"];
  penaltyXp: number;
  penaltyKind?: DayEvent["penaltyKind"];
  manualSelection: boolean;
  scheduleRevision?: number;
  reason?: string;
}): DayEvent {
  const now = new Date().toISOString();
  return {
    id: dayKey(date),
    date: dayKey(date),
    workoutId: workout.id,
    workoutName: workout.name,
    status,
    scheduleRevision,
    penaltyXp,
    penaltyKind,
    reason,
    manualSelection,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function upsertDayEvent(dayEvents: DayEvent[], event: DayEvent): DayEvent[] {
  const exists = dayEvents.some((candidate) => candidate.id === event.id);
  const next = exists
    ? dayEvents.map((candidate) => (candidate.id === event.id ? event : candidate))
    : [...dayEvents, event];

  return next.sort((a, b) => a.date.localeCompare(b.date));
}

function findWorkoutOrCurrent(
  data: AppData,
  workoutId: string,
  date: Date,
): Workout {
  return (
    data.trainingPlan.workouts.find((workout) => workout.id === workoutId) ??
    getTodayWorkout(data, date)
  );
}

function getStoredDayEvent(data: AppData, key: string): DayEvent | undefined {
  return data.dayEvents.find((item) => item.date === key);
}

function getScheduleDayEvent(data: AppData, key: string): DayEvent | undefined {
  if (data.schedule.todayDate !== key) {
    return undefined;
  }

  const workout = data.trainingPlan.workouts.find(
    (item) => item.id === data.schedule.todayWorkoutId,
  );
  if (!workout) {
    return undefined;
  }

  const stored = getStoredDayEvent(data, key);
  const storedMatchesCurrentSchedule =
    stored?.workoutId === workout.id &&
    stored.status === data.schedule.todayStatus &&
    (stored.scheduleRevision === undefined ||
      stored.scheduleRevision === data.schedule.revision);

  if (storedMatchesCurrentSchedule) {
    return stored;
  }

  return {
    id: key,
    date: key,
    workoutId: workout.id,
    workoutName: workout.name,
    status: data.schedule.todayStatus,
    scheduleRevision: data.schedule.revision,
    penaltyXp: 0,
    manualSelection: data.schedule.todayStatus === "selected",
    createdAt: data.schedule.updatedAt,
    updatedAt: data.schedule.updatedAt,
  };
}

function getNextRevision(schedule: ScheduleState): number {
  return (schedule.revision ?? 0) + 1;
}

function normalizeScheduleState(
  plan: TrainingPlan,
  schedule: ScheduleState,
  date: Date,
): ScheduleState {
  const key = dayKey(date);
  const cycleOrder = reconcileCycleOrder(plan, schedule);
  const fallbackWorkoutId =
    schedule.activeWorkoutId ??
    cycleOrder[0] ??
    plan.workouts.find((workout) => workout.type !== "rest")?.id ??
    plan.workouts[0]?.id ??
    "";
  const isSameToday = schedule.todayDate === key;
  const missingCurrentFields =
    !schedule.todayWorkoutId || !schedule.todayStatus || !schedule.todayDate;
  const shouldResetToday = !isSameToday || missingCurrentFields;
  const nextRevision =
    schedule.revision === undefined || shouldResetToday
      ? (schedule.revision ?? 0) + 1
      : schedule.revision;
  const updatedAt =
    shouldResetToday || !arraysEqual(schedule.cycleOrder, cycleOrder)
      ? date.toISOString()
      : schedule.updatedAt;

  return {
    ...schedule,
    activeWorkoutId: fallbackWorkoutId,
    activeDate: shouldResetToday ? key : (schedule.activeDate ?? key),
    lastResolvedDate: schedule.lastResolvedDate ?? dayKey(subDays(date, 1)),
    cycleOrder,
    hasDebtAlert: schedule.hasDebtAlert ?? false,
    updatedAt,
    todayWorkoutId: shouldResetToday
      ? fallbackWorkoutId
      : (schedule.todayWorkoutId ?? fallbackWorkoutId),
    todayStatus: shouldResetToday ? "selected" : (schedule.todayStatus ?? "selected"),
    todayDate: shouldResetToday ? key : (schedule.todayDate ?? key),
    revision: nextRevision,
  };
}

function reconcileCycleOrder(plan: TrainingPlan, schedule: ScheduleState): string[] {
  const currentIds = getCycleWorkouts(plan).map((workout) => workout.id);
  const preserved = (schedule.cycleOrder ?? []).filter((id) => currentIds.includes(id));
  const missing = currentIds.filter((id) => !preserved.includes(id));
  return [...preserved, ...missing];
}

function getOrderedCycleWorkouts(plan: TrainingPlan, schedule: ScheduleState): Workout[] {
  const fallback = getCycleWorkouts(plan);
  const ordered = schedule.cycleOrder
    .map((id) => plan.workouts.find((workout) => workout.id === id))
    .filter((workout): workout is Workout => Boolean(workout));

  return ordered.length ? ordered : fallback;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function schedulesEqual(left: ScheduleState, right: ScheduleState): boolean {
  return (
    left.activeWorkoutId === right.activeWorkoutId &&
    left.activeDate === right.activeDate &&
    left.lastResolvedDate === right.lastResolvedDate &&
    arraysEqual(left.cycleOrder, right.cycleOrder) &&
    left.hasDebtAlert === right.hasDebtAlert &&
    left.updatedAt === right.updatedAt &&
    left.todayWorkoutId === right.todayWorkoutId &&
    left.todayStatus === right.todayStatus &&
    left.todayDate === right.todayDate &&
    left.revision === right.revision
  );
}

function toDate(date: Date | string): Date {
  return date instanceof Date ? date : parseISO(date);
}
