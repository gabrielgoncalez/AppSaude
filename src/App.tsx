import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import type { ViewId } from "./components/BottomNav";
import { DEFAULT_ACHIEVEMENTS } from "./data/achievements";
import { LoginPage } from "./features/auth/LoginPage";
import { BackupPage } from "./features/backup/BackupPage";
import { CheckinPage } from "./features/checkins/CheckinPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { PlanPage } from "./features/plan/PlanPage";
import { ProgressPage } from "./features/progress/ProgressPage";
import { RewardsPage } from "./features/rewards/RewardsPage";
import { PostWorkoutSummary } from "./features/today/PostWorkoutSummary";
import { TodayWorkoutPage } from "./features/today/TodayWorkoutPage";
import { buildCheckinInsight, type CheckinInsight } from "./lib/checkinInsights";
import { isSessionToday } from "./lib/dates";
import {
  calculateSessionXp,
  claimReward,
  getAvailableXp,
  undoClaimReward,
} from "./lib/gamification";
import {
  completeWorkoutDay,
  createInitialSchedule,
  ensureSchedule,
  getDayEvent,
  getNextCycleWorkout,
  getNextCycleWorkoutAfter,
  getTodayWorkout,
  markRecoveryRest,
  resolvePendingDays,
  selectWorkoutForToday,
} from "./lib/schedule";
import { buildWorkoutSummary, type WorkoutSummary } from "./lib/postWorkout";
import { getPrBonus } from "./lib/progressionEngine";
import { getTodayPrescription } from "./lib/prescriptionEngine";
import { normalizeAppDataForWave } from "./lib/trainingPlan";
import {
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  type AuthUser,
} from "./services/authService";
import {
  clearProgressData,
  ensureUserData,
  replaceAppData,
  resetAppData,
  saveAppData,
  saveDerivedAppData,
  subscribeToAppData,
} from "./services/cloudDb";
import type { AppData, BodyCheckin } from "./types/appData";
import type { Reward } from "./types/rewards";
import type {
  Exercise,
  ExerciseLog,
  SetLog,
  SkillWorkoutMetrics,
  TrainingPlan,
  TrainingSession,
  Workout,
} from "./types/training";

const routes: Record<ViewId, string> = {
  hoje: "/",
  plano: "/plano",
  evolucao: "/evolucao",
  recompensas: "/recompensas",
  backup: "/backup",
};

