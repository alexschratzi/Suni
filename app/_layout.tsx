// app/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerToggleButton,
} from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import * as React from "react";
import { Pressable, Text } from "react-native";
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
} from "react-native-paper";

// ---- App theme (Paper) ----
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#2563eb",   // ✅ your blue
    onPrimary: "#ffffff", // text/icons on primary
  },
};

export default function RootLayout(props: any) {
  const router = useRouter();

  return (
    <PaperProvider theme={theme}>
      {/* White text on blue header */}
      <StatusBar style="light" />

      <Drawer
        screenOptions={{
          headerTitle: "Suni",
          // Blue header + white content
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTitleStyle: { color: theme.colors.onPrimary },
          headerTintColor: theme.colors.onPrimary,
          headerLeft: () => (
            <DrawerToggleButton tintColor={theme.colors.onPrimary} />
          ),

          // Drawer item colors
          drawerActiveTintColor: theme.colors.primary,
          drawerInactiveTintColor: "#6b7280", // slate-500
        }}
        drawerContent={(drawerProps) => (
          <DrawerContentScrollView {...drawerProps}>
            {/* Default screens */}
            <DrawerItemList {...drawerProps} />

            {/* Logout Button */}
            <Pressable
              onPress={async () => {
                // your existing logic
                const { logout } = await import("../utils/logout");
                await logout();
                router.push("/");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 15,
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="black" />
              <Text style={{ marginLeft: 10, fontSize: 16 }}>Logout</Text>
            </Pressable>
          </DrawerContentScrollView>
        )}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            title: "Home",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            title: "Profil",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="todos"
          options={{
            title: "Todos",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="list-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </PaperProvider>
  );
}
