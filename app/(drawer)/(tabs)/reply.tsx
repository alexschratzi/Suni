import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
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
import { auth, db } from "../../../firebase";

export default function ReplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { room, messageId, messageText, messageUser } = useLocalSearchParams();

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
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
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <Surface
        style={{
          flex: 1,
          padding: 20,
          backgroundColor: theme.colors.background,
        }}
      >
        {/* Header */}
        <Surface style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, elevation: 0 }}>
          <IconButton
            icon="arrow-left"
            onPress={() => router.back()}
            accessibilityLabel="Zurück"
          />
          <Text variant="titleMedium">Antworten</Text>
        </Surface>

        {/* Original Nachricht */}
        <Surface
          style={{
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            backgroundColor: theme.colors.elevation.level1,
          }}
        >
          <Text variant="labelSmall" style={{ marginBottom: 4 }}>
            {messageUser}
          </Text>
          <Text variant="bodyMedium">{messageText}</Text>
        </Surface>

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
              <Surface
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.colors.outlineVariant,
                  elevation: 0,
                }}
              >
                <Text variant="labelSmall" style={{ marginBottom: 2 }}>
                  {item.username || "???"} • {date}
                </Text>
                <Text variant="bodyMedium">{item.text}</Text>
              </Surface>
            );
          }}
          style={{ marginBottom: 10 }}
        />

        {/* Reply Eingabe */}
        <Surface style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <TextInput
            mode="outlined"
            label="Antwort eingeben..."
            value={input}
            onChangeText={setInput}
            multiline
            style={{
              flex: 1,
              marginRight: 10,
              height: inputHeight,
            }}
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