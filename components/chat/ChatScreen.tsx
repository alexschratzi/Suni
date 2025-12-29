import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { db, auth } from "@/firebase";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

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
  hidden?: boolean;
};

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [tab, setTab] = useState<TabKey>("rooms");
  const [search, setSearch] = useState("");

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [chatColor, setChatColor] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);

  const [rawDirects, setRawDirects] = useState<RawDirect[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [pendingCount, setPendingCount] = useState(0);

  // Username/pending/blocked/settings live
  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setUsername(data.username);
        setPendingCount((data.pendingReceived || []).length);
        setBlocked(data.blocked || []);
        if (data.settings?.chatThemeColor) {
          setChatColor(data.settings.chatThemeColor as string);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const ROOMS = {
    salzburg: "messages_salzburg",
    oesterreich: "messages_oesterreich",
    wirtschaft: "messages_wirtschaft",
  } as const;

  // Room messages live
  useEffect(() => {
    if (!room) return;

    setLoadingMsgs(true);

    const roomCol = collection(db, ROOMS[room]);
    const q = query(roomCol, orderBy("timestamp", "desc"), orderBy("username"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        setLoadingMsgs(false);
      },
      (err) => {
        console.error("Room onSnapshot error:", err);
        setMessages([]);
        setLoadingMsgs(false);
      }
    );

    return () => unsubscribe();
  }, [room]);

  // Direct threads live
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const threadsCol = collection(db, "dm_threads");
    const q = query(threadsCol, where("users", "array-contains", uid));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const arr: RawDirect[] = snap.docs.map((d) => {
          const data = d.data() as any;
          const otherUid = (data.users || []).find((u: string) => u !== uid) || uid;
          return {
            id: d.id,
            otherUid,
            last: data.lastMessage ?? "",
            hidden: (data.hiddenBy || []).includes(uid),
          };
        });
        setRawDirects(arr);
      },
      (err) => {
        console.error("Direct threads onSnapshot error:", err);
        setRawDirects([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch missing profiles for directs
  useEffect(() => {
    const missing = Array.from(
      new Set(rawDirects.map((d) => d.otherUid).filter((uid) => !userProfiles[uid]))
    );

    if (!missing.length) return;

    (async () => {
      const entries = await Promise.all(
        missing.map(async (uid) => {
          const snap = await getDoc(doc(db, "users", uid));
          const profile: UserProfile = snap.exists() ? { username: (snap.data() as any).username } : {};
          return [uid, profile] as const;
        })
      );

      setUserProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [rawDirects, userProfiles]);

  const directs: Direct[] = useMemo(
    () =>
      rawDirects.map((d) => ({
        id: d.id,
        displayName: userProfiles[d.otherUid]?.username || d.otherUid,
        last: d.last ?? "",
        hidden: d.hidden ?? false,
      })),
    [rawDirects, userProfiles]
  );

  // Rooms filter
  const filteredRooms: RoomItem[] = useMemo(() => {
    const list: RoomItem[] = [
      { key: "salzburg", title: t("chat.rooms.salzburg.title"), subtitle: t("chat.rooms.salzburg.subtitle") },
      { key: "oesterreich", title: t("chat.rooms.oesterreich.title"), subtitle: t("chat.rooms.oesterreich.subtitle") },
      { key: "wirtschaft", title: t("chat.rooms.wirtschaft.title"), subtitle: t("chat.rooms.wirtschaft.subtitle") },
    ];

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
    );
  }, [search, t]);

  // Directs filter
  const filteredDirects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directs.filter((d) => !d.hidden);

    const match = (d: Direct) =>
      d.displayName.toLowerCase().includes(q) || (d.last ?? "").toLowerCase().includes(q);

    return directs.filter(match);
  }, [directs, search]);

  // Hide blocked senders
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const sender = (m as any).sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      }),
    [messages, blocked]
  );

  // Send message
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
      <ChatHeader
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        pendingCount={pendingCount}
      />

      {tab === "rooms" && !room && <RoomsList rooms={filteredRooms} onSelect={setRoom} />}

      {tab === "direct" && (
        <DirectList
          directs={filteredDirects}
          router={router}
          onToggleHidden={async (id, makeHidden) => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;

            const threadRef = doc(db, "dm_threads", id);
            try {
              await setDoc(
                threadRef,
                {
                  hiddenBy: makeHidden ? arrayUnion(uid) : arrayRemove(uid),
                },
                { merge: true }
              );
            } catch (err) {
              console.error("Fehler beim Ausblenden:", err);
            }
          }}
          accentColor={chatColor || theme.colors.primary}
        />
      )}

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
          accentColor={chatColor || theme.colors.primary}
          router={router}
        />
      )}
    </View>
  );
}
