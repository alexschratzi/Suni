import { Link, Stack } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Button, useTheme, Surface } from "react-native-paper";

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text variant="headlineMedium" style={styles.title}>
          Screen not found
        </Text>
        <Text variant="bodyMedium" style={styles.body}>
          This screen does not exist.
        </Text>

        <Link href="/" asChild>
          <Button mode="contained" style={styles.button}>
            Go to home screen
          </Button>
        </Link>
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: { textAlign: "center" },
  body: { textAlign: "center", opacity: 0.8, marginBottom: 8 },
  button: { marginTop: 8 },
});
