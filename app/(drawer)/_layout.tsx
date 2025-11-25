// app/(drawer)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import { useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebase";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

// All possible settings routes we navigate to
type SettingsRoute =
  | "/(drawer)/settings/timetable"   // tab-spezifisch
  | "/(drawer)/global_settings";     // global fallback

type SettingsConfig = {
  path: SettingsRoute;
  label: string;
};

export default function DrawerLayout() {
  const router = useRouter();
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Aktuellen Tab anhand der Segmente bestimmen
  const segments = useSegments();
  // Beispiel: / (drawer) / (tabs) / timetable -> "timetable" ist das letzte Segment
  const currentTab = (segments[segments.length - 1] ?? "") as string;

  // Mapping: Tab-Name -> Settings-Route + Label
  const settingsByTab: Record<string, SettingsConfig> = {
    timetable: {
      path: "/(drawer)/settings/timetable",
      label: "Stundenplan-Einstellungen öffnen",
    },
    // Wenn du später eigene Settings-Seiten baust:
    // chat: { path: "/(drawer)/Settings/chat", label: "Chat-Einstellungen öffnen" },
    // news: { path: "/(drawer)/Settings/news", label: "News-Einstellungen öffnen" },
    // uni: { path: "/(drawer)/Settings/uni", label: "Uni-Einstellungen öffnen" },
  };

  // Fallback: globale Einstellungen
  const defaultSettings: SettingsConfig = {
    path: "/(drawer)/global_settings",   // <- deine globale Settings-Seite
    label: "Einstellungen öffnen",
  };

  const tabSpecificSettings = settingsByTab[currentTab];
  const { path: settingsPath, label: settingsLabel } =
    tabSpecificSettings ?? defaultSettings;

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
      }}
    >
      {/* Home: Tabs unten, Header oben vom Drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Suni",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(settingsPath)}
              style={{ paddingHorizontal: 16 }}
              accessibilityRole="button"
              aria-label={settingsLabel}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
          ),
        }}
      />

      {/* Profil im Seitenmenü */}
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profil",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
        }}
      />

      {/* To-Dos im Seitenmenü */}
      <Drawer.Screen
        name="todos"
        options={{
          title: "To-Dos",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
        }}
      />

      {/* Globale Einstellungen im Seitenmenü */}
      <Drawer.Screen
        name="global_settings"  // <-- muss Dateiname matchen: app/(drawer)/global_settings.tsx
        options={{
          title: "Einstellungen",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
        }}
      />

      {/* Stundenplan-Einstellungen (unsichtbar im Menü) */}
      <Drawer.Screen
        name="settings/timetable" // <-- muss Dateiname matchen: app/(drawer)/Settings/timetable.tsx
        options={{
          drawerItemStyle: { display: "none" },
          title: "Stundenplan-Einstellungen",
          headerLeft: (props) => <DrawerToggleButton {...props} />,
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
          headerLeft: (props) => <DrawerToggleButton {...props} />,
        }}
      />
    </Drawer>
  );
}