function viewFromPath(pathname: string): ViewId | "checkin" {
  if (pathname.startsWith("/plano")) {
    return "plano";
  }
  if (pathname.startsWith("/evolucao")) {
    return "evolucao";
  }
  if (pathname.startsWith("/recompensas")) {
    return "recompensas";
  }
  if (pathname.startsWith("/backup")) {
    return "backup";
  }
  if (pathname.startsWith("/checkin")) {
    return "checkin";
  }
  return "hoje";
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<AppData | undefined>();
  const [view, setView] = useState<ViewId | "checkin">(() =>
    viewFromPath(window.location.pathname),
  );
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | undefined>();
  const [checkinInsight, setCheckinInsight] = useState<CheckinInsight | undefined>();
  const suppressCloudSyncRef = useRef(false);
  const pendingWriteRef = useRef<{ data: AppData; until: number } | undefined>(
    undefined,
  );

  useEffect(() => {
    return subscribeAuth(
      (user) => {
        setAuthUser(user);
        setAuthLoading(false);
        setError("");
        if (!user) {
          setData(undefined);
          setDataLoading(false);
        } else {
          setData(undefined);
          setDataLoading(true);
        }
      },
      (reason) => {
        setError(reason.message);
        setAuthLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    ensureUserData(authUser.uid)
      .then(() => {
        if (cancelled) {
          return;
        }

        unsubscribe = subscribeToAppData(
          authUser.uid,
          (next) => {
            if (suppressCloudSyncRef.current) {
              return;
            }
            const before = next;
            const normalized = normalizeAppDataForWave(next);
            const resolved = resolvePendingDays(normalized.data);
            const pendingWrite = pendingWriteRef.current;
            if (
              pendingWrite &&
              Date.now() < pendingWrite.until &&
              isCloudSnapshotOlderThanPending(resolved.data, pendingWrite.data)
            ) {
              return;
            }
            if (
              pendingWrite &&
              !isCloudSnapshotOlderThanPending(resolved.data, pendingWrite.data)
            ) {
              pendingWriteRef.current = undefined;
            }
            setData(resolved.data);
            setDataLoading(false);
            if (normalized.changed || resolved.changed) {
              void saveDerivedAppData(authUser.uid, before, resolved.data).catch((reason: unknown) => {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Erro ao resolver agenda.",
                );
              });
            }
          },
          (reason) => {
            setError(reason.message);
            setDataLoading(false);
          },
        );
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Erro ao carregar dados.");
        setDataLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [authUser]);

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const workout = useMemo(
    () => (data ? getTodayWorkout(data) : undefined),
    [data],
  );
  const dayEvent = useMemo(
    () => (data ? getDayEvent(data) : undefined),
    [data],
  );
  const nextWorkout = useMemo(
    () => {
      if (!data || !workout) {
        return undefined;
      }

      if (dayEvent?.status === "completed") {
        return (
          data.trainingPlan.workouts.find(
            (candidate) => candidate.id === data.schedule.activeWorkoutId,
          ) ?? getNextCycleWorkout(data)
        );
      }

      return getNextCycleWorkoutAfter(data, workout.id);
    },
    [data, dayEvent?.status, workout],
  );

  const todaySession = useMemo(() => {
    if (!data || !workout) {
      return undefined;
    }
    return data.sessions.find(
      (session) => session.workoutId === workout.id && isSessionToday(session),
    );
  }, [data, workout]);

  const todayPrescription = useMemo(
    () => (data && workout ? getTodayPrescription(data, workout) : undefined),
    [data, workout],
  );

  const previousSets = useMemo(() => {
    const map = new Map<string, SetLog>();
    if (!data) {
      return map;
    }

    [...data.sessions]
      .reverse()
      .forEach((session) =>
        session.exercises.forEach((exercise) => {
          if (!map.has(exercise.exerciseId)) {
            const set = [...exercise.sets].reverse().find((item) => item.completed);
            if (set) {
              map.set(exercise.exerciseId, set);
            }
          }
        }),
      );

    return map;
  }, [data]);

  function navigate(next: ViewId | "checkin") {
    const path = next === "checkin" ? "/checkin" : routes[next];
    window.history.pushState({}, "", path);
    setView(next);
  }

  function commit(next: AppData) {
    if (!authUser) {
      return;
    }

    pendingWriteRef.current = { data: next, until: Date.now() + 1500 };
    setData(next);
    void saveAppData(authUser.uid, next).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Erro ao sincronizar dados.");
    }).finally(() => {
      setTimeout(() => {
        if (pendingWriteRef.current?.data === next) {
          pendingWriteRef.current = undefined;
        }
      }, 250);
    });
  }

  async function signIn() {
    setAuthActionLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao entrar com Google.");
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function signOut() {
    setError("");
    await signOutUser();
    navigate("hoje");
  }

  function startJourney() {
    if (!data) {
      return;
    }
    commit(ensureSchedule({
      ...data,
      settings: { ...data.settings, onboardingDone: true },
    }));
  }

  function updateTodaySession(updater: (session: TrainingSession) => TrainingSession) {
    if (!data || !workout) {
      return;
    }

    const current = todaySession ?? createSession(workout);
    const updated = withRecalculatedXp(updater(current));
    const exists = data.sessions.some((session) => session.id === updated.id);
    commit({
      ...data,
      sessions: exists
        ? data.sessions.map((session) => (session.id === updated.id ? updated : session))
        : [...data.sessions, updated],
    });
  }

  function addSet(exercise: Exercise, set: SetLog) {
    setWorkoutSummary(undefined);
    updateTodaySession((session) => ({
      ...session,
      status: "partial",
      exercises: upsertExercise(session.exercises, exercise, (log) => ({
        ...log,
        sets: [...log.sets, set],
        completed:
          [...log.sets, set].filter((candidate) => candidate.completed).length >=
          exercise.targetSets,
      })),
    }));
  }

  function finishExerciseSet(exercise: Exercise, set: SetLog) {
    setWorkoutSummary(undefined);
    updateTodaySession((session) => ({
      ...session,
      status: "partial",
      exercises: upsertExercise(session.exercises, exercise, (log) => ({
        ...log,
        sets: [...log.sets, set],
        completed: true,
      })),
    }));
  }

  function completeWorkout() {
    if (!data || !workout) {
      return;
    }

    const current = todaySession ?? createSession(workout);
    const previousSessions = data.sessions.filter((session) => session.id !== current.id);
    const updated = withRecalculatedXp({
      ...current,
      status: "completed",
    }, previousSessions);
    const exists = data.sessions.some((session) => session.id === updated.id);
    const sessions = exists
      ? data.sessions.map((session) => (session.id === updated.id ? updated : session))
      : [...data.sessions, updated];
    const completedData = completeWorkoutDay({ ...data, sessions }, workout);
    const resolvedNextWorkout =
      completedData.trainingPlan.workouts.find(
        (candidate) => candidate.id === completedData.schedule.activeWorkoutId,
      ) ?? getNextCycleWorkout(completedData);
    const summaryWorkout = todayPrescription?.exercises.length
      ? {
          ...workout,
          exercises: todayPrescription.exercises.map((item) => item.exercise),
        }
      : workout;

    setWorkoutSummary(
      buildWorkoutSummary({
        session: updated,
        previousSessions,
        workout: summaryWorkout,
        nextWorkout: resolvedNextWorkout,
      }),
    );
    commit(completedData);
  }

  function completeSkillWorkout(metrics: SkillWorkoutMetrics) {
    if (!data || !workout) {
      return;
    }

    const current = todaySession ?? createSession(workout);
    const previousSessions = data.sessions.filter((session) => session.id !== current.id);
    const technicalLog = createSkillExerciseLog(workout, metrics);
    const updated = withRecalculatedXp(
      {
        ...current,
        durationMin: metrics.durationMin ?? current.durationMin,
        notes: metrics.notes ?? current.notes,
        status: "completed",
        exercises: [
          ...current.exercises.filter(
            (exercise) => exercise.exerciseId !== technicalLog.exerciseId,
          ),
          technicalLog,
        ],
      },
      previousSessions,
    );
    const exists = data.sessions.some((session) => session.id === updated.id);
    const sessions = exists
      ? data.sessions.map((session) => (session.id === updated.id ? updated : session))
      : [...data.sessions, updated];
    const completedData = completeWorkoutDay({ ...data, sessions }, workout);
    const resolvedNextWorkout =
      completedData.trainingPlan.workouts.find(
        (candidate) => candidate.id === completedData.schedule.activeWorkoutId,
      ) ?? getNextCycleWorkout(completedData);

    setWorkoutSummary(
      buildWorkoutSummary({
        session: updated,
        previousSessions,
        workout,
        nextWorkout: resolvedNextWorkout,
      }),
    );
    commit(completedData);
  }

  function selectTodayWorkout(workoutId: string) {
    if (!data) {
      return;
    }
    setWorkoutSummary(undefined);
    commit(selectWorkoutForToday(data, workoutId));
  }

  function recoveryRest() {
    if (!data) {
      return;
    }
    setWorkoutSummary(undefined);
    commit(markRecoveryRest(data));
  }

  function updatePlan(trainingPlan: TrainingPlan) {
    if (!data) {
      return;
    }
    const history = [
      ...(data.trainingPlanHistory ?? []),
      {
        id: crypto.randomUUID(),
        version: (data.trainingPlanHistory?.length ?? 0) + 1,
        savedAt: new Date().toISOString(),
        reason: "Atualização manual do plano.",
        trainingPlan: data.trainingPlan,
      },
    ].slice(-10);
    commit(ensureSchedule({ ...data, trainingPlan, trainingPlanHistory: history }));
  }

  function saveCheckin(checkin: BodyCheckin) {
    if (!data) {
      return;
    }
    const next = {
      ...data,
      profile: { ...data.profile, currentWeightKg: checkin.weightKg },
      bodyCheckins: [...data.bodyCheckins, checkin],
    };
    setCheckinInsight(buildCheckinInsight(next, checkin));
    commit(next);
    navigate("hoje");
  }

  function createReward(reward: Reward) {
    if (!data) {
      return;
    }
    commit({ ...data, rewards: [...data.rewards, reward] });
  }

  function updateReward(reward: Reward, mode: "claim" | "undo") {
    if (!data) {
      return;
    }
    const availableXp = getAvailableXp(data);
    const updated =
      mode === "claim" ? claimReward(reward, availableXp) : undoClaimReward(reward);
    commit({
      ...data,
      rewards: data.rewards.map((item) => (item.id === reward.id ? updated : item)),
    });
  }

  async function resetAll() {
    if (!authUser) {
      return;
    }

    suppressCloudSyncRef.current = true;
    await resetAppData(authUser.uid);
    setTimeout(() => {
      suppressCloudSyncRef.current = false;
    }, 750);
    navigate("hoje");
  }

  function clearTestData() {
    if (!data || !authUser) {
      return;
    }

    const next = ensureSchedule({
      ...data,
      profile: {
        ...data.profile,
        currentWeightKg: data.profile.startWeightKg,
        startedAt: new Date().toISOString(),
      },
      schedule: createInitialSchedule(data.trainingPlan),
      dayEvents: [],
      sessions: [],
      bodyCheckins: [],
      rewards: data.rewards.map(clearRewardClaim),
      achievements: DEFAULT_ACHIEVEMENTS,
      penaltyEvents: [],
      monthlyReviews: [],
    });
    setWorkoutSummary(undefined);
    setCheckinInsight(undefined);
    setData(next);
    suppressCloudSyncRef.current = true;
    void clearProgressData(authUser.uid, next).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Erro ao limpar testes.");
    }).finally(() => {
      setTimeout(() => {
        suppressCloudSyncRef.current = false;
      }, 750);
    });
    navigate("hoje");
  }

  function importBackup(imported: AppData) {
    if (!authUser) {
      return;
    }

    const next = ensureSchedule(imported);
    setData(next);
    suppressCloudSyncRef.current = true;
    void replaceAppData(authUser.uid, next).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Erro ao importar backup.");
    }).finally(() => {
      setTimeout(() => {
        suppressCloudSyncRef.current = false;
      }, 750);
    });
    navigate("hoje");
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-100">
        Carregando Gigante Ágil...
      </div>
    );
  }

  if (!authUser) {
    return (
      <LoginPage
        error={error}
        loading={authActionLoading}
        onSignIn={() => void signIn()}
      />
    );
  }

  if (dataLoading || !data || !workout || !nextWorkout) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-slate-100">
        Sincronizando seus dados...
      </div>
    );
  }

  if (!data.settings.onboardingDone) {
    return (
      <OnboardingPage
        onSignOut={() => void signOut()}
        onStart={startJourney}
        user={authUser}
      />
    );
  }

  const navView = view === "checkin" ? "hoje" : view;

  return (
    <AppShell
      current={navView}
      onNavigate={navigate}
      onSignOut={() => void signOut()}
      user={authUser}
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-100">
          {error}
        </div>
      ) : null}
      {view === "hoje" ? (
        <div className="space-y-4">
          <DashboardPage
            data={data}
            dayEvent={dayEvent}
            nextWorkout={nextWorkout}
            onOpenCheckin={() => navigate("checkin")}
            onRecoveryRest={recoveryRest}
            onSelectTodayWorkout={selectTodayWorkout}
            checkinInsight={checkinInsight}
            onDismissCheckinInsight={() => setCheckinInsight(undefined)}
            workout={workout}
          />
          {workoutSummary ? (
            <PostWorkoutSummary
              onBack={() => setWorkoutSummary(undefined)}
              onOpenProgress={() => navigate("evolucao")}
              onOpenRewards={() => navigate("recompensas")}
              summary={workoutSummary}
            />
          ) : (
            <TodayWorkoutPage
              onAddSet={addSet}
              onCompleteSkillWorkout={completeSkillWorkout}
              onCompleteWorkout={completeWorkout}
              onFinishExerciseSet={finishExerciseSet}
              previousSets={previousSets}
              prescription={todayPrescription}
              session={todaySession}
              sessions={data.sessions}
              workout={workout}
            />
          )}
        </div>
      ) : null}
      {view === "plano" ? (
        <PlanPage onUpdatePlan={updatePlan} plan={data.trainingPlan} />
      ) : null}
      {view === "evolucao" ? <ProgressPage data={data} /> : null}
      {view === "recompensas" ? (
        <RewardsPage
          data={data}
          onClaim={(reward) => updateReward(reward, "claim")}
          onCreate={createReward}
          onUndo={(reward) => updateReward(reward, "undo")}
        />
      ) : null}
      {view === "backup" ? (
        <BackupPage
          data={data}
          onClearTestData={clearTestData}
          onImport={importBackup}
          onReset={() => void resetAll()}
        />
      ) : null}
      {view === "checkin" ? <CheckinPage data={data} onSave={saveCheckin} /> : null}
    </AppShell>
  );
}

