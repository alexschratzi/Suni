// utils/logout.ts
import {signOut} from "firebase/auth";
import {auth} from "../firebase";

export async function logout() {
    await signOut(auth);
    console.log("✅ User ausgeloggt");
}
