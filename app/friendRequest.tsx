// app/friendRequests.tsx
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import {
  Text,
  List,
  Divider,
  Button,
  Snackbar,
  ActivityIndicator,
} from "react-native-paper";
import { auth, db } from "../firebase";
import {
  doc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  setDoc,
} from "firebase/firestore";

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<string[]>([]);
  const [snack, setSnack] = useState("");
  const [loading, setLoading] = useState(true);

  const me = auth.currentUser;

  useEffect(() => {
    if (!me) return;

    const userRef = doc(db, "users", me.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setRequests(snap.data().pendingReceived || []);
      } else {
        setRequests([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const accept = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      // 1. Freunde + Pending aktualisieren
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

      // 2. DM-Thread erstellen
      const threadId =
        me.uid < otherUid ? `${me.uid}_${otherUid}` : `${otherUid}_${me.uid}`;

      await setDoc(
        doc(db, "dm_threads", threadId),
        {
          users: [me.uid, otherUid],
          lastMessage: "",
          lastTimestamp: null,
        },
        { merge: true }
      );

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
      await setDoc(
        myRef,
        { pendingReceived: arrayRemove(otherUid) },
        { merge: true }
      );

      await setDoc(
        otherRef,
        { pendingSent: arrayRemove(me.uid) },
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
    <View>
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
          title={uid}
          description="Möchte mit dir befreundet sein"
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
