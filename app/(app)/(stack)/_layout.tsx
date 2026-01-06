// app/(app)/(stack)/_layout.tsx
import React from "react";
import { Pressable } from "react-native";
import { Stack, useSegments } from "expo-router";
import { Text, useTheme, type MD3Theme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { UniversityProvider } from "@/components/university/UniversityContext";

import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import { TimetableHeaderTitle, TimetableHeaderRight } from "@/components/headers/TimetableHeader";

import { useTimetableDisplayMode } from "@/src/timetable/utils/mode";
import { useTimetableTheming } from "@/src/timetable/utils/useTimetableTheming";

export default function AppStackLayout() {
  const theme = useTheme<MD3Theme>();
  const navigation = useNavigation();

  const segments = useSegments() as unknown as string[];
  const lastSegment = segments[segments.length - 1] ?? "";

  const currentTab =
    (["news", "uni", "timetable", "chat"].includes(lastSegment) ? lastSegment : "news") as
      | "news"
      | "uni"
      | "timetable"
      | "chat";

  const isTabsRoute = segments[2] === "(tabs)" || segments[segments.length - 2] === "(tabs)";
  const isTimetableFocused = isTabsRoute && currentTab === "timetable";

  const displayMode = useTimetableDisplayMode("courses");
  const { isParty, partyHeaderBg } = useTimetableTheming(theme, displayMode);

  const isPartyHeader = isTimetableFocused && isParty;

  const openDrawer = () => navigation.dispatch(DrawerActions.toggleDrawer());

  return (
    <UniversityProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: isPartyHeader ? partyHeaderBg : theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: { color: theme.colors.onSurface },
          contentStyle: { backgroundColor: theme.colors.surface },
          headerBackTitle: "Zurück",
        }}
      >
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
            headerRight: () => {
              if (currentTab === "timetable") return <TimetableHeaderRight />;

              const section =
                currentTab === "news"
                  ? "news"
                  : currentTab === "uni"
                  ? "uni"
                  : currentTab === "chat"
                  ? "chat"
                  : undefined;

              return <DefaultHeaderRight section={section} />;
            },
          }}
        />

        <Stack.Screen name="profile" options={{ title: "Profil" }} />
        <Stack.Screen name="todos" options={{ title: "To-Dos" }} />
        <Stack.Screen name="global_settings" options={{ title: "Einstellungen" }} />
        <Stack.Screen name="settings/timetable" options={{ title: "Stundenplan-Einstellungen" }} />
        <Stack.Screen name="reply" options={{ title: "Antwort" }} />
        <Stack.Screen name="friends" options={{ title: "Freunde" }} />
        <Stack.Screen name="embedded-browser" options={{ headerShown: false }} />
        <Stack.Screen name="logout" options={{ headerShown: false }} />
      </Stack>
    </UniversityProvider>
  );
}
