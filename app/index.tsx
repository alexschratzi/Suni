// app/index.tsx
import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { auth, db } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";

export default function LoginScreen() {
  const router = useRouter();
  const recaptchaVerifier = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    if (auth.currentUser) {
      router.replace("/(tabs)/news");
    } else {
      setLoading(false);
    }
  }, []);

  const sendCode = async () => {
    try {
      let conf;
      if (Platform.OS === "web") {
        conf = await signInWithPhoneNumber(auth, phone, recaptchaVerifier.current!);
      } else {
        conf = await signInWithPhoneNumber(auth, phone, recaptchaVerifier.current);
      }
      setConfirmation(conf);
      Alert.alert("SMS-Code verschickt!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

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
      {Platform.OS === "web" ? (
        <div id="recaptcha-container"></div>
      ) : (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={{
            apiKey: "AIzaSyBxTehFpuCXrU7-yCEBDee4C17jRzZRqzY",
            authDomain: "test-projekt-23e8b.firebaseapp.com",
            projectId: "test-projekt-23e8b",
            storageBucket: "test-projekt-23e8b.firebasestorage.app",
            messagingSenderId: "986555980321",
            appId: "1:986555980321:web:e007191c65240ffea62160",
            measurementId: "G-4V08R3JEX5"
          }}
        />
      )}
      <Text style={styles.title}>📱 Telefon-Login</Text>

      <TextInput
        style={styles.input}
        placeholder="+43 ..."
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Button title="Code senden" onPress={sendCode} />

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
          <Button title="Bestätigen" onPress={confirmCode} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 8 },
});
