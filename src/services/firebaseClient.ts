import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  projectId: "appsaude-8b720",
  appId: "1:15484096639:web:948a37ac8f403b5bfd6f4a",
  storageBucket: "appsaude-8b720.firebasestorage.app",
  apiKey: "AIzaSyDAej9fge5s0Ambi8LRIDdDLu7KgusgGzc",
  authDomain: "appsaude-8b720.firebaseapp.com",
  messagingSenderId: "15484096639",
  measurementId: "G-S30FHHPH65",
};

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

export const db = initializeFirestore(firebaseApp, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
