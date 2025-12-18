// firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:ios:f214ca30d921a0cd4b5e7b",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth — Web = getAuth, Native (Expo Go / EAS) = initializeAuth mit AsyncStorage (persisted login)
let authInstance: Auth;

if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  const globalForAuth = globalThis as typeof globalThis & {
    __suniAuth?: Auth;
  };

  if (!globalForAuth.__suniAuth) {
    globalForAuth.__suniAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }

  authInstance = globalForAuth.__suniAuth;
}

export const auth = authInstance;

export const db = getFirestore(app);
