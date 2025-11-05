import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  doc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
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
import {
  Text,
  Button,
  useTheme,
} from "react-native-paper";

import { db, auth } from "../../../firebase";

const ROOMS = {
  salzburg: "messages_salzburg",
  oesterreich: "messages_oesterreich",
  wirtschaft: "messages_wirtschaft",
} as const;

type RoomKey = keyof typeof ROOMS;

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);
  const [inputHeight, setInputHeight] = useState(40);

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

  useEffect(() => {
    if (!room) return;
    const q = query(collection(db, ROOMS[room]), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [room]);

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
    console.log("📎 Attachment hochladen...");
  };

  const openThread = (message: any) => {
    if (!room) return;
    router.push({
      pathname: "/reply",
      params: {
        room,
        messageId: message.id,
        messageText: message.text,
        messageUser: message.username,
      },
    });
  };

  if (!room) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.heading}>Wähle einen Chatroom</Text>
        {Object.keys(ROOMS).map((key) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.roomCard,
              {
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.elevation.level1,
              },
            ]}
            onPress={() => setRoom(key as RoomKey)}
          >
            <Text style={[styles.roomName, { color: theme.colors.primary }]}>
              {key === "salzburg"
                ? "Salzburg"
                : key === "oesterreich"
                ? "Österreich"
                : "Wirtschaft"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setRoom(null)} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.heading}>
          Chatroom:{" "}
          {room === "salzburg"
            ? "Salzburg"
            : room === "oesterreich"
            ? "Österreich"
            : "Wirtschaft"}
        </Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = item.timestamp?.toDate
            ? item.timestamp
                .toDate()
                .toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
            : "Gerade eben";
          return (
            <TouchableOpacity onPress={() => openThread(item)}>
              <View style={styles.msgRow}>
                <Text style={[styles.msgMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {item.username || "???"} • {date}
                </Text>
                <Text style={styles.msgText}>{item.text}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity onPress={uploadAttachment} style={styles.attachBtn}>
          <Ionicons name="attach" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              height: inputHeight,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
            },
          ]}
          placeholder="Nachricht eingeben..."
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
    style={{ marginLeft: 4 }}
    contentStyle={{ paddingHorizontal: 12, height: 40 }}
  >
    Senden
  </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  iconBtn: { marginRight: 10 },
  heading: { fontSize: 20, fontWeight: "bold" },
  roomCard: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  roomName: { fontSize: 18, fontWeight: "600" },
  msgRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  msgMeta: { fontSize: 12, marginBottom: 2 },
  msgText: { fontSize: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    marginTop: 10,
  },
  attachBtn: { marginRight: 8, padding: 4 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    textAlignVertical: "top",
  },
});