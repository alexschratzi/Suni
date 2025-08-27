// localUser.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

export type LocalUser = {
  email: string;
  username: string;
  role: "student";
};

// 🔎 Prüfen ob Benutzername vergeben ist
export async function isUsernameTaken(username: string): Promise<boolean> {
  const q = query(collection(db, "usernames"), where("username", "==", username));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// 🔑 Student speichern (nur beim ersten Login)
export async function saveLocalUser(email: string, username: string) {
  if (await isUsernameTaken(username)) {
    throw new Error("❌ Benutzername ist schon vergeben!");
  }

  // Username global reservieren
  await addDoc(collection(db, "usernames"), { username });

  const user: LocalUser = { email, username, role: "student" };
  await AsyncStorage.setItem("localUser", JSON.stringify(user));

  console.log("✅ Student gespeichert:", user);
  return user;
}

// 📦 Local User laden
export async function loadLocalUser(): Promise<LocalUser | null> {
  const data = await AsyncStorage.getItem("localUser");
  return data ? JSON.parse(data) : null;
}

// 🚪 Logout
export async function clearLocalUser() {
  const local = await loadLocalUser();
  if (local) {
    // alten Namen aus Firestore löschen
    const q = query(collection(db, "usernames"), where("username", "==", local.username));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, "usernames", d.id));
    }
  }
  await AsyncStorage.removeItem("localUser");
}

// ✏️ Benutzernamen ändern
export async function updateUsername(newUsername: string) {
  const local = await loadLocalUser();
  if (!local) throw new Error("Kein User eingeloggt");

  if (await isUsernameTaken(newUsername)) {
    throw new Error("❌ Benutzername ist schon vergeben!");
  }

  // alten Namen löschen
  const q = query(collection(db, "usernames"), where("username", "==", local.username));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, "usernames", d.id));
  }

  // neuen Namen speichern
  await addDoc(collection(db, "usernames"), { username: newUsername });

  const updated: LocalUser = { ...local, username: newUsername };
  await AsyncStorage.setItem("localUser", JSON.stringify(updated));

  console.log("✅ Benutzername geändert:", updated);
  return updated;
}
