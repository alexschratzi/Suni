// app/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, Button, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { loadLocalUser, saveLocalUser, clearLocalUser, LocalUser } from "../localUser";
import { useRouter } from "expo-router";

export default function StartScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);

  // State für Login-Form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  // Checke ÖH-User (Firebase)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Checke Studenten-User (local)
  useEffect(() => {
    loadLocalUser().then((user) => {
      setLocalUser(user);
      setLoading(false);
    });
  }, []);

  // Wenn einer von beiden eingeloggt ist → weiter ins App
  useEffect(() => {
    if (firebaseUser || localUser) {
      router.replace("/(tabs)/news"); // 🔑 Ziel: erster Tab
    }
  }, [firebaseUser, localUser]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Checking auth state...</Text>
      </View>
    );
  }

  // LOGIN SCREEN
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔑 Login</Text>

      <Text style={styles.heading}>Student (lokal)</Text>
      <TextInput
        style={styles.input}
        placeholder="Benutzername"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        title="Als Student einloggen"
        onPress={async () => {
          await saveLocalUser(email, username);
          setLocalUser(await loadLocalUser());
          router.replace("/(tabs)/news");
        }}
      />

      <Text style={styles.heading}>ÖH Account (Firebase)</Text>
      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title="Als ÖH einloggen"
        onPress={async () => {
          try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace("/(tabs)/news");
          } catch (err) {
            console.error("❌ Login fehlgeschlagen:", err);
          }
        }}
      />

      <Text style={styles.note}>Wenn du eingeloggt bist, wirst du beim nächsten Start automatisch weitergeleitet 🚀</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  heading: { fontSize: 20, fontWeight: "600", marginTop: 20, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  note: { marginTop: 20, fontSize: 14, color: "#666", textAlign: "center" },
});
