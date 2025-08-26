import { View, StyleSheet, ScrollView } from "react-native";
import { Card, Text } from "react-native-paper";

export default function NewsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="📢 Semesterstart" subtitle="Heute" />
        <Card.Content>
          <Text>
            Willkommen zurück an der Uni! Vergiss nicht, dich für deine Kurse anzumelden.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="🎉 Erstsemestrigen-Feier" subtitle="Freitag 20:00" />
        <Card.Content>
          <Text>
            Die Fachschaft lädt alle Erstis zur großen Semesterparty ein! 🍻
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="📝 Prüfungsanmeldung" subtitle="Deadline: 15. März" />
        <Card.Content>
          <Text>
            Vergiss nicht, dich rechtzeitig für deine Prüfungen einzutragen.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  card: { marginBottom: 15 },
});
