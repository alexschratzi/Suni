// app/(drawer)/Settings/timetable.tsx (or wherever your settings screen lives)
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { List, Surface, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

export default function TimetableSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <Text variant="titleLarge" style={styles.title}>
        Stundenplan-Einstellungen
      </Text>

      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
      >
        Hier können spezifische Einstellungen für den Stundenplan vorgenommen werden.
      </Text>

      <Surface
        style={{ borderRadius: 12, overflow: "hidden" }}
        elevation={1}
      >
        <List.Section>
          <List.Subheader>Navigation</List.Subheader>

          <List.Item
            title="Zu heute springen"
            description="Kalender auf den aktuellen Tag / die aktuelle Woche zurücksetzen"
            left={(props) => <List.Icon {...props} icon="calendar-today" />}
            onPress={() =>
              router.push({
                pathname: "/(drawer)/(tabs)/timetable",
                params: { jumpToToday: "1" },
              })
            }
          />
        </List.Section>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
});