function createSession(workout: Workout): TrainingSession {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    workoutId: workout.id,
    workoutName: workout.name,
    status: "partial",
    exercises: [],
    earnedXp: 0,
  };
}

function clearRewardClaim(reward: Reward): Reward {
  const next = { ...reward, claimed: false };
  delete next.claimedAt;
  return next;
}

function createExerciseLog(exercise: Exercise): ExerciseLog {
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    type: exercise.type,
    sets: [],
    completed: false,
    pain: false,
    dizziness: false,
  };
}

function createSkillExerciseLog(
  workout: Workout,
  metrics: SkillWorkoutMetrics,
): ExerciseLog {
  return {
    exerciseId: `${workout.id}-metricas`,
    exerciseName: "Registro técnico",
    type: "technical_metric",
    sets: [
      {
        setIndex: 1,
        completed: true,
        durationSec: metrics.durationMin ? metrics.durationMin * 60 : undefined,
        errors: metrics.errors,
        hits: metrics.hits,
        attempts: metrics.attempts,
        quality1to5: metrics.quality1to5,
        cleanStreakSec: metrics.cleanStreakSec,
        rounds: metrics.rounds,
        technicalRatings: metrics.technicalRatings,
        notes: metrics.notes,
      },
    ],
    completed: true,
    pain: false,
    dizziness: false,
    notes: metrics.notes,
  };
}

