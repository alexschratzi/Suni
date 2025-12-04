// components/chat/ChatScreen.tsx
/**
 * Haupt-Screen-Logik für den Chat:
 * - State (tab, search, room, messages, directs, input …)
 * - Firestore-Listener
 * - Auswahl, welche Unterkomponente (RoomsList, DirectList, RoomMessages) angezeigt wird
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
} from "firebase/firestore";
import { where } from "firebase/firestore/lite";
import { useTranslation } from "react-i18next";

import { db, auth } from "@/firebase";

import ChatHeader from "./ChatHeader";
import RoomsList, { RoomItem, RoomKey } from "./RoomsList";
import DirectList, { Direct } from "./DirectList";
import RoomMessages from "./RoomMessages";

type TabKey = "rooms" | "direct";

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

  // Nachrichten im Raum
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Eingabezeile
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);

  // Direktnachrichten
  const [directs, setDirects] = useState<Direct[]>([]);

  // Username aus Firestore laden
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUsername(snap.data().username);
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

    const q = query(collection(db, ROOMS[room]), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
      const arr: Direct[] = snap.docs.map((d) => {
        const data = d.data();
        const otherUid = data.users.find((u: string) => u !== uid);
        return {
          id: d.id,
          displayName: otherUid,
          last: data.lastMessage ?? "",
        };
      });
      setDirects(arr);
    });

    return () => unsubscribe();
  }, []);

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

  // Nachricht schicken
  const sendMessage = async () => {
    if (!input.trim() || !room || !username) return;

    try {
      await addDoc(collection(db, ROOMS[room]), {
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
          messages={messages}
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
