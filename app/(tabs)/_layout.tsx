import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";

export default function TabLayout() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  // Gemeinsame Header-Optionen für alle Tabs
  const withMenuButton = (title: string, icon: string) => ({
    title,
    tabBarIcon: ({ color, size }: any) => (
      <Ionicons name={icon as any} size={size} color={color} />
    ),
    headerLeft: () => (
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={{ marginLeft: 15 }}
      >
        <Ionicons name="menu" size={28} color="black" />
      </Pressable>
    ),
  });

  return (
    <Tabs>
      <Tabs.Screen
        name="news"
        options={withMenuButton("News", "newspaper-outline")}
      />
      <Tabs.Screen
        name="uni"
        options={withMenuButton("Uni", "school-outline")}
      />
      <Tabs.Screen
        name="timetable"
        options={withMenuButton("Kalender", "calendar-outline")}
      />
      <Tabs.Screen
        name="chat"
        options={withMenuButton("Chat", "chatbubbles-outline")}
      />

      {/* Index NICHT im Tab anzeigen */}
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      {/* Menü NICHT im Tab anzeigen */}
      <Tabs.Screen
        name="menu"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
