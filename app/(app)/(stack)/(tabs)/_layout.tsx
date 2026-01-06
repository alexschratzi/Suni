// app/(app)/(stack)/(tabs)/_layout.tsx
import * as React from "react";
import { StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { useTheme } from "react-native-paper";
import { CommonActions } from "@react-navigation/native";

const { Navigator } = createMaterialTopTabNavigator();
export const MaterialTopTabs = withLayoutContext(Navigator);

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  news: "newspaper-outline",
  uni: "school-outline",
  timetable: "calendar-outline",
  chat: "chatbubbles-outline",
};

export default function TabLayout() {
  const theme = useTheme();

  /* ------------------------------------------------------------------ */
  /* Double-tap detection (FAST)                                         */
  /* ------------------------------------------------------------------ */
  const lastTapRef = React.useRef<{ key: string; ts: number } | null>(null);
  const DOUBLE_TAP_MS = 220;

  /* ------------------------------------------------------------------ */
  /* Jump spam guard                                                     */
  /* ------------------------------------------------------------------ */
  const jumpLockRef = React.useRef(false);
  const jumpLockTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const lockJump = React.useCallback(() => {
    jumpLockRef.current = true;
    if (jumpLockTimerRef.current) clearTimeout(jumpLockTimerRef.current);

    // covers the CalendarKit goToDate animation window
    jumpLockTimerRef.current = setTimeout(() => {
      jumpLockRef.current = false;
    }, 200);
  }, []);

  React.useEffect(() => {
    return () => {
      if (jumpLockTimerRef.current) clearTimeout(jumpLockTimerRef.current);
    };
  }, []);

  /* ------------------------------------------------------------------ */
  /* Calendar icon animation (non-stacking)                              */
  /* ------------------------------------------------------------------ */
  const calendarScale = React.useRef(new Animated.Value(1)).current;
  const bounceRunningRef = React.useRef(false);

  const playCalendarBounce = React.useCallback(() => {
    if (bounceRunningRef.current) return;
    bounceRunningRef.current = true;

    calendarScale.stopAnimation(() => {
      calendarScale.setValue(1);

      Animated.sequence([
        Animated.timing(calendarScale, {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.spring(calendarScale, {
          toValue: 1,
          friction: 4,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        bounceRunningRef.current = false;
      });
    });
  }, [calendarScale]);

  return (
      <MaterialTopTabs
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          tabBarShowLabel: false,
          tabBarIndicatorStyle: { height: 0 },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 90,
            paddingBottom: 10,
            paddingTop: 5,
          },
          sceneStyle: {
            backgroundColor: theme.colors.surface,
          },
          tabBarIcon: ({ color }) => {
            const icon = (
              <Ionicons
                name={ICONS[route.name] ?? "ellipse-outline"}
                size={28}
                color={color}
              />
            );

            if (route.name !== "timetable") return icon;

            return (
              <Animated.View style={{ transform: [{ scale: calendarScale }] }}>
                {icon}
              </Animated.View>
            );
          },
        })}
        screenListeners={({ route, navigation }) => ({
          tabPress: () => {
            if (route.name !== "timetable") return;
            if (!navigation.isFocused()) return;

            const now = Date.now();
            const last = lastTapRef.current;

            const isDoubleTap =
              last?.key === "timetable" && now - last.ts <= DOUBLE_TAP_MS;

            lastTapRef.current = { key: "timetable", ts: now };

            if (!isDoubleTap) return;

            // hard guard: ignore spam while jump animation is active
            if (jumpLockRef.current) return;
            lockJump();

            Haptics.selectionAsync().catch(() => {});
            playCalendarBounce();

            navigation.dispatch(
              CommonActions.navigate({
                name: "timetable",
                params: { jumpToToday: String(now) },
                merge: true,
              }),
            );
          },
        })}
      >
        <MaterialTopTabs.Screen name="news" options={{ title: "News" }} />
        <MaterialTopTabs.Screen name="uni" options={{ title: "Uni" }} />
        <MaterialTopTabs.Screen
          name="timetable"
          options={{ title: "Kalender" }}
        />
        <MaterialTopTabs.Screen name="chat" options={{ title: "Chat" }} />
      </MaterialTopTabs>
  );
}
