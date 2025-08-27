// utils/logout.ts
import { signOut } from "firebase/auth";
import { auth } from "../firebase";      // ✅ eine Ebene höher
import { clearLocalUser, loadLocalUser } from "../localUser"; // ✅ auch eine Ebene höher

export async function logout() {
  const localUser = await loadLocalUser();

  if (localUser) {
    await clearLocalUser();
    console.log("✅ Student ausgeloggt");
  } else if (auth.currentUser) {
    await signOut(auth);
    console.log("✅ ÖH Account ausgeloggt");
  }
}
