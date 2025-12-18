// app/(drawer)/friends.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Divider,
  Snackbar,
  Avatar,
  List,
  Surface,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { auth, db } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { initials } from "@/utils/utils";

type ProfileMap = Record<string, { username?: string } | undefined>;
type SearchResult = { username: string; uid: string };

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const me = auth.currentUser;

  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [snack, setSnack] = useState("");

  const [incoming, setIncoming] = useState<string[]>([]);
  const [outgoing, setOutgoing] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    if (!me) return;

    const userRef = doc(db, "users", me.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      const data = snap.data() || {};
      setIncoming(data.pendingReceived || []);
      setOutgoing(data.pendingSent || []);
      setLoadingLists(false);
    });

    return () => unsub();
  }, [me]);

  useEffect(() => {
    const all = [...incoming, ...outgoing];
    const missing = Array.from(new Set(all.filter((uid) => !profiles[uid])));
    if (!missing.length) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const username = snap.exists() ? snap.data().username : undefined;
          return [uid, { username }] as const;
        })
      );
      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [incoming, outgoing, profiles]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || uid,
    [profiles]
  );

  const searchUser = async () => {
    if (!me) {
      setSnack("Nicht eingeloggt");
      return;
    }

    const value = searchValue.trim();
    if (!value) {
      setSnack("Bitte Username eingeben");
      return;
    }

    setSearching(true);
    try {
      const q = query(collection(db, "usernames"), where("username", "==", value));
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult(null);
        setSnack("User nicht gefunden");
      } else {
        setResult(snap.docs[0].data() as SearchResult);
      }
    } catch (err) {
      console.error("Fehler bei Suche:", err);
      setSnack("Fehler bei der Suche");
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetUid: string) => {
    if (!me) return;

    if (targetUid === me.uid) {
      setSnack("Du kannst dich nicht selbst hinzufügen");
      return;
    }

    const myRef = doc(db, "users", me.uid);
    const targetRef = doc(db, "users", targetUid);

    try {
      const [mySnap, targetSnap] = await Promise.all([getDoc(myRef), getDoc(targetRef)]);
      const myData = mySnap.data() || {};
      const targetData = targetSnap.data() || {};

      if ((myData.friends || []).includes(targetUid)) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }
      if ((myData.pendingSent || []).includes(targetUid)) {
        setSnack("Anfrage bereits gesendet");
        return;
      }
      if ((myData.pendingReceived || []).includes(targetUid)) {
        setSnack("Dieser Nutzer hat dir bereits geschrieben");
        return;
      }
      if ((targetData.pendingReceived || []).includes(me.uid)) {
        setSnack("Anfrage ist schon offen");
        return;
      }

      await setDoc(myRef, { pendingSent: arrayUnion(targetUid) }, { merge: true });
      await setDoc(targetRef, { pendingReceived: arrayUnion(me.uid) }, { merge: true });

      setSnack("Freundschaftsanfrage gesendet");
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack("Fehler beim Senden der Anfrage");
    }
  };

  const accept = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      const [mySnap, otherSnap] = await Promise.all([getDoc(myRef), getDoc(otherRef)]);

      const myFriends: string[] = mySnap.data()?.friends || [];
      if (myFriends.includes(otherUid)) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }

      await setDoc(
        myRef,
        {
          pendingReceived: arrayRemove(otherUid),
          friends: arrayUnion(otherUid),
        },
        { merge: true }
      );

      await setDoc(
        otherRef,
        {
          pendingSent: arrayRemove(me.uid),
          friends: arrayUnion(me.uid),
        },
        { merge: true }
      );

      // DM-Thread erstellen, falls er noch nicht existiert
      const threadId = me.uid < otherUid ? `${me.uid}_${otherUid}` : `${otherUid}_${me.uid}`;
      const threadRef = doc(db, "dm_threads", threadId);
      const threadSnap = await getDoc(threadRef);

      if (!threadSnap.exists()) {
        await setDoc(
          threadRef,
          {
            users: [me.uid, otherUid],
            lastMessage: "",
            lastTimestamp: null,
          },
          { merge: true }
        );
      }

      setSnack("Freund hinzugefügt!");
    } catch (err) {
      console.error("Fehler beim Annehmen:", err);
      setSnack("Fehler beim Annehmen");
    }
  };

  const decline = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      await setDoc(myRef, { pendingReceived: arrayRemove(otherUid) }, { merge: true });
      await setDoc(otherRef, { pendingSent: arrayRemove(me.uid) }, { merge: true });

      setSnack("Anfrage abgelehnt");
    } catch (err) {
      console.error("Fehler beim Ablehnen:", err);
      setSnack("Fehler beim Ablehnen");
    }
  };

  if (!me) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>Bitte erneut anmelden.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Surface style={styles.card} mode="elevated">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              Freunde
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Suche Nutzer, schicke Anfragen und verwalte eingehende sowie gesendete Requests.
            </Text>
          </View>
          <Button
            mode="text"
            compact
            icon="account-circle"
            onPress={() => router.push("/(drawer)/profile")}
          >
            Profil
          </Button>
        </View>
      </Surface>

      <Surface style={styles.card} mode="elevated">
        <Text variant="titleMedium" style={styles.cardTitle}>
          Freund finden
        </Text>
        <TextInput
          mode="outlined"
          label="Username"
          placeholder="z. B. alex"
          value={searchValue}
          onChangeText={setSearchValue}
          style={{ marginBottom: 12 }}
        />
        <Button mode="contained" onPress={searchUser} loading={searching}>
          Suchen & Anfrage senden
        </Button>

        {result && (
          <>
            <Divider style={{ marginVertical: 12 }} />
            <List.Item
              title={result.username}
              description="User gefunden"
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(props) => (
                <Avatar.Text
                  {...props}
                  size={40}
                  label={initials(result.username)}
                  color={theme.colors.onPrimary}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
              right={() => (
                <Button compact mode="contained" onPress={() => sendRequest(result.uid)}>
                  Anfrage
                </Button>
              )}
              onPress={() => sendRequest(result.uid)}
            />
          </>
        )}
      </Surface>

      <Surface style={styles.card} mode="elevated">
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Eingehende Anfragen
          </Text>
        </View>

        {loadingLists ? (
          <ActivityIndicator style={{ marginVertical: 8 }} />
        ) : incoming.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Keine offenen Anfragen</Text>
        ) : (
          incoming.map((uid) => (
            <List.Item
              key={uid}
              title={displayName(uid)}
              description="Möchte mit dir befreundet sein"
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(props) => (
                <Avatar.Text
                  {...props}
                  size={40}
                  label={initials(displayName(uid))}
                  color={theme.colors.onPrimary}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
              right={() => (
                <View style={{ flexDirection: "row" }}>
                  <Button compact onPress={() => accept(uid)}>
                    Annehmen
                  </Button>
                  <Button compact textColor="red" onPress={() => decline(uid)}>
                    Ablehnen
                  </Button>
                </View>
              )}
            />
          ))
        )}
      </Surface>

      <Surface style={styles.card} mode="elevated">
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Gesendete Anfragen
          </Text>
        </View>

        {loadingLists ? (
          <ActivityIndicator style={{ marginVertical: 8 }} />
        ) : outgoing.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Nichts offen</Text>
        ) : (
          outgoing.map((uid) => (
            <List.Item
              key={uid}
              title={displayName(uid)}
              description="Wartet auf Antwort"
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(props) => (
                <Avatar.Text
                  {...props}
                  size={40}
                  label={initials(displayName(uid))}
                  color={theme.colors.onPrimary}
                  style={{ backgroundColor: theme.colors.secondary }}
                />
              )}
              right={() => (
                <View style={{ justifyContent: "center" }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>Gesendet</Text>
                </View>
              )}
            />
          ))
        )}
      </Surface>

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2000}>
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
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
