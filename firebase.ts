// firebase.ts
import firebaseAuth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDYpOpiZ-2VBmMuPUbZ5ltrJvyrvxWHvMs",
  authDomain: "suni-9468f.firebaseapp.com",
  projectId: "suni-9468f",
  storageBucket: "suni-9468f.appspot.com",
  messagingSenderId: "167831321634",
  appId: "1:167831321634:ios:f214ca30d921a0cd4b5e7b",
};

// Native modules
const authInstance = firebaseAuth();
export const auth = authInstance;
export const db = firestore();
