// app/(drawer)/friendRequests.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  Text,
  List,
  Divider,
  Button,
  Snackbar,
  ActivityIndicator,
  Avatar,
  useTheme,
} from "react-native-paper";
import { auth, db } from "@/firebase";
import firestore from "@react-native-firebase/firestore";
import { initials } from "@/utils/utils";

type ProfileMap = Record<string, { username?: string } | undefined>;

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [snack, setSnack] = useState("");
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const me = auth.currentUser;

  useEffect(() => {
    if (!me) return;

    const userRef = db.collection("users").doc(me.uid);
    const unsub = userRef.onSnapshot((snap) => {
      if (snap.exists()) {
        setRequests(snap.data().pendingReceived || []);
      } else {
        setRequests([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [me]);

  useEffect(() => {
    const missing = Array.from(
      new Set(requests.filter((uid) => !profiles[uid]))
    );

    if (!missing.length) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          const snap = await db.collection("users").doc(uid).get();
          const username = snap.exists() ? snap.data()?.username : undefined;
          return [uid, { username }] as const;
        })
      );

      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [profiles, requests]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || uid,
    [profiles]
  );

  const accept = async (otherUid: string) => {
    if (!me) return;

    const myRef = db.collection("users").doc(me.uid);
    const otherRef = db.collection("users").doc(otherUid);

    try {
      const [mySnap, otherSnap] = await Promise.all([myRef.get(), otherRef.get()]);

      const myFriends: string[] = mySnap.data()?.friends || [];
      if (myFriends.includes(otherUid)) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }

      // 1. Freunde + Pending aktualisieren
      await myRef.set(
        {
          pendingReceived: firestore.FieldValue.arrayRemove(otherUid),
          friends: firestore.FieldValue.arrayUnion(otherUid),
        },
        { merge: true }
      );

      await otherRef.set(
        {
          pendingSent: firestore.FieldValue.arrayRemove(me.uid),
          friends: firestore.FieldValue.arrayUnion(me.uid),
        },
        { merge: true }
      );

      // 2. DM-Thread erstellen, falls er noch nicht existiert
    const threadId =
      me.uid < otherUid ? `${me.uid}_${otherUid}` : `${otherUid}_${me.uid}`;
    const threadRef = db.collection("dm_threads").doc(threadId);
    const threadSnap = await threadRef.get();

    if (!threadSnap.exists()) {
      await threadRef.set(
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

    const myRef = db.collection("users").doc(me.uid);
    const otherRef = db.collection("users").doc(otherUid);

    try {
      await myRef.set(
        { pendingReceived: firestore.FieldValue.arrayRemove(otherUid) },
        { merge: true }
      );

      await otherRef.set(
        { pendingSent: firestore.FieldValue.arrayRemove(me.uid) },
        { merge: true }
      );

      setSnack("Anfrage abgelehnt");
    } catch (err) {
      console.error("Fehler beim Ablehnen:", err);
      setSnack("Fehler beim Ablehnen");
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ padding: 16 }}>
        Anfragen
      </Text>
      <Divider />
      {requests.length === 0 && (
        <Text style={{ padding: 16 }}>Keine Anfragen</Text>
      )}

      {requests.map((uid) => (
        <List.Item
          key={uid}
          title={displayName(uid)}
          description="Möchte mit dir befreundet sein"
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
              <Button onPress={() => accept(uid)}>Annehmen</Button>
              <Button onPress={() => decline(uid)} textColor="red">
                Ablehnen
              </Button>
            </View>
          )}
        />
      ))}

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")}>
        {snack}
      </Snackbar>
    </View>
  );
}
