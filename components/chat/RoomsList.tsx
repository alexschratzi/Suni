/**
 * RoomsList.tsx
 * List of public threads.
 */

import React from "react";
import { View, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "./EmptyState";
import { useTranslation } from "react-i18next";

export type RoomKey = "salzburg" | "oesterreich" | "wirtschaft";

export type RoomItem = {
  key: RoomKey;
  title: string;
  subtitle: string;
};

type Props = {
  rooms: RoomItem[];
  onSelect: (room: RoomKey) => void;
};

export default function RoomsList({ rooms, onSelect }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <FlatList
      data={rooms}
      keyExtractor={(it) => it.key}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={({ item }) => (
        <Surface
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => onSelect(item.key)}
            style={styles.row}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.onPrimary} />
            </View>
            <View style={styles.main}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {item.title}
              </Text>
              <Text
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                {item.subtitle}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </Surface>
      )}
      ListEmptyComponent={
        <EmptyState
          title={t("chat.empty.roomsTitle")}
          subtitle={t("chat.empty.roomsSubtitle")}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  main: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
});
