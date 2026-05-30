import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore/lite";
import { createInitialAppData } from "../data/createInitialAppData";
import type { AppData } from "../types/appData";
import { db } from "./firebaseClient";

const CURRENT = "current";
const APP_DATA_COLLECTION = "appData";

type Unsubscribe = () => void;

type AppDataDocument = {
  schemaVersion: 2;
  payload: string;
  updatedAt: string;
};

export async function ensureUserData(uid: string): Promise<void> {
  await loadOrCreateAppData(uid);
}

export async function loadOrCreateAppData(uid: string): Promise<AppData> {
  const existing = await loadAppData(uid);
  if (existing) {
    return existing;
  }

  const initialData = createInitialAppData();
  await saveAppData(uid, initialData);
  return initialData;
}

async function loadAppData(uid: string): Promise<AppData | undefined> {
  const snapshot = await getDoc(doc(db, "users", uid, APP_DATA_COLLECTION, CURRENT));
  if (!snapshot.exists()) {
    return undefined;
  }

  const data = snapshot.data() as Partial<AppDataDocument>;
  if (typeof data.payload !== "string") {
    return undefined;
  }

  return JSON.parse(data.payload) as AppData;
}

export function subscribeToAppData(
  _uid: string,
  onData: (data: AppData) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  void onData;
  void onError;
  return () => undefined;
}

export async function saveAppData(uid: string, data: AppData): Promise<void> {
  await setDoc(doc(db, "users", uid, APP_DATA_COLLECTION, CURRENT), {
    schemaVersion: 2,
    payload: JSON.stringify(data),
    updatedAt: new Date().toISOString(),
  } satisfies AppDataDocument);
}

export async function saveDerivedAppData(
  uid: string,
  before: AppData,
  after: AppData,
): Promise<void> {
  void before;
  await saveAppData(uid, after);
}

export async function replaceAppData(uid: string, data: AppData): Promise<void> {
  await clearUserData(uid);
  await saveAppData(uid, data);
}

export async function resetAppData(uid: string): Promise<AppData> {
  const initialData = createInitialAppData();
  await clearUserData(uid);
  await saveAppData(uid, initialData);
  return initialData;
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
    clearCollection(uid, APP_DATA_COLLECTION),
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
