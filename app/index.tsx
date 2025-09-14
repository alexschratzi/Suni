// app/index.tsx
import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { auth, db, firebaseConfig } from "../firebase";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";

export default function LoginScreen() {
  const router = useRouter();
  const recaptchaVerifier = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      router.replace("/(tabs)/news");
    } else {
      setLoading(false);
    }
  }, []);

  const sendCode = async () => {
    try {
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phone, recaptchaVerifier.current!);
      setVerificationId(id);
      Alert.alert("SMS-Code verschickt!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  const confirmCode = async () => {
    try {
      if (!verificationId) return;
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCred = await signInWithCredential(auth, credential);

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
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} />

      <Text style={styles.title}>📱 Telefon-Login</Text>

      <TextInput
        style={styles.input}
        placeholder="+43 ..."
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Button title="Code senden" onPress={sendCode} />

      {verificationId && (
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
