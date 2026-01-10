// components/university/HubTile.tsx
import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

  const border = "rgba(255,255,255,0.10)";
  const surface = "rgba(255,255,255,0.04)"; // subtle tile surface

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: disabled ? 0.5 : 1,
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

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightChevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color="rgba(255,255,255,0.55)"
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
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    opacity: 0.7,
  },
});
