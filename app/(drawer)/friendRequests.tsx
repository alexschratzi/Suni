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
import { initials } from "@/utils/utils";

import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

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

    const userRef = doc(db, "users", me.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setRequests((snap.data() as any).pendingReceived || []);
        } else {
          setRequests([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("FriendRequests onSnapshot error:", err);
        setRequests([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [me?.uid]);

  useEffect(() => {
    const missing = Array.from(new Set(requests.filter((uid) => !profiles[uid])));
    if (!missing.length) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const username = snap.exists() ? (snap.data() as any)?.username : undefined;
          return [uid, { username }] as const;
        })
      );

      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [requests, profiles]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || uid,
    [profiles]
  );

  const accept = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      const [mySnap, otherSnap] = await Promise.all([getDoc(myRef), getDoc(otherRef)]);

      const myFriends: string[] = (mySnap.data() as any)?.friends || [];
      if (myFriends.includes(otherUid)) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }

      // 1) Friends + pending updates
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

      // 2) Create DM thread if not exists
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ padding: 16 }}>
        Anfragen
      </Text>
      <Divider />

      {requests.length === 0 && <Text style={{ padding: 16 }}>Keine Anfragen</Text>}

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
