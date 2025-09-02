import { useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { loadLocalUser } from "../../localUser";

const ROOMS = {
  salzburg: "messages_salzburg",
  oesterreich: "messages_oesterreich",
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<"salzburg" | "oesterreich">("salzburg");

  useEffect(() => {
    // lokalen User laden
    (async () => {
      const user = await loadLocalUser();
      if (user) setUsername(user.username);
    })();
  }, []);

  useEffect(() => {
    // Listener für aktuellen Raum
    const q = query(collection(db, ROOMS[room]), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [room]);

  const sendMessage = async () => {
    if (!input.trim()) return;
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

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>💬 Chatroom: {room === "salzburg" ? "Salzburg" : "Österreich"}</Text>

      {/* Raum-Auswahl */}
      <View style={styles.roomSwitch}>
        <TouchableOpacity
          style={[styles.roomButton, room === "salzburg" && styles.activeRoom]}
          onPress={() => setRoom("salzburg")}
        >
          <Text style={styles.roomText}>Salzburg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roomButton, room === "oesterreich" && styles.activeRoom]}
          onPress={() => setRoom("oesterreich")}
        >
          <Text style={styles.roomText}>Österreich</Text>
        </TouchableOpacity>
      </View>

      {/* Nachrichtenliste */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.msg}>
            <Text style={{ fontWeight: "bold" }}>{item.username}: </Text>
            {item.text}
          </Text>
        )}
      />

      {/* Eingabefeld */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Nachricht eingeben..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Senden" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  msg: { fontSize: 16, marginBottom: 5 },
  inputRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  roomSwitch: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  roomButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#1976D2",
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeRoom: {
    backgroundColor: "#1976D2",
  },
  roomText: {
    color: "black",
    fontWeight: "bold",
  },
});
