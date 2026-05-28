import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { createInitialAppData } from "../data/createInitialAppData";
import type {
  Achievement,
  AppData,
  BodyCheckin,
  BodyGoal,
  CapoeiraMovement,
  DayEvent,
  MonthlyReview,
  PenaltyEvent,
  Profile,
  ScheduleState,
  Settings,
  TrainingPhase,
  TrainingPlanVersion,
} from "../types/appData";
import type { Reward } from "../types/rewards";
import type { TrainingPlan, TrainingSession } from "../types/training";
import { createInitialSchedule } from "../lib/schedule";
import { db } from "./firebaseClient";

const CURRENT = "current";

type DataPieces = {
  profile?: Profile;
  settings?: Settings;
  trainingPlan?: TrainingPlan;
  schedule?: ScheduleState;
  dayEvents?: DayEvent[];
  sessions?: TrainingSession[];
  bodyCheckins?: BodyCheckin[];
  rewards?: Reward[];
  achievements?: Achievement[];
  metadata?: {
    trainingPhases?: TrainingPhase[];
    bodyGoals?: BodyGoal[];
    penaltyEvents?: PenaltyEvent[];
    trainingPlanHistory?: TrainingPlanVersion[];
    monthlyReviews?: MonthlyReview[];
    capoeiraMovements?: CapoeiraMovement[];
  };
};

export async function ensureUserData(uid: string): Promise<void> {
  const profileRef = doc(db, "users", uid, "profile", CURRENT);
  const profile = await getDoc(profileRef);
  if (profile.exists()) {
    return;
  }

  await saveAppData(uid, createInitialAppData());
}

