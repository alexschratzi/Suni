import { View, Text, StyleSheet } from "react-native";

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>👤 Dein Profil</Text>
      <Text>Name: Alex Schratzberger</Text>
      <Text>Studium: Informatik</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
