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
  Text,
  FlatList,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { db, auth } from "../firebase"; // ✅ korrigierter Pfad

export default function ReplyScreen() {
  const router = useRouter();
  const { room, messageId, messageText, messageUser } = useLocalSearchParams();

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [inputHeight, setInputHeight] = useState(40);

  // 🔑 Username live sync
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

  // 🔑 Replies live laden
  useEffect(() => {
    if (!room || !messageId) return;
    const repliesRef = collection(db, room as string, messageId as string, "replies");
    const q = query(repliesRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReplies(list);
    });
    return () => unsubscribe();
  }, [room, messageId]);

  const sendReply = async () => {
    if (!input.trim() || !room || !messageId || !username) return;
    try {
      const repliesRef = collection(db, room as string, messageId as string, "replies");
      await addDoc(repliesRef, {
        username,
        text: input,
        timestamp: serverTimestamp(),
      });
      setInput("");
      setInputHeight(40);
    } catch (err) {
      console.error("❌ Reply konnte nicht gesendet werden:", err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1976D2" />
        </TouchableOpacity>
        <Text style={styles.heading}>Antworten</Text>
      </View>

      {/* Original Nachricht */}
      <View style={styles.originalMsg}>
        <Text style={styles.msgMeta}>{messageUser}</Text>
        <Text style={styles.msgText}>{messageText}</Text>
      </View>

      {/* Replies */}
      <FlatList
        data={replies}
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
            <View style={styles.msgRow}>
              <Text style={styles.msgMeta}>
                {item.username || "???"} • {date}
              </Text>
              <Text style={styles.msgText}>{item.text}</Text>
            </View>
          );
        }}
      />

      {/* Reply Eingabe */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { height: inputHeight }]}
          placeholder="Antwort eingeben..."
          value={input}
          onChangeText={setInput}
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
          }
        />
        <Button title="Senden" onPress={sendReply} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  iconBtn: { marginRight: 10 },
  heading: { fontSize: 20, fontWeight: "bold" },
  originalMsg: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#E3F2FD",
  },
  msgRow: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  msgMeta: { fontSize: 12, color: "#777", marginBottom: 2 },
  msgText: { fontSize: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 10,
    textAlignVertical: "top",
  },
});
