// firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:web:b3e7534e15019ddb4b5e7b",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// --- Auth (platform-aware) ---
export const auth = (() => {
  try {
    if (Platform.OS === "web") {
      // Web build: don't call initializeAuth or getReactNativePersistence
      const a = getAuth(app);
      // Optional: choose your preferred web persistence
      // Not awaited to keep this file synchronous; you can await this somewhere during app bootstrap if desired.
      setPersistence(a, indexedDBLocalPersistence).catch(() => {
        // Fallback to localStorage if IDB is unavailable (private mode, etc.)
        return setPersistence(a, browserLocalPersistence);
      });
      return a;
    }

    // Native build (iOS/Android)
    if (typeof getReactNativePersistence === "function") {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }

    // Extremely old firebase versions: fall back to in-memory (no persistence)
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    // If Auth was already initialized elsewhere, just return it
    return getAuth(app);
  }
})();

// Firestore
export const db = getFirestore(app);
