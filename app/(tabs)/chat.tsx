import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { loadLocalUser } from "../../localUser";
import { Ionicons } from "@expo/vector-icons"; // ← Icon Import

// Räume richtig typisieren
const ROOMS = {
  salzburg: "messages_salzburg",
  oesterreich: "messages_oesterreich",
  wirtschaft: "messages_wirtschaft",
} as const;

type RoomKey = keyof typeof ROOMS;

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);

  useEffect(() => {
    (async () => {
      const user = await loadLocalUser();
      if (user) setUsername(user.username);
    })();
  }, []);

  useEffect(() => {
    if (!room) return;
    // asc sortieren + inverted -> neueste oben
    const q = query(collection(db, ROOMS[room]), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [room]);

  const sendMessage = async () => {
    if (!input.trim() || !room) return;
    try {
      await addDoc(collection(db, ROOMS[room]), {
        username,
        text: input,
        timestamp: serverTimestamp(),
      });
      setInput("");
    } catch (err) {
      console.error("❌ Nachricht konnte nicht gesendet werden:", err);
    }
  };

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>💬 Wähle einen Chatroom</Text>
        {Object.keys(ROOMS).map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.roomCard}
            onPress={() => setRoom(key as RoomKey)}
          >
            <Text style={styles.roomName}>
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setRoom(null)} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1976D2" />
        </TouchableOpacity>
        <Text style={styles.heading}>
          💬 Chatroom:{" "}
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
        inverted
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
            <View style={styles.msgRow}>
              <Text style={styles.msgMeta}>
                {item.username} • {date}
              </Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nachricht eingeben..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Senden" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBtn: {
    marginRight: 10,
  },
  heading: { fontSize: 20, fontWeight: "bold" },
  roomCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#E3F2FD",
  },
  roomName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0D47A1",
  },
  msgRow: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  msgMeta: {
    fontSize: 12,
    color: "#777",
    marginBottom: 2,
  },
  msgText: {
    fontSize: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
});
