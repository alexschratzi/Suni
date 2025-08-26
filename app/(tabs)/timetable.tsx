import { View, Text, StyleSheet } from "react-native";

export default function TimetableScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📅 Dein Stundenplan</Text>
      <Text>Hier könnten deine Vorlesungen angezeigt werden.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
});
