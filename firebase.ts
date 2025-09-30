// firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBxTehFpuCXrU7-yCEBDee4C17jRzZRqzY",
  authDomain: "test-projekt-23e8b.firebaseapp.com",
  projectId: "test-projekt-23e8b",
  storageBucket: "test-projekt-23e8b.firebasestorage.app",
  messagingSenderId: "986555980321",
  appId: "1:986555980321:web:e007191c65240ffea62160",
  measurementId: "G-4V08R3JEX5"
};


export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    if (Platform.OS === "web") {
      const a = getAuth(app);
      setPersistence(a, indexedDBLocalPersistence).catch(() => {
        return setPersistence(a, browserLocalPersistence);
      });
      return a;
    }
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
