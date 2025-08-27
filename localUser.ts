import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalUser = {
  email: string;
  username: string;
  role: "student";
};

// Student lokal speichern
export async function saveLocalUser(email: string, username: string) {
  try {
    const user: LocalUser = { email, username, role: "student" };
    await AsyncStorage.setItem("localUser", JSON.stringify(user));
    console.log("✅ LocalUser gespeichert:", user);
  } catch (err) {
    console.error("❌ Fehler beim Speichern des LocalUser:", err);
  }
}

// Student laden
export async function loadLocalUser(): Promise<LocalUser | null> {
  try {
    const userData = await AsyncStorage.getItem("localUser");
    if (userData) {
      const user: LocalUser = JSON.parse(userData);
      console.log("✅ LocalUser geladen:", user);
      return user;
    }
    return null;
  } catch (err) {
    console.error("❌ Fehler beim Laden des LocalUser:", err);
    return null;
  }
}

// Student-Account löschen (Logout)
export async function clearLocalUser() {
  try {
    await AsyncStorage.removeItem("localUser");
    console.log("✅ LocalUser entfernt");
  } catch (err) {
    console.error("❌ Fehler beim Entfernen des LocalUser:", err);
  }
}
