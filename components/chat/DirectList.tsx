/**
 * DirectList.tsx
 * List of direct messages with quick access to friends/requests.
 */

import React from "react";
import { View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import {
  Button,
  Avatar,
  useTheme,
  Text,
  Surface,
  IconButton,
} from "react-native-paper";
import { Router } from "expo-router";
import EmptyState from "./EmptyState";
import { initials } from "../../utils/utils";
import { useTranslation } from "react-i18next";

export type Direct = {
  id: string;
  displayName: string;
  last?: string;
  lastTimestamp?: string | null;
  hidden?: boolean;
};

type Props = {
  directs: Direct[];
  router: Router;
  onToggleHidden: (id: string, makeHidden: boolean) => void;
  accentColor: string;
};

export default function DirectList({ directs, router, onToggleHidden, accentColor }: Props) {
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
        style={{ alignSelf: "flex-start", marginHorizontal: 12, marginVertical: 10 }}
        onPress={() => router.push("/(app)/(stack)/friends")}
      >
        {t("chat.direct.showRequests")}
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
                    params: { dmId: item.id },
                  });
                }}
                activeOpacity={0.8}
                style={styles.row}
              >
                <Avatar.Text
                  size={44}
                  label={initials(item.displayName)}
                  color={theme.colors.onPrimary}
                  style={{ backgroundColor: accentColor }}
                />
                <View style={styles.main}>
                  <Text style={[styles.name, { color: theme.colors.onSurface }]}>
                    {item.displayName}
                  </Text>
                  <Text
                    style={[styles.preview, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {previewText}
                  </Text>
                </View>
                <View style={styles.meta}>
                  {!!timeLabel && (
                    <Text style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
                      {timeLabel}
                    </Text>
                  )}
                  <IconButton
                    icon={hideIcon}
                    size={18}
                    onPress={() => onToggleHidden(item.id, !item.hidden)}
                    iconColor={theme.colors.onSurfaceVariant}
                    style={styles.hideButton}
                  />
                  <Text style={[styles.hideLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {hideLabel}
                  </Text>
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
    borderRadius: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  main: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  preview: {
    fontSize: 13,
  },
  meta: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  time: {
    fontSize: 12,
    marginBottom: 2,
  },
  hideButton: {
    margin: 0,
  },
  hideLabel: {
    fontSize: 10,
  },
});
