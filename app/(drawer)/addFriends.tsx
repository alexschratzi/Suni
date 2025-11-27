// app/addFriend.tsx
import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Card,
  ActivityIndicator,
} from "react-native-paper";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  arrayUnion,
} from "firebase/firestore";

export default function AddFriendScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState("");

  const me = auth.currentUser;

  const searchUser = async () => {
    if (!username.trim()) {
      setSnack("Bitte Username eingeben");
      return;
    }
    if (!me) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "usernames"),
        where("username", "==", username.trim())
      );
      const resultSnap = await getDocs(q);

      if (resultSnap.empty) {
        setResult(null);
        setSnack("User nicht gefunden");
      } else {
        setResult(resultSnap.docs[0].data());
      }
    } catch (err) {
      console.error("Fehler bei Suche:", err);
      setSnack("Fehler bei der Suche");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (targetUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const targetRef = doc(db, "users", targetUid);

    try {
      // eigene ausgehende Anfragen
      await setDoc(
        myRef,
        {
          pendingSent: arrayUnion(targetUid),
        },
        { merge: true }
      );

      // beim anderen: eingehende Anfrage
      await setDoc(
        targetRef,
        {
          pendingReceived: arrayUnion(me.uid),
        },
        { merge: true }
      );

      setSnack("Freundschaftsanfrage gesendet");
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack("Fehler beim Senden der Anfrage");
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={{ marginBottom: 20 }}>
        Freund hinzufügen
      </Text>

      <TextInput
        mode="outlined"
        label="Benutzername"
        placeholder="z. B. alex"
        value={username}
        onChangeText={setUsername}
        style={{ marginBottom: 12 }}
      />

      <Button mode="contained" onPress={searchUser}>
        Suchen
      </Button>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {result && (
        <Card mode="outlined" style={{ marginTop: 20 }}>
          <Card.Title title={result.username} subtitle="User gefunden" />
          <Card.Actions>
            <Button
              mode="contained"
              icon="account-plus"
              onPress={() => sendRequest(result.uid)}
            >
              Anfrage senden
            </Button>
          </Card.Actions>
        </Card>
      )}

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2000}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
