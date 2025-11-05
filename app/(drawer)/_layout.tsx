// app/(drawer)/_layout.tsx
import React, { useEffect, useState } from "react";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../firebase";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

export default function DrawerLayout() {
  const router = useRouter();
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
        // 🔽 Header folgt dem Paper-Theme (Hell/Dunkel)
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,         // wirkt auf Titel + Icons
        headerTitleStyle: { color: theme.colors.onSurface },
        // Drawer-Farben ebenfalls ans Theme koppeln
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
              onPress={() => router.push("/(drawer)/settings")}
              style={{ paddingHorizontal: 16 }}
              accessibilityRole="button"
              aria-label="Einstellungen öffnen"
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.onSurface} // folgt Theme
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

      {/* Einstellungen im Seitenmenü */}
      <Drawer.Screen
        name="settings"
        options={{
          title: "Einstellungen",
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
