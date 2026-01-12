// components/headers/TimetableHeader.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  DeviceEventEmitter,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Portal, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/de";
import { BlurView } from "expo-blur";

import { TIMETABLE_HEADER_EVENT } from "@/src/timetable/utils/mode";
import { TimetableModeToggleButton } from "@/components/timetable/TimetableModeToggleButton";

dayjs.locale("de");

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
const fmtYMD = (d: Date) => dayjs(d).format("YYYY-MM-DD");

// 🔹 TITLE COMPONENT: shows the month + year for the current Monday
export function TimetableHeaderTitle() {
  const theme = useTheme();

  const [currentMonday, setCurrentMonday] = useState<string>(() =>
    fmtYMD(getMonday(new Date())),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      TIMETABLE_HEADER_EVENT,
      (mondayIso?: string) => {
        if (typeof mondayIso === "string" && mondayIso.length > 0) {
          setCurrentMonday(mondayIso);
        }
      },
    );

    return () => sub.remove();
  }, []);

  const title = useMemo(
    () => dayjs(currentMonday).format("MMM YYYY"),
    [currentMonday],
  );

  return (
    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
      {title}
    </Text>
  );
}

type Anchor = { x: number; y: number; w: number; h: number } | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 🔹 RIGHT SIDE: toggle + triple dot + expanding “glass bubble” menu (iOS + Android)
export function TimetableHeaderRight() {
  const theme = useTheme();
  const router = useRouter();

  const btnRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>(null);

  const progress = useRef(new Animated.Value(0)).current;

  const measureAnchor = useCallback(() => {
    return new Promise<Anchor>((resolve) => {
      const node = btnRef.current as any;
      if (!node?.measureInWindow) return resolve(null);

      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        resolve({ x, y, w, h });
      });
    });
  }, []);

  const openMenu = useCallback(async () => {
    const a = await measureAnchor();
    setAnchor(a);
    setMenuVisible(true);

    progress.stopAnimation();
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();
  }, [measureAnchor, progress]);

  const closeMenu = useCallback(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  }, [progress]);

  const goToCalendarSettings = () => {
    closeMenu();
    router.push("/(app)/(stack)/settings/timetable");
  };

  const goToGeneralSettings = () => {
    closeMenu();
    router.push({
      pathname: "/(app)/(stack)/global_settings",
      params: { section: "calendar" },
    });
  };

  const goToProfile = () => {
    closeMenu();
    router.push("/(app)/(stack)/profile");
  };

  // Layout for expanded bubble
  const { width: screenW, height: screenH } = Dimensions.get("window");
  const BUBBLE_W = 240;

  const bubblePos = useMemo(() => {
  const fallback = {
    left: screenW - BUBBLE_W - 12,
    top: Platform.OS === "android" ? 72 : 60,
  };
  if (!anchor) return fallback;

  const preferredLeft = anchor.x + anchor.w - BUBBLE_W;
  const left = clamp(preferredLeft, 12, screenW - BUBBLE_W - 12);

  // 👇 platform-specific vertical offset
  const verticalOffset = Platform.OS === "android" ? 30 : 10;

  const preferredTop = anchor.y + anchor.h + verticalOffset;
  const top = clamp(preferredTop, 12, screenH - 220);

  return { left, top };
}, [anchor, screenW, screenH]);


  const bubbleAnimStyle = useMemo(() => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 1],
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.25, 1],
      outputRange: [0, 0.85, 1],
    });
    const translateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-6, 0],
    });

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  }, [progress]);

  const scrimOpacity = useMemo(() => {
    return progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
  }, [progress]);

  // Platform tuning:
  // - iOS: real blur, more translucent
  // - Android: weaker blur + more opaque “glass” surface + elevation
  const blurIntensity = Platform.OS === "ios" ? 18 : 10;
  const tint = Platform.OS === "ios" ? "light" : "default";

  const innerBg =
    Platform.OS === "ios" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.92)";
  const border =
    Platform.OS === "ios"
      ? "rgba(255,255,255,0.35)"
      : "rgba(255,255,255,0.18)";

  return (
    <>
      <View style={styles.rightRow}>
        <TimetableModeToggleButton />

        {/* ⋯ MENU BUTTON */}
        <Pressable
          ref={btnRef}
          onPress={openMenu}
          style={styles.iconButton}
          accessibilityRole="button"
          aria-label="Kalender-Aktionen"
          hitSlop={10}
        >
          <Ionicons
            name="ellipsis-horizontal-outline"
            size={22}
            color={theme.colors.onSurface}
          />
        </Pressable>
      </View>

      <Portal>
        {menuVisible && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {/* SCRIM (tap outside closes) */}
            <Animated.View
              style={[styles.scrim, { opacity: scrimOpacity }]}
              pointerEvents="auto"
            >
              <Pressable
                style={StyleSheet.absoluteFillObject}
                onPress={closeMenu}
              />
            </Animated.View>

            {/* EXPANDING GLASS BUBBLE (iOS + Android) */}
            <Animated.View
              style={[
                styles.bubbleWrap,
                {
                  left: bubblePos.left,
                  top: bubblePos.top,
                  width: BUBBLE_W,
                },
                bubbleAnimStyle,
              ]}
            >
              <View style={styles.bubbleShadow}>
                <BlurView intensity={blurIntensity} tint={tint} style={styles.bubbleBlur}>
                  <View
                    style={[
                      styles.bubbleInner,
                      {
                        borderColor: border,
                        backgroundColor: innerBg,
                      },
                    ]}
                  >
                    <View style={styles.bubbleList}>
                      <Pressable
                        onPress={goToCalendarSettings}
                        style={({ pressed }) => [
                          styles.bubbleRow,
                          pressed && styles.bubbleRowPressed,
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={theme.colors.onSurface}
                        />
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.bubbleRowText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Kalender verwalten
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={goToGeneralSettings}
                        style={({ pressed }) => [
                          styles.bubbleRow,
                          pressed && styles.bubbleRowPressed,
                        ]}
                      >
                        <Ionicons
                          name="settings-outline"
                          size={18}
                          color={theme.colors.onSurface}
                        />
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.bubbleRowText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Einstellungen
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={goToProfile}
                        style={({ pressed }) => [
                          styles.bubbleRow,
                          pressed && styles.bubbleRowPressed,
                        ]}
                      >
                        <Ionicons
                          name="person-circle-outline"
                          size={18}
                          color={theme.colors.onSurface}
                        />
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.bubbleRowText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          Profil
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </BlurView>
              </View>
            </Animated.View>
          </View>
        )}
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.14)",
  },

  bubbleWrap: {
    position: "absolute",
  },
  bubbleShadow: {
    borderRadius: 22,
    overflow: "hidden",

    // iOS shadow
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },

    // Android shadow
    elevation: 12,
  },
  bubbleBlur: {
    borderRadius: 22,
    overflow: "hidden",
  },
  bubbleInner: {
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  bubbleList: {
    gap: 6,
    paddingVertical: 2,
  },
  bubbleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  bubbleRowPressed: {
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  bubbleRowText: {
    marginLeft: 10,
  },
});
