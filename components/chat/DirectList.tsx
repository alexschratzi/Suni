/**
 * DirectList.tsx
 * List of direct messages with quick access to friends/requests.
 */

import React from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Button, Avatar, useTheme, Text, Surface } from "react-native-paper";
import { Router } from "expo-router";
import EmptyState from "./EmptyState";
import { initials } from "../../utils/utils";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

export type Direct = {
  id: string;
  otherUid: string;
  displayName: string;
  last?: string;
  lastTimestamp?: string | null;
  hidden?: boolean;
  unreadCount?: number;
  avatarUrl?: string | null;
};

type Props = {
  directs: Direct[];
  router: Router;
  onToggleHidden: (id: string, makeHidden: boolean) => void;
  accentColor: string;
  pendingCount?: number;
};

export default function DirectList({
  directs,
  router,
  onToggleHidden,
  accentColor,
  pendingCount = 0,
}: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const formatTimestamp = (value?: string | null) => {
    if (!value) return "";
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) return "";
    const now = new Date();
    const sameDay = dateValue.toDateString() === now.toDateString();
    return sameDay
      ? dateValue.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      : dateValue.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  };

  return (
    <View style={{ flex: 1 }}>
      <Button
        mode="contained-tonal"
        compact
        icon="account-multiple"
        contentStyle={{ justifyContent: "flex-start" }}
        style={styles.requestsButton}
        onPress={() => router.push("/(app)/(stack)/friends")}
      >
        {pendingCount > 0
          ? `${t("chat.direct.showRequests")} (${pendingCount})`
          : t("chat.direct.showRequests")}
      </Button>

      <FlatList
        data={directs}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const timeLabel = formatTimestamp(item.lastTimestamp);
          const preview = item.last?.trim();
          const previewText = preview || t("settings.friendsSection.hiddenNoMessage");
          const hideLabel = item.hidden ? t("chat.direct.unhide") : t("chat.direct.hide");
          const hideIcon = item.hidden ? "eye-outline" : "eye-off-outline";
          const unreadCount = item.unreadCount ?? 0;

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
                <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: "/(app)/(stack)/reply",
                    params: {
                      dmId: item.id,
                      otherUid: item.otherUid,
                      otherName: item.displayName,
                    },
                  });
                }}
                activeOpacity={0.8}
                style={styles.row}
              >
                {item.avatarUrl ? (
                  <Avatar.Image
                    size={44}
                    source={{ uri: item.avatarUrl }}
                    style={{ backgroundColor: theme.colors.surfaceVariant }}
                  />
                ) : (
                  <Avatar.Text
                    size={44}
                    label={initials(item.displayName)}
                    color={theme.colors.onPrimary}
                    style={{ backgroundColor: accentColor }}
                  />
                )}
                <View style={styles.main}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.name, { color: theme.colors.onSurface }]}>
                      {item.displayName}
                    </Text>
                    <View style={styles.headerMeta}>
                      {!!timeLabel && (
                        <Text
                          style={[styles.time, { color: theme.colors.onSurfaceVariant }]}
                        >
                          {timeLabel}
                        </Text>
                      )}
                      {unreadCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: accentColor }]}>
                          <Text
                            style={[styles.badgeText, { color: theme.colors.onPrimary }]}
                          >
                            {unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.previewRow}>
                    <Text
                      style={[styles.preview, { color: theme.colors.onSurfaceVariant }]}
                      numberOfLines={1}
                    >
                      {previewText}
                    </Text>
                    <TouchableOpacity
                      onPress={() => onToggleHidden(item.id, !item.hidden)}
                      style={[
                        styles.hideChip,
                        {
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surfaceVariant,
                        },
                      ]}
                    >
                      <Ionicons
                        name={hideIcon}
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.hideChipText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {hideLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Surface>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title={t("chat.empty.directTitle")}
            subtitle={t("chat.empty.directSubtitle")}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  requestsButton: {
    alignSelf: "stretch",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  main: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  preview: {
    fontSize: 13,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
  },
  previewRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hideChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hideChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
