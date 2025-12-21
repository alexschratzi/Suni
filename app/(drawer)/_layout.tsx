// app/(drawer)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useRouter, useSegments } from "expo-router";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import { useTheme, Text } from "react-native-paper";

import { auth } from "../../firebase";
import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import {
  TimetableHeaderTitle,
  TimetableHeaderRight,
} from "@/components/headers/TimetableHeader";

// explicit tab route mapping so TypeScript knows the exact route literals
const TAB_ROUTES = {
  news: "/(drawer)/(tabs)/news",
  uni: "/(drawer)/(tabs)/uni",
  timetable: "/(drawer)/(tabs)/timetable",
  chat: "/(drawer)/(tabs)/chat",
} as const;

type TabKey = keyof typeof TAB_ROUTES;

export default function DrawerLayout() {
  const router = useRouter();
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // which tab is currently active? (news, uni, timetable, chat)
  const segments = useSegments();
  const lastSegment = (segments[segments.length - 1] ?? "") as string;

  // ensure we always end up with a valid TabKey (fallback: "news")
  const currentTab: TabKey = (["news", "uni", "timetable", "chat"].includes(
    lastSegment
  )
    ? lastSegment
    : "news") as TabKey;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/(auth)");
  }, [ready, user, router]);

  if (!ready || !user) return null;

  // "Zurueck" always go back to the currently open tab page
  const goBackToTabs = () => {
    router.back();
  };

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { color: theme.colors.onSurface },
        drawerStyle: { backgroundColor: theme.colors.surface },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      {/* MAIN APP (tabs) — hidden from drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: "none" },
          headerLeft: (props) => <DrawerToggleButton {...props} />,
          headerTitle: () =>
            currentTab === "timetable" ? (
              <TimetableHeaderTitle />
            ) : (
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                Amadeus
              </Text>
            ),
          headerRight: () =>
            currentTab === "timetable" ? (
              <TimetableHeaderRight />
            ) : (
              <DefaultHeaderRight />
            ),
        }}
      />

      {/* VISIBLE IN DRAWER: Profil */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* VISIBLE IN DRAWER: To-Dos */}
      <Drawer.Screen
        name="todos"
        options={{
          title: "To-Dos",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* VISIBLE IN DRAWER: Einstellungen (global_settings) */}
      <Drawer.Screen
        name="global_settings"
        options={{
          title: "Einstellungen",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* HIDDEN: Stundenplan-Einstellungen (only via timetable menu) */}
      <Drawer.Screen
        name="settings/timetable"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Stundenplan-Einstellungen",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* HIDDEN: Reply (internal) */}
      <Drawer.Screen
        name="reply"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Antwort",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* VISIBLE IN DRAWER: Freunde (Add + Requests together) */}
      <Drawer.Screen
        name="friends"
        options={{
          title: "Freunde",
          headerLeft: () => (
            <Pressable
              onPress={goBackToTabs}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* VISIBLE IN DRAWER: Logout */}
      <Drawer.Screen
        name="logout"
        options={{
          title: "Logout",
          headerShown: false,
        }}
      />
    </Drawer>
  );
}
