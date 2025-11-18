// app/(auth)/index.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Platform, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { signInWithPhoneNumber, signInAnonymously } from "firebase/auth";
import { auth } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";

// @ts-ignore
declare global {
  interface Window {
    recaptchaVerifier?: any;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("+43 123456789"); // 🔹 Testnummer aus Firebase Console
  const [code, setCode] = useState("123456");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (__DEV__ && auth.settings) {
          auth.settings.appVerificationDisabledForTesting = true;
          console.log("✅ AppVerification deaktiviert (Testmodus aktiv)");
        }
      } catch (err) {
        console.log("Init-Fehler:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const sendCode = async () => {
    try {
      if (!phone.startsWith("+")) {
        Alert.alert("Fehler", "Bitte Telefonnummer im Format +43 ... eingeben.");
        return;
      }

      let confirmationResult;

      if (Platform.OS === "web") {
        // Nur Web: reCAPTCHA initialisieren
        // @ts-ignore
        const { RecaptchaVerifier } = await import("firebase/auth");
        if (!window.recaptchaVerifier) {
          // @ts-ignore
          window.recaptchaVerifier = new RecaptchaVerifier(
            "recaptcha-container",
            { size: "invisible" },
            auth
          );
        }
        confirmationResult = await signInWithPhoneNumber(
          auth,
          phone,
          window.recaptchaVerifier
        );
      } else {
        // Expo Go oder Dev-Build
        confirmationResult = await signInWithPhoneNumber(auth, phone);
      }

      setConfirmation(confirmationResult);
      Alert.alert("Code gesendet ✅", "Bitte den SMS-Code eingeben!");
    } catch (err: any) {
      console.log("Fehler bei sendCode:", err);
      Alert.alert("Fehler", err.message);
    }
  };

  const confirmCode = async () => {
    try {
      if (!confirmation) {
        Alert.alert("Fehler", "Kein Bestätigungsvorgang aktiv!");
        return;
      }

      const userCred = await confirmation.confirm(code);
      const userRef = doc(db, "users", userCred.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        if (!username.trim()) {
          Alert.alert("Fehler", "Bitte Benutzernamen eingeben.");
          return;
        }

        const q = query(
          collection(db, "usernames"),
          where("username", "==", username)
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
          Alert.alert("Fehler", "Benutzername ist schon vergeben!");
          return;
        }

        await addDoc(collection(db, "usernames"), {
          username,
          uid: userCred.user.uid,
        });
        await setDoc(userRef, { phone, username, role: "student" });
      }

      Alert.alert("✅ Erfolg!", "Login erfolgreich!");
      router.replace("../(tabs)");
    } catch (err: any) {
      console.log("Fehler bei confirmCode:", err);
      Alert.alert("Fehler", err.message);
    }
  };

  const testLogin = async () => {
    try {
      const userCred = await signInAnonymously(auth);
      console.log("Eingeloggt als Test-User:", userCred.user.uid);
      Alert.alert(
        "🧪 Testmodus aktiviert",
        "Du bist jetzt als Test-User eingeloggt!"
      );
      // → Weiterleitung passiert automatisch durch onAuthStateChanged im Root-Layout
    } catch (err: any) {
      Alert.alert("Fehler beim Testlogin", err.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" />
        <Text style={{ marginTop: 12 }}>Prüfe Login ...</Text>
      </View>
    );
  }

  // same visual language as chat.tsx input
  const inputStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
  } as const;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Nur Web: Recaptcha Container */}
      {Platform.OS === "web" && typeof document !== "undefined"
        ? React.createElement("div", { id: "recaptcha-container" })
        : null}

      <Text variant="headlineSmall" style={styles.title}>
        📱 Telefon-Login
      </Text>

      {!confirmation ? (
        <>
          <TextInput
            style={inputStyle}
            placeholder="+43 ..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Button mode="contained" onPress={sendCode} style={styles.button}>
            Code senden
          </Button>

          <Button mode="outlined" onPress={testLogin} style={styles.button}>
            🧪 Test Login
          </Button>
        </>
      ) : (
        <>
          <TextInput
            style={inputStyle}
            placeholder="SMS-Code"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={inputStyle}
            placeholder="Benutzername"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={username}
            onChangeText={setUsername}
          />

          <Button mode="contained" onPress={confirmCode} style={styles.button}>
            Bestätigen
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
});
