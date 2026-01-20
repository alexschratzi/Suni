// app/(app)/(stack)/(tabs)/_layout.tsx
import * as React from "react";
import { StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { useTheme, type MD3Theme } from "react-native-paper";
import { CommonActions } from "@react-navigation/native";

import { useTimetableDisplayMode } from "@/src/timetable/utils/mode";
import { useTimetableTheming } from "@/src/timetable/utils/useTimetableTheming";

const { Navigator } = createMaterialTopTabNavigator();
export const MaterialTopTabs = withLayoutContext(Navigator);

const ICONS: Record<
  string,
  { inactive: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }
> = {
  news: { inactive: "newspaper-outline", active: "newspaper" },
  uni: { inactive: "school-outline", active: "school" },
  timetable: { inactive: "calendar-outline", active: "calendar" },
  chat: { inactive: "chatbubbles-outline", active: "chatbubbles" },
};

export default function TabLayout() {
  const theme = useTheme<MD3Theme>();
  const displayMode = useTimetableDisplayMode("courses");
  const { nav, baseTabBarStyle, partyTabBarStyle, isParty } = useTimetableTheming(
    theme,
    displayMode,
  );

  // ─────────── Double-tap tracking for timetable ───────────
  const lastTapRef = React.useRef<{ key: string; ts: number } | null>(null);
  const DOUBLE_TAP_MS = 220;

  // ─────────── Global lock against spam taps ───────────
  const actionLockRef = React.useRef(false);
  const actionLockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockAction = React.useCallback(() => {
    actionLockRef.current = true;
    if (actionLockTimerRef.current) clearTimeout(actionLockTimerRef.current);
    actionLockTimerRef.current = setTimeout(() => (actionLockRef.current = false), 220);
  }, []);

  React.useEffect(() => {
    return () => {
      if (actionLockTimerRef.current) clearTimeout(actionLockTimerRef.current);
    };
  }, []);

  // ─────────── Bounce animations (grow then bounce back) ───────────
  const calendarScale = React.useRef(new Animated.Value(1)).current;
  const newsScale = React.useRef(new Animated.Value(1)).current;

  const bounceRunningRef = React.useRef<{ calendar: boolean; news: boolean }>({
    calendar: false,
    news: false,
  });

  const playBounce = React.useCallback(
    (which: "calendar" | "news") => {
      const scale = which === "calendar" ? calendarScale : newsScale;

      if (bounceRunningRef.current[which]) return;
      bounceRunningRef.current[which] = true;

      // Stop any ongoing animation and start from 1
      scale.stopAnimation(() => {
        scale.setValue(1);

        // ✅ Grow bigger quickly, then spring back to 1 (bounce)
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.18,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1,
            friction: 4,
            tension: 240,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bounceRunningRef.current[which] = false;
        });
      });
    },
    [calendarScale, newsScale],
  );

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        swipeEnabled: true,
        tabBarShowLabel: false,
        tabBarIndicatorStyle: { height: 0 },

        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: baseTabBarStyle,

        sceneStyle: { backgroundColor: theme.colors.surface },

        tabBarIcon: ({ color, focused }) => {
          const pair = ICONS[route.name];
          const name = pair
            ? focused
              ? pair.active
              : pair.inactive
            : (focused ? "ellipse" : "ellipse-outline");

          const icon = <Ionicons name={name} size={28} color={color} />;

          if (route.name === "timetable") {
            return (
              <Animated.View style={{ transform: [{ scale: calendarScale }] }}>
                {icon}
              </Animated.View>
            );
          }

          if (route.name === "news") {
            return (
              <Animated.View style={{ transform: [{ scale: newsScale }] }}>
                {icon}
              </Animated.View>
            );
          }

          return icon;
        },
      })}
      screenListeners={({ route, navigation }) => ({
        tabPress: () => {
          // ─────────── News: SINGLE TAP when already on News ───────────
          if (route.name === "news") {
            if (!navigation.isFocused()) return;
            if (actionLockRef.current) return;
            lockAction();

            Haptics.selectionAsync().catch(() => {});
            playBounce("news");

            const now = Date.now();
            navigation.dispatch(
              CommonActions.navigate({
                name: "news",
                params: { scrollToTop: String(now) },
                merge: true,
              }),
            );
            return;
          }

          // ─────────── Timetable: DOUBLE TAP to jump ───────────
          if (route.name === "timetable") {
            if (!navigation.isFocused()) return;

            const now = Date.now();
            const last = lastTapRef.current;
            const isDoubleTap = last?.key === "timetable" && now - last.ts <= DOUBLE_TAP_MS;

            lastTapRef.current = { key: "timetable", ts: now };
            if (!isDoubleTap) return;

            if (actionLockRef.current) return;
            lockAction();

            Haptics.selectionAsync().catch(() => {});
            playBounce("calendar");

            navigation.dispatch(
              CommonActions.navigate({
                name: "timetable",
                params: { jumpToToday: String(now) },
                merge: true,
              }),
            );
          }
        },
      })}
    >
      <MaterialTopTabs.Screen name="news" options={{ title: "News" }} />
      <MaterialTopTabs.Screen name="uni" options={{ title: "Uni" }} />
      <MaterialTopTabs.Screen name="chat" options={{ title: "Chat" }} />
      <MaterialTopTabs.Screen
        name="timetable"
        options={{
          title: "Kalender",
          tabBarActiveTintColor: isParty && nav ? nav.primary : theme.colors.primary,
          tabBarStyle: isParty && partyTabBarStyle ? partyTabBarStyle : baseTabBarStyle,
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({});
