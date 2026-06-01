import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import type { ViewId } from "./components/BottomNav";
import { DEFAULT_ACHIEVEMENTS } from "./data/achievements";
import { LoginPage } from "./features/auth/LoginPage";
import { BackupPage } from "./features/backup/BackupPage";
import { CapoeiraPage } from "./features/capoeira/CapoeiraPage";
import { CheckinPage } from "./features/checkins/CheckinPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { PlanPage, type MasterConfig } from "./features/plan/PlanPage";
import { ProgressPage } from "./features/progress/ProgressPage";
import { RewardsPage } from "./features/rewards/RewardsPage";
import { PostWorkoutSummary } from "./features/today/PostWorkoutSummary";
import { TodayWorkoutPage } from "./features/today/TodayWorkoutPage";
import { buildCheckinInsight, type CheckinInsight } from "./lib/checkinInsights";
import { isSessionToday } from "./lib/dates";
import {
  calculateSessionCoins,
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
  markWorkoutPartial,
  markRecoveryRest,
  resolvePendingDays,
  selectWorkoutForToday,
} from "./lib/schedule";
import { buildWorkoutSummary, type WorkoutSummary } from "./lib/postWorkout";
import { normalizeAppDataForEconomy } from "./lib/economyMigration";
import { getPrBonus, getPrCoinBonus } from "./lib/progressionEngine";
import { getTodayPrescription } from "./lib/prescriptionEngine";
import type { PrescribedBlock } from "./lib/prescriptionEngine";
import { countCompletedWorkSets, isWorkSet } from "./lib/sets";
import {
  getCompletionKey,
  isDailyBlockCompleted,
  toggleScopedCompletion,
} from "./lib/dailyCompletion";
import { normalizeAppDataForWave } from "./lib/trainingPlan";
import {
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  type AuthUser,
} from "./services/authService";
import {
  clearProgressData,
  loadOrCreateAppData,
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
  capoeira: "/capoeira",
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
  if (pathname.startsWith("/capoeira")) {
    return "capoeira";
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
  const pendingWriteRef = useRef<{ data: AppData } | undefined>(undefined);
  const latestDataRef = useRef<AppData | undefined>(undefined);

  useEffect(() => {
    return subscribeAuth(
      (user) => {
        setAuthUser(user);
        setAuthLoading(false);
        setError("");
        if (!user) {
          setData(undefined);
          latestDataRef.current = undefined;
          pendingWriteRef.current = undefined;
          setDataLoading(false);
        } else {
          setData(undefined);
          latestDataRef.current = undefined;
          pendingWriteRef.current = undefined;
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

    const uid = authUser.uid;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    const syncTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setError(
          "O Firestore demorou para responder. Verifique a conexao e tente recarregar.",
        );
        setDataLoading(false);
      }
    }, 20000);

    function applyLoadedData(
      next: AppData,
      options: { source: "cloud" | "local"; before?: AppData; persistDerived?: boolean },
    ): boolean {
      if (suppressCloudSyncRef.current && options.source === "cloud") {
        return false;
      }
      const before = options.before ?? next;
      const normalized = normalizeAppDataForWave(next);
      const economyNormalized = normalizeAppDataForEconomy(normalized.data);
      const resolved = resolvePendingDays(economyNormalized.data);
      const pendingWrite = pendingWriteRef.current;
      if (
        options.source === "cloud" &&
        pendingWrite &&
        isCloudSnapshotOlderThanPending(resolved.data, pendingWrite.data)
      ) {
        return false;
      }
      if (
        options.source === "cloud" &&
        latestDataRef.current &&
        isCloudSnapshotOlderThanPending(resolved.data, latestDataRef.current)
      ) {
        pendingWriteRef.current = { data: latestDataRef.current };
        void saveAppData(uid, latestDataRef.current).catch((reason: unknown) => {
          setError(getSyncErrorMessage(reason));
        });
        return false;
      }
      if (
        options.source === "cloud" &&
        pendingWrite &&
        !isCloudSnapshotOlderThanPending(resolved.data, pendingWrite.data)
      ) {
        pendingWriteRef.current = undefined;
      }

      latestDataRef.current = resolved.data;
      setData(resolved.data);
      setDataLoading(false);
      if (options.source === "cloud") {
        setError("");
      }
      if (
        options.persistDerived &&
        (normalized.changed || economyNormalized.changed || resolved.changed)
      ) {
        void saveDerivedAppData(uid, before, resolved.data).catch((reason: unknown) => {
          setError(getSyncErrorMessage(reason, "Erro ao resolver agenda."));
        });
      }
      return true;
    }

    loadOrCreateAppData(uid)
      .then((next) => {
        if (cancelled || !next) {
          return;
        }

        window.clearTimeout(syncTimeout);
        applyLoadedData(next, {
          source: "cloud",
          before: next,
          persistDerived: true,
        });

        unsubscribe = subscribeToAppData(
          uid,
          (next) => {
            window.clearTimeout(syncTimeout);
            applyLoadedData(next, {
              source: "cloud",
              before: next,
              persistDerived: true,
            });
          },
          (reason) => {
            window.clearTimeout(syncTimeout);
            setError(reason.message);
            setDataLoading(false);
          },
        );
      })
      .catch((reason: unknown) => {
        window.clearTimeout(syncTimeout);
        setError(getSyncErrorMessage(reason, "Erro ao carregar dados."));
        setDataLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(syncTimeout);
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

      if (dayEvent?.status === "completed" || dayEvent?.status === "partial") {
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
  const capoeiraHasNewMovement = useMemo(
    () =>
      data?.capoeiraMovements?.some(
        (movement) => movement.status === "not_started" || movement.status === "learning",
      ) ?? true,
    [data?.capoeiraMovements],
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
            const set = [...exercise.sets]
              .reverse()
              .find((item) => item.completed && isWorkSet(item));
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

    pendingWriteRef.current = { data: next };
    latestDataRef.current = next;
    setData(next);
    void saveAppData(authUser.uid, next).catch((reason: unknown) => {
      setError(getSyncErrorMessage(reason));
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

  function syncSessionExerciseCompletion(
    session: TrainingSession,
    exercise: Exercise,
  ): TrainingSession {
    const match = findPrescribedSlotForExercise(exercise);
    const block = match?.block;
    const slotExercise = match?.slotExercise ?? exercise;
    const log = session.exercises.find(
      (item) =>
        item.exerciseId === exercise.id ||
        Boolean(exercise.legacyIds?.includes(item.exerciseId)),
    );
    if (!block || !log?.completed) {
      return session;
    }

    const completedItems = unique([
      ...(session.completedItems ?? []),
      getCompletionKey(block.id, slotExercise.id),
    ]);
    const completedBlocks = isDailyBlockCompleted({
      block,
      completedItems,
      exerciseLogs: session.exercises,
    })
      ? unique([...(session.completedBlocks ?? []), block.id])
      : session.completedBlocks;

    return {
      ...session,
      completedItems,
      completedBlocks,
    };
  }

  function findPrescribedSlotForExercise(exercise: Exercise) {
    for (const block of todayPrescription?.prescribedBlocks ?? []) {
      for (const item of block.items) {
        const matchesSlot =
          item.exercise.id === exercise.id ||
          Boolean(item.exercise.legacyIds?.includes(exercise.id));
        const matchesVariant = item.variantOptions?.some(
          (option) =>
            option.exercise.id === exercise.id ||
            Boolean(option.exercise.legacyIds?.includes(exercise.id)),
        );
        if (matchesSlot || matchesVariant) {
          return { block, slotExercise: item.exercise };
        }
      }
    }

    return undefined;
  }

  function addSet(exercise: Exercise, set: SetLog) {
    setWorkoutSummary(undefined);
    updateTodaySession((session) => {
      const exercises = upsertExercise(session.exercises, exercise, (log) => {
        const sets = [...log.sets, set];
        return {
          ...log,
          sets,
          completed: countCompletedWorkSets({ sets }) >= exercise.targetSets,
        };
      });
      return syncSessionExerciseCompletion({
        ...session,
        status: "partial",
        exercises,
      }, exercise);
    });
  }

  function finishExerciseSet(exercise: Exercise, set: SetLog) {
    setWorkoutSummary(undefined);
    updateTodaySession((session) => {
      const exercises = upsertExercise(session.exercises, exercise, (log) => ({
        ...log,
        sets: [...log.sets, set],
        completed: countCompletedWorkSets({ sets: [...log.sets, set] }) >= exercise.targetSets,
      }));
      return syncSessionExerciseCompletion({
        ...session,
        status: "partial",
        exercises,
      }, exercise);
    });
  }

  function completeChecklistItem(block: PrescribedBlock, item: Exercise) {
    setWorkoutSummary(undefined);
    updateTodaySession((session) => {
      const completedItems = toggleScopedCompletion(
        session.completedItems ?? [],
        block.id,
        item,
      );
      const blockCompleted = isDailyBlockCompleted({
        block,
        completedItems,
        exerciseLogs: session.exercises,
      });
      return {
        ...session,
        status: "partial",
        completedItems,
        completedBlocks: blockCompleted
          ? unique([...(session.completedBlocks ?? []), block.id])
          : (session.completedBlocks ?? []).filter((id) => id !== block.id),
      };
    });
  }

  function completeChecklistItemAndWorkout(block: PrescribedBlock, item: Exercise) {
    if (!data || !workout) {
      return;
    }
    setWorkoutSummary(undefined);
    const current = todaySession ?? createSession(workout);
    const previousSessions = data.sessions.filter((session) => session.id !== current.id);
    const completedItems = unique([
      ...(current.completedItems ?? []),
      getCompletionKey(block.id, item.id),
    ]);
    const blockCompleted = isDailyBlockCompleted({
      block,
      completedItems,
      exerciseLogs: current.exercises,
    });
    const updated = withRecalculatedXp(
      {
        ...current,
        status: "completed",
        completedItems,
        completedBlocks: blockCompleted
          ? unique([...(current.completedBlocks ?? []), block.id])
          : current.completedBlocks,
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
    const summaryWorkout = todayPrescription?.exercises.length
      ? {
          ...workout,
          exercises: todayPrescription.exercises.map((candidate) => candidate.exercise),
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
    const targetStatus = metrics.status ?? "completed";
    const updated = withRecalculatedXp(
      {
        ...current,
        durationMin: metrics.durationMin ?? current.durationMin,
        notes: metrics.notes ?? current.notes,
        status: targetStatus,
        completedBlocks: metrics.completedBlocks ?? current.completedBlocks,
        completedItems: metrics.completedItems ?? current.completedItems,
        technicalBlocks: metrics.technicalBlocks ?? current.technicalBlocks,
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
    if (targetStatus !== "completed") {
      commit(markWorkoutPartial({ ...data, sessions }, workout));
      setWorkoutSummary(undefined);
      return;
    }

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

  function updateCapoeiraMovements(movements: NonNullable<AppData["capoeiraMovements"]>) {
    if (!data) {
      return;
    }
    commit({ ...data, capoeiraMovements: movements });
  }

  function importMasterConfig(config: MasterConfig) {
    if (!data) {
      return;
    }
    commit(
      ensureSchedule({
        ...data,
        trainingPlan: config.plan,
        capoeiraMovements: config.capoeiraMovements ?? data.capoeiraMovements,
        trainingPhases: config.trainingPhases ?? data.trainingPhases,
        bodyGoals: config.bodyGoals ?? data.bodyGoals,
        rewards: config.rewards ?? data.rewards,
        achievements: config.achievements ?? data.achievements,
      }),
    );
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
    const next = await resetAppData(authUser.uid);
    latestDataRef.current = next;
    setData(next);
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
    latestDataRef.current = next;
    setData(next);
    suppressCloudSyncRef.current = true;
    void clearProgressData(authUser.uid, next).catch((reason: unknown) => {
      setError(getSyncErrorMessage(reason, "Erro ao limpar testes."));
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

    const normalized = normalizeAppDataForWave(imported);
    const economyNormalized = normalizeAppDataForEconomy(normalized.data);
    const next = ensureSchedule(economyNormalized.data);
    latestDataRef.current = next;
    setData(next);
    suppressCloudSyncRef.current = true;
    void replaceAppData(authUser.uid, next).catch((reason: unknown) => {
      setError(getSyncErrorMessage(reason, "Erro ao importar backup."));
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

  if (!data && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <div className="w-full max-w-md rounded-lg border border-rose-400/35 bg-rose-500/10 p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-rose-200">
            Erro ao sincronizar
          </p>
          <p className="mt-2 text-sm text-rose-50">{error}</p>
          <button
            className="mt-4 w-full rounded-md bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950"
            onClick={() => window.location.reload()}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (dataLoading || !data) {
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

  if (!workout || !nextWorkout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
        <div className="w-full max-w-md rounded-lg border border-amber-400/35 bg-amber-500/10 p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-amber-200">
            Agenda incompleta
          </p>
          <p className="mt-2 text-sm text-amber-50">
            O plano carregou, mas a agenda nao encontrou o treino de hoje.
          </p>
          <button
            className="mt-4 w-full rounded-md bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950"
            onClick={() => window.location.reload()}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      </div>
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
              onCompleteChecklistItemAndWorkout={completeChecklistItemAndWorkout}
              onCompleteChecklistItem={completeChecklistItem}
              onCompleteSkillWorkout={completeSkillWorkout}
              onCompleteWorkout={completeWorkout}
              onFinishExerciseSet={finishExerciseSet}
              capoeiraHasNewMovement={capoeiraHasNewMovement}
              previousSets={previousSets}
              prescription={todayPrescription}
              session={todaySession}
              sessions={data.sessions}
              workout={workout}
            />
          )}
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
        </div>
      ) : null}
      {view === "plano" ? (
        <PlanPage
          data={data}
          onImportMasterConfig={importMasterConfig}
          onUpdatePlan={updatePlan}
          plan={data.trainingPlan}
        />
      ) : null}
      {view === "evolucao" ? <ProgressPage data={data} /> : null}
      {view === "capoeira" ? (
        <CapoeiraPage
          movements={data.capoeiraMovements ?? []}
          onUpdate={updateCapoeiraMovements}
        />
      ) : null}
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
  const withoutXp = {
    ...session,
    earnedXp: 0,
    earnedCoins: 0,
    prBonusXp: 0,
    prBonusCoins: 0,
  };
  const prBonusXp =
    session.status === "completed" ? getPrBonus(withoutXp, previousSessions) : 0;
  const prBonusCoins =
    session.status === "completed" ? getPrCoinBonus(withoutXp, previousSessions) : 0;
  return {
    ...withoutXp,
    earnedXp: calculateSessionXp(withoutXp) + prBonusXp,
    earnedCoins: calculateSessionCoins(withoutXp) + prBonusCoins,
    prBonusXp,
    prBonusCoins,
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function isCloudSnapshotOlderThanPending(
  incoming: AppData,
  pending: AppData,
): boolean {
  if (pending.settings.onboardingDone && !incoming.settings.onboardingDone) {
    return true;
  }
  if (incoming.sessions.length < pending.sessions.length) {
    return true;
  }
  if (incoming.dayEvents.length < pending.dayEvents.length) {
    return true;
  }
  if (incoming.bodyCheckins.length < pending.bodyCheckins.length) {
    return true;
  }
  const incomingRevision = incoming.schedule.revision ?? 0;
  const pendingRevision = pending.schedule.revision ?? 0;
  if (incomingRevision !== pendingRevision) {
    return incomingRevision < pendingRevision;
  }

  return incoming.schedule.updatedAt < pending.schedule.updatedAt;
}

function getSyncErrorMessage(reason: unknown, fallback = "Erro ao sincronizar dados."): string {
  const code =
    typeof reason === "object" && reason && "code" in reason
      ? String(reason.code)
      : "";
  const message = reason instanceof Error ? reason.message : "";
  if (code === "resource-exhausted" || /quota exceeded/i.test(message)) {
    return "A quota de escrita do Firestore deste projeto acabou por hoje. O app ja esta otimizado para gravar em 1 documento compacto, mas o Firebase esta recusando novas escritas ate a quota liberar ou o billing ser habilitado.";
  }
  return message || fallback;
}
