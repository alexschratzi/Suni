import { View, Text, FlatList, StyleSheet } from "react-native";

const events = [
  { id: "1", name: "Semesterparty 🎉", date: "15.10.2025" },
  { id: "2", name: "Prüfungsvorbereitung 📖", date: "20.10.2025" },
];

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🎉 Events</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.event}>
            {item.name} - {item.date}
          </Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  event: { fontSize: 18, marginBottom: 5 },
});
