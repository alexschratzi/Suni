/**
 * DirectList.tsx
 * Liste aller Direktnachrichten (1:1 Chats) plus Shortcut zu Freunde/Anfragen.
 */

import React from "react";
import { View, FlatList } from "react-native";
import { Button, Divider, List, Avatar, useTheme, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import EmptyState from "./EmptyState";
import { initials } from "../../utils/utils";
import { useTranslation } from "react-i18next";

export type Direct = {
  id: string;
  displayName: string;
  last?: string;
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
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1 }}>
      <Button
        mode="contained-tonal"
        compact
        icon="account-multiple"
        style={{ alignSelf: "flex-start", marginHorizontal: 12, marginVertical: 10 }}
        onPress={() => router.push("/(drawer)/friends")}
      >
        {t("chat.direct.showRequests")}
      </Button>

      <FlatList
        data={directs}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 24,
        }}
        ItemSeparatorComponent={() => (
          <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
        )}
        renderItem={({ item }) => (
          <List.Item
            title={item.displayName}
            description={item.last ?? ""}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => (
              <Avatar.Text
                {...props}
                size={40}
                label={initials(item.displayName)}
                color={theme.colors.onPrimary}
                style={{ backgroundColor: accentColor }}
              />
            )}
            right={() => (
              <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Button
                  compact
                  mode="text"
                  textColor={item.hidden ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  style={{ marginTop: 2 }}
                  onPress={() => onToggleHidden(item.id, !item.hidden)}
                >
                  {item.hidden ? t("chat.direct.unhide") : t("chat.direct.hide")}
                </Button>
              </View>
            )}
            onPress={() => {
              router.push({
                pathname: "/(app)/reply",
                params: { dmId: item.id },
              });
            }}
          />
        )}
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
