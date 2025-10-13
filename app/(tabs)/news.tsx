import { ScrollView, StyleSheet } from "react-native";
import { Card, Surface, Text, useTheme } from "react-native-paper";

export default function NewsScreen() {
  const theme = useTheme();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Card style={styles.card}>
          <Card.Title title="📢 Semesterstart" subtitle="Heute" />
          <Card.Content>
            <Text variant="bodyMedium">
              Willkommen zurück an der Uni! Vergiss nicht, dich für deine Kurse anzumelden.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="🎉 Erstsemestrigen-Feier" subtitle="Freitag 20:00" />
          <Card.Content>
            <Text variant="bodyMedium">
              Die Fachschaft lädt alle Erstis zur großen Semesterparty ein! 🍻
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="📝 Prüfungsanmeldung" subtitle="Deadline: 15. März" />
          <Card.Content>
            <Text variant="bodyMedium">
              Vergiss nicht, dich rechtzeitig für deine Prüfungen einzutragen.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  card: {
    marginBottom: 15,
  },
});