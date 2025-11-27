// app/(tabs)/chat.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  Button,
  useTheme,
  SegmentedButtons,
  Searchbar,
  List,
  Avatar,
  Divider,
  ActivityIndicator,
  Card,
} from "react-native-paper";
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

import { db, auth } from "../../../firebase";

const ROOMS = {
  salzburg: "messages_salzburg",
  oesterreich: "messages_oesterreich",
  wirtschaft: "messages_wirtschaft",
} as const;

type RoomKey = keyof typeof ROOMS;
type TabKey = "rooms" | "direct";

type Direct = {
  id: string;
  displayName: string;
  last?: string;
};

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  // Top-Segmente & Suche
  const [tab, setTab] = useState<TabKey>("rooms");
  const [search, setSearch] = useState("");

  // User/Rooms
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);

  // Nachrichten im aktiven Room
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Eingabezeile
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);

  const [directs, setDirects] = useState<Direct[]>([]);

  // Username laden
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

  // Filter
  const filteredRooms = useMemo(() => {
    const list: { key: RoomKey; title: string; subtitle: string }[] = [
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

  const filteredDirects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directs;
    return directs.filter(
      (d) =>
        d.displayName.toLowerCase().includes(q) ||
        (d.last ?? "").toLowerCase().includes(q)
    );
  }, [directs, search]);

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

  const uploadAttachment = async () => {
    console.log("📎 Attachment upload…");
  };

  const openThread = (message: any) => {
    if (!room) return;
    router.push({
      pathname: "/(drawer)/reply", // unsichtbare Route im Drawer
      params: {
        room,
        messageId: message.id,
        messageText: message.text,
        messageUser: message.username,
      },
    });
  };

  // Header (Segment + Suche)
  const Header = (
    <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        buttons={[
          { value: "rooms", label: t("chat.tabs.rooms"), icon: "chat" },
          { value: "direct", label: t("chat.tabs.direct"), icon: "account" },
        ]}
        style={styles.segment}
      />
      <Searchbar
        placeholder={
          tab === "rooms"
            ? t("chat.search.roomsPlaceholder")
            : t("chat.search.directPlaceholder")
        }
        value={search}
        onChangeText={setSearch}
        style={[styles.search, { backgroundColor: theme.colors.surfaceVariant }]}
        iconColor={theme.colors.onSurfaceVariant}
        inputStyle={{ color: theme.colors.onSurface }}
      />
    </View>
  );

  // Ansicht 1: Raumliste (wenn kein Raum gewählt) oder Messages (wenn Raum gewählt)
  const RoomsView = !room ? (
    <FlatList
      data={filteredRooms}
      keyExtractor={(it) => it.key}
      ItemSeparatorComponent={() => (
        <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      )}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      renderItem={({ item }) => (
        <Card
          mode="elevated"
          onPress={() => setRoom(item.key)}
          style={{
            marginBottom: 12,
            backgroundColor: theme.colors.elevation.level2,
          }}
        >
          <Card.Title
            title={item.title}
            subtitle={item.subtitle}
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => (
              <Avatar.Icon
                {...props}
                icon="chat"
                color={theme.colors.onPrimary}
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            right={(props) => (
              <View style={{ paddingRight: 8, justifyContent: "center" }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
          />
        </Card>
      )}
      ListEmptyComponent={
        <Empty
          title={t("chat.empty.roomsTitle")}
          subtitle={t("chat.empty.roomsSubtitle")}
        />
      }
    />
  ) : (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      {/* Raum-Header */}
      <View
        style={[
          styles.roomHeader,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      >
        <TouchableOpacity onPress={() => setRoom(null)} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.roomTitle, { color: theme.colors.onSurface }]}>
          {room === "salzburg"
            ? t("chat.rooms.salzburg.title")
            : room === "oesterreich"
            ? t("chat.rooms.oesterreich.title")
            : t("chat.rooms.wirtschaft.title")}
        </Text>
      </View>

      {/* Nachrichtenliste */}
      {loadingMsgs ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text
            style={{
              marginTop: 8,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {t("chat.loadingMessages")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          renderItem={({ item }) => {
            const date = item.timestamp?.toDate
              ? item.timestamp
                  .toDate()
                  .toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : t("chat.justNow");
            return (
              <TouchableOpacity onPress={() => openThread(item)}>
                <View
                  style={[
                    styles.msgCard,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.elevation.level1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.msgMeta,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {item.username || "???"} • {date}
                  </Text>
                  <Text
                    style={[styles.msgText, { color: theme.colors.onSurface }]}
                  >
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Eingabezeile */}
      <View
        style={[
          styles.inputRow,
          { borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        <TouchableOpacity onPress={uploadAttachment} style={styles.attachBtn}>
          <Ionicons name="attach" size={22} color={theme.colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              height: inputHeight,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surface,
            },
          ]}
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={input}
          onChangeText={setInput}
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
          }
        />
        <Button
          mode="contained"
          onPress={sendMessage}
          disabled={!input.trim()}
          style={{ marginLeft: 6 }}
          contentStyle={{ paddingHorizontal: 14, height: 40 }}
        >
          {t("chat.send")}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );

  // Ansicht 2: Direktnachrichten
  const DirectView = (
    <View style={{ flex: 1 }}>
      {/* Button: Freund hinzufügen */}
      <Button
        mode="contained"
        icon="account-plus"
        style={{ marginHorizontal: 12, marginBottom: 12, marginTop: 8 }}
        onPress={() => router.push("../addFriends")}
      >
        {t("chat.direct.addFriend")}
      </Button>

      <Button
        mode="text"
        onPress={() => router.push("../../friendRequests")}
        style={{ marginHorizontal: 12, marginBottom: 12 }}
      >
        {t("chat.direct.showRequests")}
      </Button>

      <FlatList
        data={filteredDirects}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => (
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
        )}
        renderItem={({ item }) => (
          <List.Item
            title={item.displayName}
            description={item.last ?? ""}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => (
              <Avatar.Text
                {...props}
                size={40}
                label={initials(item.displayName)}
                color={theme.colors.onPrimary}
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            right={() => (
              <View style={{ justifyContent: "center" }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
            onPress={() => {
              router.push({
                pathname: "/(drawer)/reply",
                params: { dmId: item.id },
              });
            }}
          />
        )}
        ListEmptyComponent={
          <Empty
            title={t("chat.empty.directTitle")}
            subtitle={t("chat.empty.directSubtitle")}
          />
        }
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {Header}
      {tab === "rooms" ? RoomsView : DirectView}
    </View>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function Empty({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={40}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginTop: 8 }}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container für die Room-Ansicht (mit KeyboardAvoiding in Room-Detail)
  container: { flex: 1 },

  segment: { marginBottom: 8 },
  search: { marginBottom: 6, borderRadius: 12 },

  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roomTitle: { fontSize: 18, fontWeight: "600", marginLeft: 6 },

  iconBtn: {
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  msgCard: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  msgMeta: { fontSize: 12, marginBottom: 2 },
  msgText: { fontSize: 16 },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { marginRight: 8, padding: 4 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    textAlignVertical: "top",
  },

  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 16 },

  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
});
