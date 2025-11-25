// app/(drawer)/headers/DefaultHeader.tsx
import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

export default function DefaultHeaderRight() {
  const theme = useTheme();
  const router = useRouter();

  const goToGlobalSettings = () => {
    router.push("/(drawer)/global_settings");
  };

  return (
    <Pressable
      onPress={goToGlobalSettings}
      style={{ paddingHorizontal: 12, paddingVertical: 4 }}
      accessibilityRole="button"
      aria-label="Allgemeine Einstellungen"
    >
      <Ionicons
        name="settings-outline"
        size={22}
        color={theme.colors.onSurface}
      />
    </Pressable>
  );
}
