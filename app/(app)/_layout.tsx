// app/(app)/_layout.tsx
import React from "react";
import { Drawer } from "expo-router/drawer";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

function AppDrawerContent(props: any) {
  const router = useRouter();
  const theme = useTheme();

  const go = (path: string) => {
    props.navigation.closeDrawer();
    router.push(path);
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
      {/* You can style this the same way you did before (header, logo, etc.) */}

      {/* Main stack is tabs, so drawer items push stack screens */}
      <DrawerItem
        label="Profil"
        labelStyle={{ color: theme.colors.onSurface }}
        icon={({ size }) => <Ionicons name="person-outline" size={size} color={theme.colors.onSurface} />}
        onPress={() => go("/(app)/(stack)/profile")}
      />
      <DrawerItem
        label="To-Dos"
        labelStyle={{ color: theme.colors.onSurface }}
        icon={({ size }) => <Ionicons name="checkbox-outline" size={size} color={theme.colors.onSurface} />}
        onPress={() => go("/(app)/(stack)/todos")}
      />
      <DrawerItem
        label="Freunde"
        labelStyle={{ color: theme.colors.onSurface }}
        icon={({ size }) => <Ionicons name="people-outline" size={size} color={theme.colors.onSurface} />}
        onPress={() => go("/(app)/(stack)/friends")}
      />
      <DrawerItem
        label="Einstellungen"
        labelStyle={{ color: theme.colors.onSurface }}
        icon={({ size }) => <Ionicons name="settings-outline" size={size} color={theme.colors.onSurface} />}
        onPress={() => go("/(app)/(stack)/global_settings")}
      />

      {/* Optional */}
      <DrawerItem
        label="Logout"
        labelStyle={{ color: theme.colors.onSurface }}
        icon={({ size }) => <Ionicons name="log-out-outline" size={size} color={theme.colors.onSurface} />}
        onPress={() => go("/(app)/(stack)/logout")}
      />
    </DrawerContentScrollView>
  );
}

export default function AppDrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // important: Stack controls header now
        drawerStyle: { backgroundColor: theme.colors.surface },
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      {/* Single screen: the real app lives in the stack */}
      <Drawer.Screen
        name="(stack)"
        options={{
          title: "App",
        }}
      />
    </Drawer>
  );
}
