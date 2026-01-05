// app/(app)/(stack)/headers/timetable.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { View, Pressable, StyleSheet, DeviceEventEmitter, Animated } from "react-native";
import { Button, Portal, Surface, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import "dayjs/locale/de";



dayjs.locale("de");

const TIMETABLE_HEADER_EVENT = "timetable:currentMonday";

// ✅ NEW: mode event (shared between header + timetable screen)
export type TimetableDisplayMode = "courses" | "party";
const TIMETABLE_MODE_EVENT = "timetable:displayMode";

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

  // ✅ Initialize immediately so cold start shows month/year
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

  const title = useMemo(() => {
    // ✅ Short month: "Jan. 2026" (de locale)
    return dayjs(currentMonday).format("MMM YYYY");
  }, [currentMonday]);

  return (
    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
      {title}
    </Text>
  );
}

// 🔹 RIGHT SIDE: mode toggle + triple dot + bottom sheet menu
export function TimetableHeaderRight() {
  const theme = useTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  // display mode (default)
  const [mode, setMode] = useState<TimetableDisplayMode>("courses");

  // 🔔 bounce animation value
  const scale = useRef(new Animated.Value(1)).current;

  // ✅ emit mode change AFTER commit
  useEffect(() => {
    DeviceEventEmitter.emit(TIMETABLE_MODE_EVENT, mode);
  }, [mode]);

  const triggerBounce = () => {
    scale.setValue(0.9);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const toggleMode = () => {
    // ✅ haptic tic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    triggerBounce();

    setMode((prev) => (prev === "courses" ? "party" : "courses"));
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const goToCalendarSettings = () => {
    closeMenu();
    router.push("/(app)/(stack)/settings/timetable");
  };

  const goToGeneralSettings = () => {
    closeMenu();
    router.push("/(app)/(stack)/global_settings");
  };

  const goToProfile = () => {
    closeMenu();
    router.push("/(app)/(stack)/profile");
  };

  const modeIcon = mode === "courses" ? "calendar-outline" : "megaphone-outline";

  return (
    <>
      <View style={styles.rightRow}>
        {/* 🔁 MODE TOGGLE */}
        <Pressable
          onPress={toggleMode}
          style={styles.iconButton}
          accessibilityRole="button"
          aria-label={
            mode === "courses"
              ? "Modus: Kurse (tippen für Party)"
              : "Modus: Party (tippen für Kurse)"
          }
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons
              name={modeIcon as any}
              size={20}
              color={theme.colors.onSurface}
            />
          </Animated.View>
        </Pressable>

        {/* ⋯ MENU */}
        <Pressable
          onPress={openMenu}
          style={styles.iconButton}
          accessibilityRole="button"
          aria-label="Stundenplan-Optionen"
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
            <Pressable style={styles.scrim} onPress={closeMenu} />

            <Surface
              elevation={3}
              style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            >
              <Text
                variant="titleMedium"
                style={{
                  marginBottom: 8,
                  color: theme.colors.onSurface,
                  textAlign: "center",
                }}
              >
                Stundenplan-Optionen
              </Text>

              <Button
                mode="contained-tonal"
                style={styles.sheetButton}
                icon="calendar-today"
                onPress={goToCalendarSettings}
              >
                Kalendar-Optionen
              </Button>

              <Button
                mode="contained-tonal"
                style={styles.sheetButton}
                icon="cog-outline"
                onPress={goToGeneralSettings}
              >
                Allgemeine Einstellungen
              </Button>

              <Button
                mode="contained-tonal"
                style={styles.sheetButton}
                icon="account-circle-outline"
                onPress={goToProfile}
              >
                Profil
              </Button>

              <Button
                mode="text"
                style={[styles.sheetButton, { marginTop: 4 }]}
                onPress={closeMenu}
              >
                Abbrechen
              </Button>
            </Surface>
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
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetButton: {
    marginTop: 8,
  },
});

