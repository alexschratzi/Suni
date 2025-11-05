// app/(drawer)/settings.tsx
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, Switch, Button, useTheme } from "react-native-paper";
import { useAppTheme } from "../../components/theme/AppThemeProvider";

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: paperTheme.colors.surface }]}>
      <View style={styles.row}>
        <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface }}>
          Dark Mode
        </Text>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>

      {/* Beispiel: weitere Settings-Platzhalter */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface, marginBottom: 8 }}>
          Weitere Einstellungen
        </Text>
        <Button mode="contained" onPress={() => {}}>
          Coming soon
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: "100%",
  },
  row: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: {
    marginTop: 24,
  },
});
