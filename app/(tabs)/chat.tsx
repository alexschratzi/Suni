import { View, Text, FlatList, StyleSheet } from "react-native";

const dummyMessages = [
  { id: "1", text: "Hey, hat jemand das Skript für Mathe?" },
  { id: "2", text: "Ja, ich lad's gleich in die Gruppe hoch 👍" },
  { id: "3", text: "Danke 🙌" },
];

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>💬 Chat</Text>
      <FlatList
        data={dummyMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text style={styles.msg}>{item.text}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  msg: { fontSize: 18, marginBottom: 5 },
});
