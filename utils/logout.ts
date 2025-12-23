// utils/logout.ts
import {auth} from "../firebase";

export async function logout() {
    await auth.signOut();
    console.log("✅ User ausgeloggt");
}
