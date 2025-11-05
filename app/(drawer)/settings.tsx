// app/(drawer)/settings.tsx
import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Switch, Button } from "react-native-paper";

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Hier kannst du deine echten Settings/Storage-Logik einbauen.
  const save = () => {
    // persist settings ...
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <Text variant="titleMedium">Benachrichtigungen</Text>
        <Switch value={notifications} onValueChange={setNotifications} />
      </View>

      <View style={styles.row}>
        <Text variant="titleMedium">Dark Mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>

      <Button mode="contained" onPress={save} style={{ marginTop: 24 }}>
        Speichern
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
