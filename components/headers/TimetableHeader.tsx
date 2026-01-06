// components/headers/TimetableHeader.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, StyleSheet, DeviceEventEmitter } from "react-native";
import { Button, Portal, Surface, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/de";

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

  const title = useMemo(() => dayjs(currentMonday).format("MMM YYYY"), [currentMonday]);

  return (
    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
      {title}
    </Text>
  );
}

// 🔹 RIGHT SIDE: toggle + triple dot + bottom sheet menu
export function TimetableHeaderRight() {
  const theme = useTheme();
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

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

  return (
    <>
      <View style={styles.rightRow}>
        {/* 🔁 MODE TOGGLE (separated component) */}
        <TimetableModeToggleButton />

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
