// utils/logout.ts
import { supabase } from "../src/lib/supabase";

export async function logout() {
  await supabase.auth.signOut();
  console.log("User ausgeloggt");
}
