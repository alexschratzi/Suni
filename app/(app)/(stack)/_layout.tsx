// app/(app)/(stack)/_layout.tsx
import React from "react";
import { Pressable } from "react-native";
import { Stack, useSegments } from "expo-router";
import { Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";

import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import { TimetableHeaderTitle, TimetableHeaderRight } from "@/components/headers/TimetableHeader";

export default function AppStackLayout() {
  const theme = useTheme();
  const segments = useSegments();
  const navigation = useNavigation();

  const lastSegment = (segments[segments.length - 1] ?? "") as string;
  const currentTab =
    (["news", "uni", "timetable", "chat"].includes(lastSegment) ? lastSegment : "news") as
      | "news"
      | "uni"
      | "timetable"
      | "chat";

  const openDrawer = () => navigation.dispatch(DrawerActions.toggleDrawer());

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { color: theme.colors.onSurface },
        contentStyle: { backgroundColor: theme.colors.surface },
        headerBackTitle: "Zurück",
      }}
    >
      {/* Tabs = base of the app */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerLeft: () => (
            <Pressable onPress={openDrawer} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="menu" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
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

      <Stack.Screen name="logout" options={{ headerShown: false }} />
    </Stack>
  );
}
