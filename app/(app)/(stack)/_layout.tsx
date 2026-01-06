// app/(app)/(stack)/_layout.tsx
import React from "react";
import { Pressable } from "react-native";
import { Stack, usePathname } from "expo-router";
import { Text, useTheme, type MD3Theme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { UniversityProvider } from "@/components/university/UniversityContext";

import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import { TimetableHeaderTitle, TimetableHeaderRight } from "@/components/headers/TimetableHeader";

import { useTimetableDisplayMode } from "@/src/timetable/utils/mode";
import { useTimetableTheming } from "@/src/timetable/utils/useTimetableTheming";

type TabName = "news" | "uni" | "timetable" | "chat";

function getLastSegment(pathname: string) {
  // pathname is usually like "/timetable" or "/settings/timetable"
  const parts = pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

function getCurrentTabFromPath(pathname: string): TabName | null {
  const last = getLastSegment(pathname);
  if (last === "news" || last === "uni" || last === "timetable" || last === "chat") return last;
  return null; // not in tabs
}

export default function AppStackLayout() {
  const theme = useTheme<MD3Theme>();
  const navigation = useNavigation();
  const pathname = usePathname();

  const currentTab = React.useMemo(() => getCurrentTabFromPath(pathname), [pathname]);
  const isTimetableFocused = currentTab === "timetable";

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
              isTimetableFocused ? (
                <TimetableHeaderTitle />
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
