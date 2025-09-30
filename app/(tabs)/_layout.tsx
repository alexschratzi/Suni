// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";

// ✅ Add this import
import { UniversityProvider } from "../../components/university/UniversityContext";

const { Navigator } = createMaterialTopTabNavigator();
export const MaterialTopTabs = withLayoutContext(Navigator);

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  news: "newspaper-outline",
  uni: "school-outline",
  timetable: "calendar-outline",
  chat: "chatbubbles-outline",
};

export default function TabLayout() {
  return (
    // ✅ Provider wraps the whole tab navigator
    <UniversityProvider>
      <MaterialTopTabs
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          tabBarShowLabel: false,
          tabBarIndicatorStyle: { height: 0 },
          tabBarActiveTintColor: "#111",
          tabBarInactiveTintColor: "#888",
          tabBarStyle: {
            backgroundColor: "white",
            height: 90,
            paddingBottom: 10,
            paddingTop: 5,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons
              name={ICONS[route.name] ?? "ellipse-outline"}
              size={28}
              color={color}
            />
          ),
        })}
      >
        <MaterialTopTabs.Screen name="news" options={{ title: "News" }} />
        <MaterialTopTabs.Screen name="uni" options={{ title: "Uni" }} />
        <MaterialTopTabs.Screen name="timetable" options={{ title: "Kalender" }} />
        <MaterialTopTabs.Screen name="chat" options={{ title: "Chat" }} />
      </MaterialTopTabs>
    </UniversityProvider>
  );
}
