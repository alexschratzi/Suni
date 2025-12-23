// localUser.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "./firebase";

export type LocalUser = {
  email: string;
  username: string;
  role: "student";
};

// Prüfen ob Benutzername vergeben ist
export async function isUsernameTaken(username: string): Promise<boolean> {
  const snapshot = await db.collection("usernames").where("username", "==", username).get();
  return !snapshot.empty;
}

// Student speichern (nur beim ersten Login)
export async function saveLocalUser(email: string, username: string) {
  if (await isUsernameTaken(username)) {
    throw new Error("Benutzername ist schon vergeben!");
  }

  // Username global reservieren
  await db.collection("usernames").add({ username });

  const user: LocalUser = { email, username, role: "student" };
  await AsyncStorage.setItem("localUser", JSON.stringify(user));

  return user;
}

// Local User laden
export async function loadLocalUser(): Promise<LocalUser | null> {
  const data = await AsyncStorage.getItem("localUser");
  return data ? JSON.parse(data) : null;
}

// Logout
export async function clearLocalUser() {
  const local = await loadLocalUser();
  if (local) {
    // alten Namen aus Firestore löschen
    const snapshot = await db.collection("usernames").where("username", "==", local.username).get();
    for (const d of snapshot.docs) {
      await d.ref.delete();
    }
  }
  await AsyncStorage.removeItem("localUser");
}

// Benutzernamen ändern
export async function updateUsername(newUsername: string) {
  const local = await loadLocalUser();
  if (!local) throw new Error("Kein User eingeloggt");

  if (await isUsernameTaken(newUsername)) {
    throw new Error("Benutzername ist schon vergeben!");
  }

  // alten Namen löschen
  const snapshot = await db.collection("usernames").where("username", "==", local.username).get();
  for (const d of snapshot.docs) {
    await d.ref.delete();
  }

  // neuen Namen speichern
  await db.collection("usernames").add({ username: newUsername });

  const updated: LocalUser = { ...local, username: newUsername };
  await AsyncStorage.setItem("localUser", JSON.stringify(updated));

  return updated;
}
