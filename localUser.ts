// localUser.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./src/lib/supabase";
import { TABLES, COLUMNS } from "./src/lib/supabaseTables";

export type LocalUser = {
  email: string;
  username: string;
  role: "student";
};

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select(COLUMNS.profiles.id)
    .eq(COLUMNS.profiles.username, username)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function saveLocalUser(email: string, username: string) {
  if (await isUsernameTaken(username)) {
    throw new Error("Benutzername ist schon vergeben!");
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error: upsertErr } = await supabase
    .from(TABLES.profiles)
    .upsert(
      {
        [COLUMNS.profiles.id]: userId,
        [COLUMNS.profiles.username]: username,
        [COLUMNS.profiles.role]: "student",
      },
      { onConflict: COLUMNS.profiles.id }
    );
  if (upsertErr) throw upsertErr;

  const user: LocalUser = { email, username, role: "student" };
  await AsyncStorage.setItem("localUser", JSON.stringify(user));

  return user;
}

export async function loadLocalUser(): Promise<LocalUser | null> {
  const data = await AsyncStorage.getItem("localUser");
  return data ? JSON.parse(data) : null;
}

export async function clearLocalUser() {
  await AsyncStorage.removeItem("localUser");
}

export async function updateUsername(newUsername: string) {
  const local = await loadLocalUser();
  if (!local) throw new Error("Kein User eingeloggt");

  if (await isUsernameTaken(newUsername)) {
    throw new Error("Benutzername ist schon vergeben!");
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { error } = await supabase
    .from(TABLES.profiles)
    .update({ [COLUMNS.profiles.username]: newUsername })
    .eq(COLUMNS.profiles.id, userId);
  if (error) throw error;

  const updated: LocalUser = { ...local, username: newUsername };
  await AsyncStorage.setItem("localUser", JSON.stringify(updated));

  return updated;
}
