import { View, Text, StyleSheet, Image } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://i.pravatar.cc/150?img=3" }}
        style={styles.avatar}
      />
      <Text style={styles.name}>Alex Schratzberger</Text>
      <Text style={styles.info}>📚 Informatik Student</Text>
      <Text style={styles.info}>🏛️ Uni Salzburg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20 },
  name: { fontSize: 24, fontWeight: "bold" },
  info: { fontSize: 18, marginTop: 5 },
});
