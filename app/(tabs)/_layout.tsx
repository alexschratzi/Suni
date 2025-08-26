import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {/* Index bleibt Start, aber unsichtbar */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* Menü-Tab (öffnet Drawer) */}
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menü",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // verhindert, dass menu.tsx geöffnet wird
            navigation.openDrawer(); // Drawer öffnen
          },
        })}
      />

      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="uni"
        options={{
          title: "Uni",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="timetable"
        options={{
          title: "Kalender",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
