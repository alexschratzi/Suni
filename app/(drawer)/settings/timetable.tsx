import { ScrollView, StyleSheet } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import React from "react";

export default function TimetableSettingsScreen() {
  const theme = useTheme();

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
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Hier können spezifische Einstellungen für den Stundenplan vorgenommen werden.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
});