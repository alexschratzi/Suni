import React, { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useRouter, useSegments } from "expo-router";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Text } from "react-native-paper";

import { supabase } from "@/src/lib/supabase";
import DefaultHeaderRight from "@/components/headers/DefaultHeaderRight";
import { TimetableHeaderTitle, TimetableHeaderRight } from "@/components/headers/TimetableHeader";

export default function DrawerLayout() {
  const router = useRouter();
  const segments = useSegments();
  const theme = useTheme();

  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAuthed(!!data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthed) router.replace("/(auth)");
  }, [ready, isAuthed, router]);

  if (!ready || !isAuthed) return null;

  const lastSegment = (segments[segments.length - 1] ?? "") as string;
  const currentTab =
    (["news", "uni", "timetable", "chat"].includes(lastSegment) ? lastSegment : "news") as
      | "news"
      | "uni"
      | "timetable"
      | "chat";

  const goBackToTabs = () => router.back();

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
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: "none" },
          headerLeft: (props) => <DrawerToggleButton {...props} />,
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

      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      <Drawer.Screen
        name="todos"
        options={{
          title: "To-Dos",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      <Drawer.Screen
        name="global_settings"
        options={{
          title: "Einstellungen",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      <Drawer.Screen
        name="settings/timetable"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Stundenplan-Einstellungen",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      <Drawer.Screen
        name="reply"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Antwort",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      <Drawer.Screen
        name="friends"
        options={{
          title: "Freunde",
          headerLeft: () => (
            <Pressable onPress={goBackToTabs} style={{ paddingHorizontal: 16 }}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

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
