import * as React from "react";
import { Pressable, StyleSheet, View, Platform } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  rightChevron?: boolean;
};

export default function HubTile({
  title,
  subtitle,
  icon,
  onPress,
  disabled,
  rightChevron = true,
}: Props) {
  const theme = useTheme();
  const isDark = theme.dark;

  // ✅ Use theme elevation colors instead of translucent white overlays in dark mode
  const surface = isDark
    ? (theme.colors.elevation?.level2 ?? theme.colors.surface)
    : theme.colors.surface;

  const border = isDark
    ? (theme.colors.outlineVariant ?? "rgba(255,255,255,0.12)")
    : (theme.colors.outlineVariant ?? "rgba(0,0,0,0.08)");

  const shadowStyle = isDark ? styles.shadowDark : styles.shadowLight;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.tile,
        shadowStyle,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
          transform: pressed ? [{ scale: 0.99 }] : undefined,
        },
      ]}
    >
      <View style={styles.left}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={theme.colors.onSurface}
            style={{ marginRight: 12 }}
          />
        ) : null}

        <View style={{ flex: 1, backgroundColor: "transparent" }}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant ?? theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightChevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={theme.colors.onSurfaceVariant ?? (isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.35)")}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "100%",
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
    backgroundColor: "transparent",
  },
  title: { fontSize: 15, fontWeight: "600" },
  subtitle: { marginTop: 2, fontSize: 12, opacity: 0.85 },

  shadowLight: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.10,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  shadowDark: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
});