export function subscribeToAppData(
  uid: string,
  onData: (data: AppData) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const pieces: DataPieces = {};
  const ready = new Set<string>();
  let emitTimer: ReturnType<typeof setTimeout> | undefined;
  const required = [
    "profile",
    "settings",
    "trainingPlan",
    "schedule",
    "dayEvents",
    "sessions",
    "bodyCheckins",
    "rewards",
    "achievements",
    "metadata",
  ];

  function markReady(key: string) {
    ready.add(key);
    if (required.every((item) => ready.has(item))) {
      if (emitTimer) {
        clearTimeout(emitTimer);
      }
      emitTimer = setTimeout(() => {
        const data = assembleAppData(pieces);
        if (data) {
          onData(data);
        }
      }, 100);
    }
  }

  const unsubscribers = [
    onSnapshot(
      doc(db, "users", uid, "profile", CURRENT),
      (snapshot) => {
        pieces.profile = snapshot.data() as Profile | undefined;
        markReady("profile");
      },
      onError,
    ),
    onSnapshot(
      doc(db, "users", uid, "settings", CURRENT),
      (snapshot) => {
        pieces.settings = snapshot.data() as Settings | undefined;
        markReady("settings");
      },
      onError,
    ),
    onSnapshot(
      doc(db, "users", uid, "trainingPlan", CURRENT),
      (snapshot) => {
        pieces.trainingPlan = snapshot.data() as TrainingPlan | undefined;
        markReady("trainingPlan");
      },
      onError,
    ),
    onSnapshot(
      doc(db, "users", uid, "schedule", CURRENT),
      (snapshot) => {
        pieces.schedule = snapshot.data() as ScheduleState | undefined;
        markReady("schedule");
      },
      onError,
    ),
    onSnapshot(
      query(collection(db, "users", uid, "dayEvents"), orderBy("date", "asc")),
      (snapshot) => {
        pieces.dayEvents = snapshot.docs.map((item) => item.data() as DayEvent);
        markReady("dayEvents");
      },
      onError,
    ),
    onSnapshot(
      query(collection(db, "users", uid, "sessions"), orderBy("date", "asc")),
      (snapshot) => {
        pieces.sessions = snapshot.docs.map((item) => item.data() as TrainingSession);
        markReady("sessions");
      },
      onError,
    ),
    onSnapshot(
      query(collection(db, "users", uid, "checkins"), orderBy("date", "asc")),
      (snapshot) => {
        pieces.bodyCheckins = snapshot.docs.map((item) => item.data() as BodyCheckin);
        markReady("bodyCheckins");
      },
      onError,
    ),
    onSnapshot(
      query(collection(db, "users", uid, "rewards"), orderBy("createdAt", "asc")),
      (snapshot) => {
        pieces.rewards = snapshot.docs.map((item) => item.data() as Reward);
        markReady("rewards");
      },
      onError,
    ),
    onSnapshot(
      collection(db, "users", uid, "achievements"),
      (snapshot) => {
        pieces.achievements = snapshot.docs.map((item) => item.data() as Achievement);
        markReady("achievements");
      },
      onError,
    ),
    onSnapshot(
      doc(db, "users", uid, "metadata", CURRENT),
      (snapshot) => {
        pieces.metadata = snapshot.data() as DataPieces["metadata"] | undefined;
        markReady("metadata");
      },
      onError,
    ),
  ];

  return () => {
    if (emitTimer) {
      clearTimeout(emitTimer);
    }
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

function assembleAppData(pieces: DataPieces): AppData | undefined {
  if (!pieces.profile || !pieces.settings || !pieces.trainingPlan) {
    return undefined;
  }

  return {
    version: 1,
    profile: pieces.profile,
    settings: pieces.settings,
    trainingPlan: pieces.trainingPlan,
    schedule: pieces.schedule ?? createInitialSchedule(pieces.trainingPlan),
    dayEvents: pieces.dayEvents ?? [],
    sessions: pieces.sessions ?? [],
    bodyCheckins: pieces.bodyCheckins ?? [],
    rewards: pieces.rewards ?? [],
    claimedRewards: [],
    achievements: pieces.achievements ?? [],
    trainingPhases: pieces.metadata?.trainingPhases ?? [],
    bodyGoals: pieces.metadata?.bodyGoals ?? [],
    penaltyEvents: pieces.metadata?.penaltyEvents ?? [],
    trainingPlanHistory: pieces.metadata?.trainingPlanHistory ?? [],
    monthlyReviews: pieces.metadata?.monthlyReviews ?? [],
    capoeiraMovements: pieces.metadata?.capoeiraMovements ?? [],
  };
}

export async function saveAppData(uid: string, data: AppData): Promise<void> {
  const batch = writeBatch(db);

  batch.set(doc(db, "users", uid, "profile", CURRENT), data.profile);
  batch.set(doc(db, "users", uid, "settings", CURRENT), data.settings);
  batch.set(doc(db, "users", uid, "trainingPlan", CURRENT), data.trainingPlan);
  batch.set(doc(db, "users", uid, "schedule", CURRENT), data.schedule);
  batch.set(doc(db, "users", uid, "metadata", CURRENT), {
    trainingPhases: data.trainingPhases ?? [],
    bodyGoals: data.bodyGoals ?? [],
    penaltyEvents: data.penaltyEvents ?? [],
    trainingPlanHistory: data.trainingPlanHistory ?? [],
    monthlyReviews: data.monthlyReviews ?? [],
    capoeiraMovements: data.capoeiraMovements ?? [],
  });

  data.dayEvents.forEach((event) =>
    batch.set(doc(db, "users", uid, "dayEvents", event.id), event),
  );
  data.sessions.forEach((session) =>
    batch.set(doc(db, "users", uid, "sessions", session.id), session),
  );
  data.bodyCheckins.forEach((checkin) =>
    batch.set(doc(db, "users", uid, "checkins", checkin.id), checkin),
  );
  data.rewards.forEach((reward) =>
    batch.set(doc(db, "users", uid, "rewards", reward.id), reward),
  );
  data.achievements.forEach((achievement) =>
    batch.set(doc(db, "users", uid, "achievements", achievement.id), achievement),
  );

  await batch.commit();
}

export async function saveDerivedAppData(
  uid: string,
  before: AppData,
  after: AppData,
): Promise<void> {
  const batch = writeBatch(db);
  const previousEvents = new Map(
    before.dayEvents.map((event) => [event.id, JSON.stringify(event)]),
  );

  batch.set(doc(db, "users", uid, "trainingPlan", CURRENT), after.trainingPlan);
  batch.set(doc(db, "users", uid, "schedule", CURRENT), after.schedule);
  batch.set(doc(db, "users", uid, "metadata", CURRENT), {
    trainingPhases: after.trainingPhases ?? [],
    bodyGoals: after.bodyGoals ?? [],
    penaltyEvents: after.penaltyEvents ?? [],
    trainingPlanHistory: after.trainingPlanHistory ?? [],
    monthlyReviews: after.monthlyReviews ?? [],
    capoeiraMovements: after.capoeiraMovements ?? [],
  });

  after.dayEvents
    .filter((event) => previousEvents.get(event.id) !== JSON.stringify(event))
    .forEach((event) =>
      batch.set(doc(db, "users", uid, "dayEvents", event.id), event),
    );

  await batch.commit();
}

export async function replaceAppData(uid: string, data: AppData): Promise<void> {
  await clearUserData(uid);
  await saveAppData(uid, data);
}

export async function resetAppData(uid: string): Promise<void> {
  await clearUserData(uid);
  await saveAppData(uid, createInitialAppData());
}

export async function clearProgressData(uid: string, data: AppData): Promise<void> {
  await Promise.all([
    clearCollection(uid, "schedule"),
    clearCollection(uid, "dayEvents"),
    clearCollection(uid, "sessions"),
    clearCollection(uid, "checkins"),
    clearCollection(uid, "achievements"),
    clearCollection(uid, "metadata"),
  ]);
  await saveAppData(uid, data);
}

async function clearUserData(uid: string): Promise<void> {
  await Promise.all([
    clearCollection(uid, "profile"),
    clearCollection(uid, "settings"),
    clearCollection(uid, "trainingPlan"),
    clearCollection(uid, "schedule"),
    clearCollection(uid, "dayEvents"),
    clearCollection(uid, "sessions"),
    clearCollection(uid, "checkins"),
    clearCollection(uid, "rewards"),
    clearCollection(uid, "achievements"),
    clearCollection(uid, "metadata"),
  ]);
}

async function clearCollection(uid: string, collectionName: string): Promise<void> {
  const snapshot = await getDocs(collection(db, "users", uid, collectionName));
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}
