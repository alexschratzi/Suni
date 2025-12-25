import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface, useTheme } from "react-native-paper";

import { auth } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from "firebase/auth";

import { loadLocalUser, saveLocalUser } from "../../localUser";

export default function AuthScreen() {
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isRegister, setIsRegister] = useState(true);

  const handleAuth = async () => {
    try {
      if (email.endsWith("@oeh.at")) {
        let userCredential: UserCredential;

        if (isRegister) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          Alert.alert("ÖH Registrierung erfolgreich!", `Willkommen ${username}`);
        } else {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
          Alert.alert("ÖH Login erfolgreich!", `Willkommen zurück ${userCredential.user.email}`);
        }
      } else {
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
      Alert.alert("Fehler", err?.message ?? String(err));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Surface
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
          backgroundColor: theme.colors.background,
        }}
      >
        <Text variant="headlineSmall" style={{ textAlign: "center", marginBottom: 20 }}>
          {isRegister ? "Registrieren" : "Login"}
        </Text>

        <TextInput
          mode="outlined"
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={{ marginBottom: 10 }}
        />

        <TextInput
          mode="outlined"
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ marginBottom: 10 }}
        />

        {isRegister && (
          <TextInput
            mode="outlined"
            label="Benutzername"
            value={username}
            onChangeText={setUsername}
            style={{ marginBottom: 10 }}
          />
        )}

        <Button mode="contained" onPress={handleAuth}>
          {isRegister ? "Registrieren" : "Login"}
        </Button>

        <Text
          style={{
            marginTop: 20,
            textAlign: "center",
            color: theme.colors.primary,
          }}
          onPress={() => setIsRegister(!isRegister)}
        >
          {isRegister ? "Schon ein Konto? Hier einloggen" : "Noch kein Konto? Registrieren"}
        </Text>
      </Surface>
    </KeyboardAvoidingView>
  );
}
