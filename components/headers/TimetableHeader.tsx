// app/(app)/(stack)/headers/timetable.tsx
import React, { useMemo, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import {
  Button,
  Portal,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useGlobalSearchParams } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/de";

dayjs.locale("de");

// 🔹 TITLE COMPONENT: shows the month name for the current Monday
export function TimetableHeaderTitle() {
  const theme = useTheme();
  const { currentMonday } = useGlobalSearchParams<{ currentMonday?: string }>();

  const title = useMemo(() => {
    if (!currentMonday) return "Amadeus";
    return dayjs(currentMonday).format("MMMM"); // e.g. "Jänner"
  }, [currentMonday]);

  return (
    <Text
      variant="titleMedium"
      style={{ color: theme.colors.onSurface }}
    >
      {title}
    </Text>
  );
}

// 🔹 RIGHT SIDE: triple dot + bottom sheet menu
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
    router.push("/(app)/(stack)/global_settings");
  };

  const goToProfile = () => {
    closeMenu();
    router.push("/(app)/(stack)/profile");
  };

  return (
    <>
      <Pressable
        onPress={openMenu}
        style={{ paddingHorizontal: 12, paddingVertical: 4 }}
        accessibilityRole="button"
        aria-label="Stundenplan-Optionen"
      >
        <Ionicons
          name="ellipsis-horizontal-outline"
          size={22}
          color={theme.colors.onSurface}
        />
      </Pressable>

      <Portal>
        {menuVisible && (
          <View
            style={StyleSheet.absoluteFillObject}
            pointerEvents="box-none"
          >
            {/* Scrim */}
            <Pressable
              style={styles.scrim}
              onPress={closeMenu}
            />

            {/* Bottom sheet */}
            <Surface
              elevation={3}
              style={[
                styles.sheet,
                { backgroundColor: theme.colors.surface },
              ]}
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
