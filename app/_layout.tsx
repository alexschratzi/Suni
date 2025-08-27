// app/_layout.tsx
import { Drawer } from "expo-router/drawer";

export default function RootLayout() {
  return (
    <Drawer>
      {/* Tabs als Hauptbereich */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Start",
          headerShown: false, // Tabs regeln ihr eigenes Header
        }}
      />

      {/* Seitenmenü-Punkte */}
      <Drawer.Screen
        name="profile"
        options={{ title: "Profil" }}
      />
      <Drawer.Screen
        name="todos"
        options={{ title: "To-Dos" }}
      />
    </Drawer>
  );
}
