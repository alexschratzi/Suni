// app/(auth)/index.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  signInWithPhoneNumber,
  signInAnonymously,
  RecaptchaVerifier,
} from "firebase/auth";
import { auth, db, firebaseConfig } from "../../firebase";
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
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

// Für Web
declare global {
  interface Window {
    recaptchaVerifier?: any;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("+43123456789"); // Testnummer → wird bereinigt
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  // Für iOS/Android (Expo)
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  useEffect(() => {
    setLoading(false);
  }, []);

  const sendCode = async () => {
    try {
      // E.164 Format herstellen
      const cleanPhone = phone.replace(/\s+/g, "");

      if (!cleanPhone.startsWith("+")) {
        Alert.alert("Fehler", "Bitte Telefonnummer im Format +43... eingeben.");
        return;
      }

      let confirmationResult;

      if (Platform.OS === "web") {
        // Web-Version
        if (!window.recaptchaVerifier) {
          window.recaptchaVerifier = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            { size: "invisible" }
          );
        }

        confirmationResult = await signInWithPhoneNumber(
          auth,
          cleanPhone,
          window.recaptchaVerifier
        );
      } else {
        // Mobile (Expo)
        if (!recaptchaVerifier.current) {
          throw new Error("reCAPTCHA nicht geladen");
        }

        confirmationResult = await signInWithPhoneNumber(
          auth,
          cleanPhone,
          // @ts-ignore
          recaptchaVerifier.current
        );
      }

      setConfirmation(confirmationResult);
      Alert.alert("Code gesendet", "Bitte SMS-Code eingeben!");
    } catch (err: any) {
      console.log("Fehler bei sendCode:", err);
      Alert.alert("Fehler beim Senden", err.message || String(err));
    }
  };

  const confirmCode = async () => {
    try {
      if (!confirmation) {
        Alert.alert("Fehler", "Kein aktiver Login-Vorgang!");
        return;
      }

      const userCred = await confirmation.confirm(code);
      const uid = userCred.user.uid;

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        if (!username.trim()) {
          Alert.alert("Fehler", "Bitte Benutzernamen eingeben.");
          return;
        }

        // Check ob Username schon existiert
        const q = query(
          collection(db, "usernames"),
          where("username", "==", username.trim())
        );
        const existing = await getDocs(q);

        if (!existing.empty) {
          Alert.alert("Fehler", "Benutzername bereits vergeben.");
          return;
        }

        await addDoc(collection(db, "usernames"), {
          uid,
          username: username.trim(),
        });

        await setDoc(userRef, {
          uid,
          phone: phone.replace(/\s+/g, ""),
          username: username.trim(),
          role: "student",
        });
      }

      Alert.alert("Login erfolgreich!");
      router.replace("../(tabs)");
    } catch (err: any) {
      console.log("Fehler bei confirmCode:", err);
      Alert.alert("Fehler", err.message || String(err));
    }
  };

  const testLogin = async () => {
    try {
      const cred = await signInAnonymously(auth);
      Alert.alert("Testlogin erfolgreich", cred.user.uid);
    } catch (err: any) {
      Alert.alert("Fehler beim Testlogin", err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Lade...</Text>
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
    <View style={styles.container}>
      {/* Recaptcha für Mobile */}
      {Platform.OS !== "web" && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />
      )}

      {/* Recaptcha für Web */}
      {Platform.OS === "web" &&
        typeof document !== "undefined" &&
        React.createElement("div", { id: "recaptcha-container" })}

      <Text variant="headlineSmall" style={styles.title}>
        📱 Telefon-Login
      </Text>

      {!confirmation ? (
        <>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+43 ..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
          />
          <Button title="Code senden" onPress={sendCode} />

          <View style={{ marginTop: 20 }}>
            <Button title="🧪 Testlogin" color="orange" onPress={testLogin} />
          </View>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="SMS-Code"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Benutzername"
          />
          <Button title="Login bestätigen" onPress={confirmCode} />
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
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
});
