// app/index.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Button, TextInput, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { saveLocalUser, loadLocalUser } from "../localUser";

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "oeh" | null>(null);

  // Inputs
  const [username, setUsername] = useState("");
  const [matrikel, setMatrikel] = useState(""); // optional, kannst du rauswerfen
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Prüfen ob schon eingeloggt
  useEffect(() => {
    (async () => {
      const localUser = await loadLocalUser();
      if (localUser || auth.currentUser) {
        router.replace("/(tabs)/news");
      }
    })();
  }, []);

  if (!role) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔑 Login</Text>
        <Button title="Student" onPress={() => setRole("student")} />
        <Button title="ÖH" onPress={() => setRole("oeh")} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {role === "student" ? (
        <>
          <Text style={styles.title}>👩‍🎓 Student Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Benutzername"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="E-Mail (nur lokal gespeichert)"
            value={email}
            onChangeText={setEmail}
          />
          <Button
            title="Login"
            onPress={async () => {
              try {
                if (!username) {
                  Alert.alert("Fehler", "Bitte einen Benutzernamen eingeben.");
                  return;
                }
                // Benutzername prüfen & speichern
                await saveLocalUser(email || "-", username);
                router.replace("/(tabs)/news");
              } catch (err: any) {
                Alert.alert("Fehler", err.message);
              }
            }}
          />
        </>
      ) : (
        <>
          <Text style={styles.title}>🛠️ ÖH Login</Text>
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
            title="Login"
            onPress={async () => {
              try {
                await signInWithEmailAndPassword(auth, email, password);
                router.replace("/(tabs)/news");
              } catch (err: any) {
                Alert.alert("Fehler", err.message);
              }
            }}
          />
        </>
      )}
      <Button title="Zurück" onPress={() => setRole(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
});
