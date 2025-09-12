import { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase";
import { PhoneAuthProvider, signInWithCredential, RecaptchaVerifier } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);

  useEffect(() => {
    if (auth.currentUser) {
      router.replace("/(tabs)/news");
    }
  }, []);

  const sendCode = async () => {
    try {
      // Recaptcha muss im echten Gerät laufen
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phone, verifier);
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
        // neues Profil anlegen
        await setDoc(userRef, {
          phone,
          username: "NeuerUser",
          role: "student",
        });
      }

      router.replace("/(tabs)/news");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  return (
    <View style={styles.container}>
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
          <Button title="Bestätigen" onPress={confirmCode} />
        </>
      )}
      {/* Wichtig für Recaptcha */}
      <View id="recaptcha-container" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 8 },
});
