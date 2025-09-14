// firebase.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  inMemoryPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

export const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:web:b3e7534e15019ddb4b5e7b",
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