function upsertExercise(
  logs: ExerciseLog[],
  exercise: Exercise,
  updater: (log: ExerciseLog) => ExerciseLog,
): ExerciseLog[] {
  const existing = logs.find((log) => log.exerciseId === exercise.id);
  if (!existing) {
    return [...logs, updater(createExerciseLog(exercise))];
  }

  return logs.map((log) =>
    log.exerciseId === exercise.id ? updater(log) : log,
  );
}

function withRecalculatedXp(
  session: TrainingSession,
  previousSessions: TrainingSession[] = [],
): TrainingSession {
  const withoutXp = { ...session, earnedXp: 0 };
  const prBonus = session.status === "completed" ? getPrBonus(withoutXp, previousSessions) : 0;
  return {
    ...withoutXp,
    earnedXp: calculateSessionXp(withoutXp) + prBonus,
    earnedCoins: calculateSessionXp(withoutXp) + prBonus,
    prBonusXp: prBonus,
    prBonusCoins: prBonus,
  };
}

function isCloudSnapshotOlderThanPending(
  incoming: AppData,
  pending: AppData,
): boolean {
  const incomingRevision = incoming.schedule.revision ?? 0;
  const pendingRevision = pending.schedule.revision ?? 0;
  if (incomingRevision !== pendingRevision) {
    return incomingRevision < pendingRevision;
  }

  return incoming.schedule.updatedAt < pending.schedule.updatedAt;
}
