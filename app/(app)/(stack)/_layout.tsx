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
import { UniHeaderTitle } from "@/components/headers/UniHeaderTitle";


import { useTimetableDisplayMode } from "@/src/timetable/utils/mode";
import { useTimetableTheming } from "@/src/timetable/utils/useTimetableTheming";

type TabName = "news" | "uni" | "timetable" | "chat";

function tabFromSegments(segments: string[]): TabName | null {
  // segments e.g. ["(app)","(stack)","(tabs)","timetable"]
  const last = segments[segments.length - 1];
  if (last === "news" || last === "uni" || last === "timetable" || last === "chat")
    return last;
  return null;
}

export default function AppStackLayout() {
  const theme = useTheme<MD3Theme>();
  const navigation = useNavigation();
  const segments = useSegments();

  const displayMode = useTimetableDisplayMode("courses");
  const { isParty, partyHeaderBg } = useTimetableTheming(theme, displayMode);

  // 👇 This is the key:
  // On some transitions (especially pop back to "(tabs)"), the focused child tab
  // can be "unknown" for one render. We keep the last known tab to prevent header flicker.
  const currentTabMaybe = React.useMemo(() => tabFromSegments(segments), [segments]);
  const lastTabRef = React.useRef<TabName>("timetable"); // default doesn't matter much
  if (currentTabMaybe) lastTabRef.current = currentTabMaybe;
  const currentTab: TabName = currentTabMaybe ?? lastTabRef.current;

  const isTimetableFocused = currentTab === "timetable";
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
          headerTitleAlign: "center",
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

            // IMPORTANT: now this won’t flicker, because currentTab is never "unknown"
            headerTitle: () =>
              isTimetableFocused ? (
                <TimetableHeaderTitle />
              ) : currentTab === "uni" ? (
                <UniHeaderTitle />
              ) : (
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Amadeus
                </Text>
              ),

            headerRight: () => {
              if (isTimetableFocused) return <TimetableHeaderRight />;

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
        <Stack.Screen name="grades" options={{ title: "Grades" }} />
        <Stack.Screen name="global_settings" options={{ title: "Einstellungen" }} />
        <Stack.Screen name="settings/timetable" options={{ title: "Kalender verwalten" }} />
        <Stack.Screen name="chat" options={{ title: "Chat" }} />
        <Stack.Screen name="room" options={{ title: "Thread" }} />
        <Stack.Screen name="reply" options={{ title: "Antworten" }} />
        <Stack.Screen name="friends" options={{ title: "Freunde" }} />
        <Stack.Screen name="embedded-browser" options={{ headerShown: false }} />
        <Stack.Screen name="logout" options={{ headerShown: false }} />
        <Stack.Screen name="event-overview" options={{ title: "Overview" }} />
      </Stack>
    </UniversityProvider>
  );
}
