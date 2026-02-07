/**
 * RoomsList.tsx
 * List of public threads.
 */

import React from "react";
import { View, FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "./EmptyState";
import { useTranslation } from "react-i18next";

export type RoomItem = {
  key: string;
  title: string;
  subtitle?: string | null;
  threadNumber?: number | null;
  isVisible?: boolean;
};

type Props = {
  rooms: RoomItem[];
  onSelect: (room: RoomItem) => void;
  onMakeVisible?: (room: RoomItem) => void;
  showHiddenActions?: boolean;
  loading?: boolean;
  pendingKeys?: Set<string>;
};

export default function RoomsList({
  rooms,
  onSelect,
  onMakeVisible,
  showHiddenActions = false,
  loading = false,
  pendingKeys,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: RoomItem }) => {
    const isHidden = showHiddenActions && item.isVisible === false;
    const pending = pendingKeys?.has(item.key) ?? false;
    const subtitle =
      item.subtitle?.trim() ||
      (typeof item.threadNumber === "number"
        ? `#${item.threadNumber}`
        : item.key);

    return (
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={styles.rowTap}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={20}
                color={theme.colors.onPrimary}
              />
            </View>
            <View style={styles.main}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  {item.title}
                </Text>
                {typeof item.threadNumber === "number" && (
                  <Text
                    style={[
                      styles.threadNumber,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    #{item.threadNumber}
                  </Text>
                )}
              </View>
              <Text
                style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
              {isHidden && (
                <Text
                  style={[
                    styles.hiddenLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("chat.rooms.hiddenLabel")}
                </Text>
              )}
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          {isHidden && (
            <Button
              mode="outlined"
              compact
              icon="eye-outline"
              onPress={() => onMakeVisible?.(item)}
              loading={pending}
              disabled={pending}
              style={styles.showButton}
            >
              {t("chat.rooms.makeVisible")}
            </Button>
          )}
        </View>
      </Surface>
    );
  };

  return (
    <FlatList
      data={rooms}
      keyExtractor={(it) => it.key}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      renderItem={renderItem}
      ListEmptyComponent={
        <EmptyState
          title={t("chat.empty.roomsTitle")}
          subtitle={loading ? t("common.loading") : t("chat.empty.roomsSubtitle")}
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
    padding: 12,
    gap: 8,
  },
  rowTap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  threadNumber: {
    fontSize: 12,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
  },
  hiddenLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  showButton: {
    borderRadius: 999,
  },
});
