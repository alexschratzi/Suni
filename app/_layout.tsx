import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { PaperProvider } from "react-native-paper";

export default function RootLayout() {
  return (
    <PaperProvider>
      <Drawer screenOptions={{ headerShown: false }}>
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: "Start",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "Profil",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="todos"
          options={{
            drawerLabel: "To-Dos",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="list" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </PaperProvider>
  );
}
