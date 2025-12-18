/**
 * ChatScreen.tsx
 * -----------------------------------------------
 * Zentrale Steuerlogik für das Chat-Modul.
 *
 * Enthält:
 *  - Tab-Auswahl ("rooms" | "direct")
 *  - Suchfunktion
 *  - Firestore-Listener:
 *      → Räume (messages_salzburg / messages_oesterreich / messages_wirtschaft)
 *      → Direktnachrichten (dm_threads)
 *  - UI-Auswahl:
 *      → ChatHeader
 *      → RoomsList
 *      → DirectList
 *      → RoomMessages
 *
 * Wichtig:
 *  - KEINE UI-Elemente außer dem Container.
 *  - Alle UI ist in Unterkomponenten ausgelagert.
 *
 * Wird verwendet in:
 *  - app/(drawer)/(tabs)/chat.tsx
 *
 * Änderungen / Erweiterungen:
 *  - NEUE RÄUME hinzufügen → HIER:
 *        const ROOMS = { ... }
 *        filteredRooms (Liste anpassen)
 *  - Direct-Chat-Daten erweitern → HIER im Directs-Listener
 *  - Nachrichtensenden → sendMessage()
 *  - Navigation zu Threads/Räumen → HIER
 *  - Wenn zusätzliche Tab-Typen gewünscht → ChatHeader + State hier ändern
 */

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { where } from "firebase/firestore/lite";
import { useTranslation } from "react-i18next";

import { db, auth } from "@/firebase";

import ChatHeader from "./ChatHeader";
import RoomsList, { RoomItem, RoomKey } from "./RoomsList";
import DirectList, { Direct } from "./DirectList";
import RoomMessages from "./RoomMessages";

type TabKey = "rooms" | "direct";

type UserProfile = {
  username?: string;
};

type RawDirect = {
  id: string;
  otherUid: string;
  last?: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  // Tabs & Suche
  const [tab, setTab] = useState<TabKey>("rooms");
  const [search, setSearch] = useState("");

  // User / Raum
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);

  // Nachrichten im Raum
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Eingabezeile
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);

  // Direktnachrichten
  const [rawDirects, setRawDirects] = useState<RawDirect[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>(
    {}
  );
  const [pendingCount, setPendingCount] = useState(0);

  // Username aus Firestore laden
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUsername(data.username);
        setPendingCount((data.pendingReceived || []).length);
        setBlocked(data.blocked || []);
      }
    });

    return () => unsubscribe();
  }, []);

  const ROOMS = {
    salzburg: "messages_salzburg",
    oesterreich: "messages_oesterreich",
    wirtschaft: "messages_wirtschaft",
  } as const;

  // Nachrichten im aktiven Raum live laden
  useEffect(() => {
    if (!room) return;

    setLoadingMsgs(true);

    const q = query(
      collection(db, ROOMS[room]),
      orderBy("timestamp", "desc"),
      orderBy("username")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      setLoadingMsgs(false);
    });

    return () => unsubscribe();
  }, [room]);

  // Direktnachrichten-Threads laden
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, "dm_threads"),
      where("users", "array-contains", uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const arr: RawDirect[] = snap.docs.map((d) => {
        const data = d.data();
        const otherUid = data.users.find((u: string) => u !== uid) || uid;
        return {
          id: d.id,
          otherUid,
          last: data.lastMessage ?? "",
        };
      });
      setRawDirects(arr);
    });

    return () => unsubscribe();
  }, []);

  // fehlende User-Profile für Directs nachladen
  useEffect(() => {
    const missing = Array.from(
      new Set(
        rawDirects
          .map((d) => d.otherUid)
          .filter((uid) => !userProfiles[uid])
      )
    );

    if (!missing.length) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const profile: UserProfile = snap.exists()
            ? { username: snap.data().username }
            : {};
          return [uid, profile] as const;
        })
      );

      setUserProfiles((prev) => ({
        ...prev,
        ...Object.fromEntries(entries),
      }));
    })();
  }, [rawDirects, userProfiles]);

  const directs: Direct[] = useMemo(
    () =>
      rawDirects.map((d) => ({
        id: d.id,
        displayName: userProfiles[d.otherUid]?.username || d.otherUid,
        last: d.last ?? "",
      })),
    [rawDirects, userProfiles]
  );

  // Rooms filtern
  const filteredRooms: RoomItem[] = useMemo(() => {
    const list: RoomItem[] = [
      {
        key: "salzburg",
        title: t("chat.rooms.salzburg.title"),
        subtitle: t("chat.rooms.salzburg.subtitle"),
      },
      {
        key: "oesterreich",
        title: t("chat.rooms.oesterreich.title"),
        subtitle: t("chat.rooms.oesterreich.subtitle"),
      },
      {
        key: "wirtschaft",
        title: t("chat.rooms.wirtschaft.title"),
        subtitle: t("chat.rooms.wirtschaft.subtitle"),
      },
    ];

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q)
    );
  }, [search, t]);

  // Directs filtern
  const filteredDirects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directs;

    return directs.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        (d.last ?? "").toLowerCase().includes(q)
    );
  }, [directs, search]);

  // Raum-Nachrichten filtern: ausgeblendete Sender (blockiert)
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const sender = (m as any).sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      }),
    [messages, blocked]
  );

  // Nachricht schicken
  const sendMessage = async () => {
    if (!input.trim() || !room || !username) return;

    try {
      await addDoc(collection(db, ROOMS[room]), {
        sender: auth.currentUser?.uid,
        username,
        text: input,
        timestamp: serverTimestamp(),
      });
      setInput("");
      setInputHeight(40);
    } catch (err) {
      console.error("❌ Nachricht konnte nicht gesendet werden:", err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header mit Tabs + Suche */}
      <ChatHeader
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        pendingCount={pendingCount}
      />

      {/* Rooms-Ansicht */}
      {tab === "rooms" && !room && (
        <RoomsList rooms={filteredRooms} onSelect={setRoom} />
      )}

      {/* Direct-Ansicht */}
      {tab === "direct" && (
        <DirectList
          directs={filteredDirects}
          router={router}
        />
      )}

      {/* Raum-Nachrichten */}
      {tab === "rooms" && room && (
        <RoomMessages
          room={room}
          locale={locale}
          messages={visibleMessages}
          loading={loadingMsgs}
          input={input}
          setInput={setInput}
          inputHeight={inputHeight}
          setInputHeight={setInputHeight}
          sendMessage={sendMessage}
          onBack={() => setRoom(null)}
          t={t}
          theme={theme}
          router={router}
        />
      )}
    </View>
  );
}
