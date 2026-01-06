// components/timetable/TimetableModeToggleButton.tsx
import React, { useCallback, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  useTimetableDisplayMode,
  toggleTimetableDisplayMode,
} from "@/src/timetable/utils/mode";

type Props = {
  size?: number;
};

export function TimetableModeToggleButton({ size = 20 }: Props) {
  const theme = useTheme();

  // ✅ session-persistent mode
  const mode = useTimetableDisplayMode("courses");

  // 🔔 bounce animation value
  const scale = useRef(new Animated.Value(1)).current;

  const triggerBounce = useCallback(() => {
    scale.setValue(0.9);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const onPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    triggerBounce();
    toggleTimetableDisplayMode();
  }, [triggerBounce]);

  const ariaLabel = useMemo(
    () =>
      mode === "courses"
        ? "Modus: Kurse (tippen für Party)"
        : "Modus: Party (tippen für Kurse)",
    [mode],
  );

  const iconName = mode === "courses" ? "calendar-outline" : "megaphone-outline";

  return (
    <Pressable
      onPress={onPress}
      style={styles.iconButton}
      accessibilityRole="button"
      aria-label={ariaLabel}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={iconName as any} size={size} color={theme.colors.onSurface} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
