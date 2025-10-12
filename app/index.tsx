// app/index.tsx
import { useState, useEffect } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase";
import { signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import {Button, Text, TextInput} from "react-native-paper";

// LoginScreen: Telefon-Authentifizierung mit Firebase Web SDK
export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("+43 1 23456789");
  const [code, setCode] = useState("123456");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  // Recaptcha-Container Referenz
  let recaptchaVerifier: any = null;

  useEffect(() => {
    const init = async () => {
      try {
        // 🔸 Expo Go: Testmodus aktivieren (keine Recaptcha-Verifizierung)
        if (__DEV__ && auth.settings) {
          auth.settings.appVerificationDisabledForTesting = true;
        }

        // 🔸 Falls schon eingeloggt → direkt weiter
        if (auth.currentUser) {
          router.replace("/(tabs)/news");
        }
      } catch (err) {
        console.log("Init-Fehler:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  // SMS-Code senden
  const sendCode = async () => {
    try {
      // Recaptcha-Container für Web
      if (typeof window !== "undefined" && window.document) {
        if (!recaptchaVerifier) {
          // Nur im Web: RecaptchaVerifier aus globalem Fensterobjekt
          // @ts-ignore
          recaptchaVerifier = new (window as any).firebase.auth.RecaptchaVerifier("recaptcha-container", {
            size: "invisible",
          });
        }
        const conf = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
        setConfirmation(conf);
        Alert.alert("SMS-Code verschickt!");
      } else {
        // In Expo Go/React Native: Kein RecaptchaVerifier nötig
        const conf = await signInWithPhoneNumber(auth, phone);
        setConfirmation(conf);
        Alert.alert("SMS-Code verschickt!");
      }
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  // SMS-Code bestätigen und User anlegen
  const confirmCode = async () => {
    try {
      if (!confirmation) return;
      const userCred = await confirmation.confirm(code);
      const userRef = doc(db, "users", userCred.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        if (!username.trim()) {
          Alert.alert("Fehler", "Bitte Benutzernamen eingeben.");
          return;
        }
        // Check ob Username schon vergeben
        const q = query(collection(db, "usernames"), where("username", "==", username));
        const existing = await getDocs(q);
        if (!existing.empty) {
          Alert.alert("Fehler", "Benutzername ist schon vergeben!");
          return;
        }
        // Username reservieren
        await addDoc(collection(db, "usernames"), { username, uid: userCred.user.uid });
        // Profil anlegen
        await setDoc(userRef, {
          phone,
          username,
          role: "student",
        });
      }
      router.replace("/(tabs)/news");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Prüfe Login...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Recaptcha-Container nur im Web anzeigen */}
      {typeof window !== "undefined" && window.document ? <div id="recaptcha-container"></div> : null}
      <Text style={styles.title}>Telefon-Login</Text>
      <TextInput
        style={styles.input}
        placeholder="+43 ..."
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
        <Button onPress={sendCode}>Code senden</Button>
      {confirmation && (
        <>
          <TextInput
            style={styles.input}
            placeholder="SMS Code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={styles.input}
            placeholder="Benutzername"
            value={username}
            onChangeText={setUsername}
          />
            <Button onPress={confirmCode}>Bestätigen</Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 8 },
});
