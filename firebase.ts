// firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseAuth from "@react-native-firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:ios:f214ca30d921a0cd4b5e7b",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const authInstance = firebaseAuth();
export const auth = authInstance;
export const db = getFirestore(app);
