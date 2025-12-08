// app/(drawer)/addFriends.tsx
import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  List,
} from "react-native-paper";
import { auth, db } from "@/firebase";
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
      await setDoc(
        myRef,
        { pendingSent: arrayUnion(targetUid) },
        { merge: true }
      );

      await setDoc(
        targetRef,
        { pendingReceived: arrayUnion(me.uid) },
        { merge: true }
      );

      setSnack("Freundschaftsanfrage gesendet");
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack("Fehler beim Senden der Anfrage");
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <Text
        variant="titleLarge"
        style={[styles.title, { color: theme.colors.onBackground }]}
      >
        Freund hinzufügen
      </Text>

      {/* Search input (not a card!) */}
      <TextInput
        mode="outlined"
        label="Benutzername"
        placeholder="z. B. alex"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <Button mode="contained" onPress={searchUser} loading={loading}>
        Suchen
      </Button>

      {/* Search result as menu */}
      {result && (
        <List.Section style={styles.listSection}>
          <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
            Suchergebnis
          </List.Subheader>

          <List.Item
            title={result.username}
            description="User gefunden"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="account-circle" />}
            right={(props) => (
              <Button
                mode="contained"
                compact
                icon="account-plus"
                onPress={() => sendRequest(result.uid)}
              >
                Anfrage
              </Button>
            )}
            onPress={() => sendRequest(result.uid)}
          />
        </List.Section>
      )}

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={2000}
      >
        {snack}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    minHeight: "100%",
  },
  title: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  listSection: {
    marginTop: 20,
  },
});
