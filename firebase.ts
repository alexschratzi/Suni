// firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// @ts-expect-error: Typen fehlen in firebase 12.x, aber Funktion existiert
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:web:b3e7534e15019ddb4b5e7b",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ React Native Auth mit Persistenz
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// ✅ Firestore
export const db = getFirestore(app);
