// app/(app)/_layout.tsx
import React from "react";
import { Stack, useSegments } from "expo-router";
import { Text, useTheme } from "react-native-paper";

import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import { TimetableHeaderTitle, TimetableHeaderRight } from "@/components/headers/TimetableHeader";

export default function AppLayout() {
  const theme = useTheme();
  const segments = useSegments();

  // Determine active tab from segments
  const lastSegment = (segments[segments.length - 1] ?? "") as string;
  const currentTab =
    (["news", "uni", "timetable", "chat"].includes(lastSegment) ? lastSegment : "news") as
      | "news"
      | "uni"
      | "timetable"
      | "chat";

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { color: theme.colors.onSurface },
        contentStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      {/* Tabs = base of the app */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerTitle: () =>
            currentTab === "timetable" ? (
              <TimetableHeaderTitle />
            ) : (
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                Amadeus
              </Text>
            ),
          headerRight: () =>
            currentTab === "timetable" ? <TimetableHeaderRight /> : <DefaultHeaderRight />,
        }}
      />

      {/* Everything else is pushed on top of tabs */}
      <Stack.Screen name="profile" options={{ title: "Profil" }} />
      <Stack.Screen name="todos" options={{ title: "To-Dos" }} />
      <Stack.Screen name="global_settings" options={{ title: "Einstellungen" }} />
      <Stack.Screen name="settings/timetable" options={{ title: "Stundenplan-Einstellungen" }} />
      <Stack.Screen name="reply" options={{ title: "Antwort" }} />
      <Stack.Screen name="friends" options={{ title: "Freunde" }} />

      {/* If logout is a route */}
      <Stack.Screen name="logout" options={{ headerShown: false }} />
    </Stack>
  );
}
