// app/(app)/_layout.tsx
import React from "react";
import { View } from "react-native";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function AppDrawerContent(props: any) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const go = (href: Href) => {
    props.navigation.closeDrawer();
    router.push(href);
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: theme.colors.surface }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        <DrawerItem
          label="Profil"
          labelStyle={{ color: theme.colors.onSurface }}
          icon={({ size }) => (
            <Ionicons name="person-outline" size={size} color={theme.colors.onSurface} />
          )}
          onPress={() => go("/(app)/(stack)/profile")}
        />
        <DrawerItem
          label="To-Dos"
          labelStyle={{ color: theme.colors.onSurface }}
          icon={({ size }) => (
            <Ionicons name="checkbox-outline" size={size} color={theme.colors.onSurface} />
          )}
          onPress={() => go("/(app)/(stack)/todos")}
        />
        <DrawerItem
          label="Freunde"
          labelStyle={{ color: theme.colors.onSurface }}
          icon={({ size }) => (
            <Ionicons name="people-outline" size={size} color={theme.colors.onSurface} />
          )}
          onPress={() => go("/(app)/(stack)/friends")}
        />
        <DrawerItem
          label="Einstellungen"
          labelStyle={{ color: theme.colors.onSurface }}
          icon={({ size }) => (
            <Ionicons name="settings-outline" size={size} color={theme.colors.onSurface} />
          )}
          onPress={() => go("/(app)/(stack)/global_settings")}
        />
        <DrawerItem
          label="Logout"
          labelStyle={{ color: theme.colors.onSurface }}
          icon={({ size }) => (
            <Ionicons name="log-out-outline" size={size} color={theme.colors.onSurface} />
          )}
          onPress={() => go("/(app)/(stack)/logout")}
        />
      </DrawerContentScrollView>
    </View>
  );
}

export default function AppDrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.colors.surface },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      <Drawer.Screen name="(stack)" options={{ title: "App" }} />
    </Drawer>
  );
}
