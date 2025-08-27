// app/auth.tsx
import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth } from "../firebase";
import { saveLocalUser, loadLocalUser } from "../localUser";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(true);

  const handleAuth = async () => {
    try {
      // === ÖH ACCOUNTS (Firebase) ===
      if (email.endsWith("@oeh.at")) {
        let userCredential: UserCredential;

        if (isRegister) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          Alert.alert("ÖH Registrierung erfolgreich!", `Willkommen ${username}`);
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          Alert.alert("ÖH Login erfolgreich!", `Willkommen zurück ${userCredential.user.email}`);
        }
      }

      // === Studenten ACCOUNTS (lokal) ===
      else {
        if (isRegister) {
          await saveLocalUser(email, username);
          Alert.alert("Registrierung erfolgreich!", `Willkommen ${username}`);
        } else {
          const localUser = await loadLocalUser();
          if (localUser && localUser.email === email) {
            Alert.alert("Login erfolgreich!", `Willkommen zurück ${localUser.username}`);
          } else {
            Alert.alert("Fehler", "Kein lokales Benutzerprofil gefunden!");
          }
        }
      }
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? "Registrieren" : "Login"}</Text>

      <TextInput
        style={styles.input}
        placeholder="E-Mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Benutzername"
          value={username}
          onChangeText={setUsername}
        />
      )}

      <Button title={isRegister ? "Registrieren" : "Login"} onPress={handleAuth} />

      <Text
        style={styles.switch}
        onPress={() => setIsRegister(!isRegister)}
      >
        {isRegister ? "Schon ein Konto? Hier einloggen" : "Noch kein Konto? Registrieren"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 5 },
  switch: { marginTop: 20, color: "blue", textAlign: "center" },
});
