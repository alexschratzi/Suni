// components/headers/DefaultHeaderRight.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

type Props = {
  section?: string;
};

export default function DefaultHeaderRight({ section }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const goToGlobalSettings = () => {
    if (section) {
      router.push({
        pathname: "/(app)/(stack)/global_settings",
        params: { section },
      });
      return;
    }
    router.push("/(app)/(stack)/global_settings");
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    justifyContent: "center",
    alignItems: "flex-end",
  },
});
