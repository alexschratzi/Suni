// app/_layout.tsx
import * as React from "react";
import { StatusBar } from "expo-status-bar";
import { Drawer } from "expo-router/drawer";
import { DrawerToggleButton } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import {AppThemeProvider, getCurrentTheme} from "../theme"; // <-- new
import { useColorScheme } from "react-native";
import {useTheme} from "react-native-paper";



export default function RootLayout() {
  const scheme = useColorScheme();
    const theme = useTheme();

  return (
    <AppThemeProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Drawer
        screenOptions={{
          headerTitle: "Suni",
          headerLeft: () => <DrawerToggleButton />,
          // No color overrides—Navigation theme gets them from Paper automatically
        }}
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
    </AppThemeProvider>
  );
}
