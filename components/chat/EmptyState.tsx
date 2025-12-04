// components/chat/EmptyState.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";

type Props = {
  title: string;
  subtitle?: string;
};

export default function EmptyState({ title, subtitle }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons
        name="chatbubble-ellipses-outline"
        size={40}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginTop: 8 }}
      >
        {title}
      </Text>
      {!!subtitle && (
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: 16 },
});
