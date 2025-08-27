// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  const withTab = (title: string, icon: string) => ({
    title,
    tabBarIcon: ({ color, size }: any) => (
      <Ionicons name={icon as any} size={size} color={color} />
    ),
    headerShown: false, // ❌ kein zweiter Header
  });

  return (
    <Tabs>
      <Tabs.Screen name="news" options={withTab("News", "newspaper-outline")} />
      <Tabs.Screen name="uni" options={withTab("Uni", "school-outline")} />
      <Tabs.Screen name="timetable" options={withTab("Kalender", "calendar-outline")} />
      <Tabs.Screen name="chat" options={withTab("Chat", "chatbubbles-outline")} />
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="menu" options={{ href: null }} />
    </Tabs>
  );
}
