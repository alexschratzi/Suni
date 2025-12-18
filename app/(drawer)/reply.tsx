// app/(drawer)/reply.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  IconButton,
} from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../firebase";

export default function ReplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { room, messageId, messageText, messageUser, dmId } = useLocalSearchParams();

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);

  // Username laden
  useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUsername(snap.data().username);
        setBlocked(snap.data().blocked || []);
      }
    });
    return () => unsubscribe();
  }, []);

  // Replies laden (Gruppenchat oder DM)
  useEffect(() => {
    // === DM THREAD ===
    if (dmId) {
      const repliesRef = collection(db, "dm_threads", dmId as string, "messages");
      const q = query(repliesRef, orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
      });
      return () => unsubscribe();
    }

    // === GRUPPEN CHAT THREAD ===
    if (room && messageId) {
      const repliesRef = collection(db, room as string, messageId as string, "replies");
      const q = query(repliesRef, orderBy("timestamp", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
      });
      return () => unsubscribe();
    }
  }, [room, messageId, dmId, blocked]);

  // Nachricht senden
  const sendReply = async () => {
    if (!input.trim() || !username) return;

    try {
      // === Direktnachricht (DM) ===
      if (dmId) {
        const threadRef = doc(db, "dm_threads", dmId as string);
        const threadSnap = await getDoc(threadRef);
        const users: string[] = (threadSnap.data()?.users as string[]) || [];
        const otherUid = users.find((u) => u !== auth.currentUser?.uid);

        if (otherUid && auth.currentUser?.uid) {
          const [meDoc, otherDoc] = await Promise.all([
            getDoc(doc(db, "users", auth.currentUser.uid)),
            getDoc(doc(db, "users", otherUid)),
          ]);
          const myBlocked: string[] = meDoc.data()?.blocked || [];
          const otherBlocked: string[] = otherDoc.data()?.blocked || [];

          if (myBlocked.includes(otherUid)) {
            Alert.alert("Blockiert", "Du hast diesen Nutzer blockiert.");
            return;
          }
          if (otherBlocked.includes(auth.currentUser.uid)) {
            Alert.alert("Blockiert", "Dieser Nutzer hat dich blockiert.");
            return;
          }
        }

        const ref = collection(db, "dm_threads", dmId as string, "messages");
        await addDoc(ref, {
          sender: auth.currentUser?.uid,
          username,
          text: input,
          timestamp: serverTimestamp(),
        });

        setInput("");
        return;
      }

      // === Gruppenchat Thread ===
      if (room && messageId) {
        const repliesRef = collection(db, room as string, messageId as string, "replies");
        await addDoc(repliesRef, {
          sender: auth.currentUser?.uid,
          username,
          text: input,
          timestamp: serverTimestamp(),
        });
        setInput("");
        setInputHeight(40);
      }
    } catch (err) {
      console.error("Fehler beim Senden:", err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <Surface style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <Surface style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleMedium">Antworten</Text>
        </Surface>

        {/* Original Nachricht - nur in Gruppenchats */}
        {!dmId && (
          <Surface
            style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
              backgroundColor: theme.colors.elevation.level1,
            }}
          >
            <Text variant="labelSmall">{messageUser}</Text>
            <Text variant="bodyMedium">{messageText}</Text>
          </Surface>
        )}

        {/* Replies */}
        <FlatList
          data={replies}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const date = item.timestamp?.toDate
              ? item.timestamp.toDate().toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Gerade eben";
            return (
              <Surface style={{ paddingVertical: 8, borderBottomWidth: 0.5 }}>
                <Text variant="labelSmall">
                  {item.username || "???"} • {date}
                </Text>
                <Text variant="bodyMedium">{item.text}</Text>
              </Surface>
            );
          }}
        />

        {/* Eingabe */}
        <Surface style={{ flexDirection: "row", marginTop: 10 }}>
          <TextInput
            mode="outlined"
            label="Antwort"
            value={input}
            onChangeText={setInput}
            multiline
            style={{ flex: 1, marginRight: 10, height: inputHeight }}
            onContentSizeChange={(e) =>
              setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
            }
          />
          <Button mode="contained" onPress={sendReply}>
            Senden
          </Button>
        </Surface>
      </Surface>
    </KeyboardAvoidingView>
  );
}
