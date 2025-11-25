// app/(drawer)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import { useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme, Text } from "react-native-paper";
import { DrawerToggleButton } from "@react-navigation/drawer";

import DefaultHeaderRight from "./headers/DefaultHeader";
import {
  TimetableHeaderTitle,
  TimetableHeaderRight,
} from "./headers/timetable";

export default function DrawerLayout() {
  const router = useRouter();
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const segments = useSegments();
  const currentTab = (segments[segments.length - 1] ?? "") as string;

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
        // drawer button on the left for all screens
        headerLeft: (props) => <DrawerToggleButton {...props} />,
      }}
    >
      {/* Home: Tabs unten, Header oben vom Drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: () =>
            currentTab === "timetable" ? (
              <TimetableHeaderTitle />
            ) : (
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                Suni
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

      {/* Profil im Seitenmenü */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
        }}
      />

      {/* To-Dos im Seitenmenü */}
      <Drawer.Screen
        name="todos"
        options={{
          title: "To-Dos",
        }}
      />

      {/* Globale Einstellungen im Seitenmenü */}
      <Drawer.Screen
        name="global_settings"
        options={{
          title: "Einstellungen",
        }}
      />

      {/* Stundenplan-Einstellungen (unsichtbar im Menü) */}
      <Drawer.Screen
        name="settings/timetable" // app/(drawer)/settings/timetable.tsx
        options={{
          drawerItemStyle: { display: "none" },
          title: "Stundenplan-Einstellungen",
        }}
      />

      {/* Logout als Menüpunkt */}
      <Drawer.Screen
        name="logout"
        options={{
          title: "Logout",
          headerShown: false,
        }}
      />

      {/* Reply bleibt unsichtbar (nur per Navigation erreichbar) */}
      <Drawer.Screen
        name="reply"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Antwort",
        }}
      />
    </Drawer>
  );
}
