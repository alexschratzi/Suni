// app/(app)/(stack)/friends.tsx
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
import { initials } from "@/utils/utils";
import { useTranslation } from "react-i18next";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";

type ProfileMap = Record<string, { username?: string } | undefined>;
type SearchResult = { username: string; uid: string };

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const me = auth.currentUser;
  const { t } = useTranslation();

  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [snack, setSnack] = useState("");

  const [incoming, setIncoming] = useState<string[]>([]);
  const [outgoing, setOutgoing] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    if (!me) return;

    const userRef = doc(db, "users", me.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data() || {};
        setIncoming((data as any).pendingReceived || []);
        setOutgoing((data as any).pendingSent || []);
        setBlocked((data as any).blocked || []);
        setLoadingLists(false);
      },
      (err) => {
        console.error("Friends onSnapshot error:", err);
        setIncoming([]);
        setOutgoing([]);
        setBlocked([]);
        setLoadingLists(false);
      }
    );

    return () => unsub();
  }, [me?.uid]);

  useEffect(() => {
    const all = [...incoming, ...outgoing, ...blocked];
    const missing = Array.from(new Set(all.filter((uid) => !profiles[uid])));
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
  }, [incoming, outgoing, blocked, profiles]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || uid,
    [profiles]
  );

  const searchUser = async () => {
    if (!me) {
      setSnack(t("friends.snacks.needLogin"));
      return;
    }

    const value = searchValue.trim();
    if (!value) {
      setSnack(t("friends.snacks.enterUsername"));
      return;
    }

    setSearching(true);
    try {
      const q = query(collection(db, "usernames"), where("username", "==", value));
      const snap = await getDocs(q);

      if (snap.empty) {
        setResult(null);
        setSnack(t("friends.errors.notFound"));
      } else {
        setResult(snap.docs[0].data() as SearchResult);
      }
    } catch (err) {
      console.error("Fehler bei Suche:", err);
      setSnack(t("friends.errors.search"));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetUid: string) => {
    if (!me) return;
    if (targetUid === me.uid) {
      setSnack(t("friends.snacks.self"));
      return;
    }

    const myRef = doc(db, "users", me.uid);
    const targetRef = doc(db, "users", targetUid);

    try {
      const [mySnap, targetSnap] = await Promise.all([getDoc(myRef), getDoc(targetRef)]);
      const myData = mySnap.data() || {};
      const targetData = targetSnap.data() || {};

      if ((targetData as any).blocked?.includes(me.uid)) {
        setSnack(t("friends.snacks.blockedByOther"));
        return;
      }
      if ((myData as any).blocked?.includes(targetUid)) {
        setSnack(t("friends.snacks.youBlocked"));
        return;
      }
      if ((myData as any).friends?.includes(targetUid)) {
        setSnack(t("friends.snacks.alreadyFriends"));
        return;
      }
      if ((myData as any).pendingSent?.includes(targetUid)) {
        setSnack(t("friends.snacks.pendingSent"));
        return;
      }
      if ((myData as any).pendingReceived?.includes(targetUid)) {
        setSnack(t("friends.snacks.pendingReceived"));
        return;
      }
      if ((targetData as any).pendingReceived?.includes(me.uid)) {
        setSnack(t("friends.snacks.alreadyOpen"));
        return;
      }

      await setDoc(myRef, { pendingSent: arrayUnion(targetUid) }, { merge: true });
      await setDoc(targetRef, { pendingReceived: arrayUnion(me.uid) }, { merge: true });

      setSnack(t("friends.snacks.sent"));
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack(t("friends.errors.send"));
    }
  };

  const accept = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      const [mySnap, otherSnap] = await Promise.all([getDoc(myRef), getDoc(otherRef)]);

      const myFriends: string[] = ((mySnap.data() as any)?.friends) || [];
      if (myFriends.includes(otherUid)) {
        setSnack(t("friends.snacks.alreadyFriends"));
        return;
      }

      // DM-Thread erstellen, falls er noch nicht existiert
      const threadId = me.uid < otherUid ? `${me.uid}_${otherUid}` : `${otherUid}_${me.uid}`;
      const threadRef = doc(db, "dm_threads", threadId);
      const threadSnap = await getDoc(threadRef);

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

      if (!threadSnap.exists()) {
        await setDoc(
          threadRef,
          {
            users: [me.uid, otherUid],
            lastMessage: "",
            lastTimestamp: null,
            hiddenBy: [],
          },
          { merge: true }
        );
      }

      setSnack(t("friends.snacks.added"));
    } catch (err) {
      console.error("Fehler beim Annehmen:", err);
      setSnack(t("friends.errors.accept"));
    }
  };

  const decline = async (otherUid: string) => {
    if (!me) return;

    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      await setDoc(myRef, { pendingReceived: arrayRemove(otherUid) }, { merge: true });
      await setDoc(otherRef, { pendingSent: arrayRemove(me.uid) }, { merge: true });

      setSnack(t("friends.snacks.declined"));
    } catch (err) {
      console.error("Fehler beim Ablehnen:", err);
      setSnack(t("friends.errors.decline"));
    }
  };

  const blockUser = async (otherUid: string) => {
    if (!me) return;
    const myRef = doc(db, "users", me.uid);
    const otherRef = doc(db, "users", otherUid);

    try {
      const [mySnap] = await Promise.all([getDoc(myRef), getDoc(otherRef)]);
      const myData = mySnap.data() || {};

      if (((myData as any).blocked || []).includes(otherUid)) {
        setSnack(t("friends.snacks.blocked"));
        return;
      }

      await setDoc(
        myRef,
        {
          blocked: arrayUnion(otherUid),
          friends: arrayRemove(otherUid),
          pendingSent: arrayRemove(otherUid),
          pendingReceived: arrayRemove(otherUid),
        },
        { merge: true }
      );

      await setDoc(
        otherRef,
        {
          friends: arrayRemove(me.uid),
          pendingSent: arrayRemove(me.uid),
          pendingReceived: arrayRemove(me.uid),
        },
        { merge: true }
      );

      setSnack(t("friends.snacks.blocked"));
    } catch (err) {
      console.error("Fehler beim Blockieren:", err);
      setSnack(t("friends.errors.block"));
    }
  };

  const unblockUser = async (otherUid: string) => {
    if (!me) return;
    const myRef = doc(db, "users", me.uid);
    try {
      await setDoc(myRef, { blocked: arrayRemove(otherUid) }, { merge: true });
      setSnack(t("friends.snacks.unblocked"));
    } catch (err) {
      console.error("Fehler beim Entblocken:", err);
      setSnack(t("friends.errors.unblock"));
    }
  };

  if (!me) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>{t("friends.snacks.needLogin")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* ... UI unchanged ... */}
      <Surface style={styles.card} mode="elevated">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {t("friends.title")}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("friends.subtitle")}
            </Text>
          </View>
          <Button
            mode="text"
            compact
            icon="account-circle"
            onPress={() => router.push("/(app)/(stack)/profile")}
          >
            {t("profile.title", "Profil")}
          </Button>
        </View>
      </Surface>

      {/* rest of your JSX stays the same */}
      {/* (No further Firebase-specific code below this point.) */}

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
