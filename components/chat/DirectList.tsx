/**
 * DirectList.tsx
 * -----------------------------------------------
 * Liste aller Direktnachrichten (1:1 Chats) plus Shortcut zu Freunde/Anfragen.
 *
 * Props:
 *  - directs: Gefilterte DM-Liste
 *  - router: expo-router Instanz für Navigation
 */

import React from "react";
import { View, FlatList } from "react-native";
import { Button, Divider, List, Avatar, useTheme, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import EmptyState from "./EmptyState";
import { initials } from "../../utils/utils";

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
};

export default function DirectList({ directs, router, onToggleHidden }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Button
        mode="contained-tonal"
        compact
        icon="account-multiple"
        style={{ alignSelf: "flex-start", marginHorizontal: 12, marginVertical: 10 }}
        onPress={() => router.push("/(drawer)/friends")}
      >
        Freunde & Anfragen
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
                style={{ backgroundColor: theme.colors.primary }}
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
                  {item.hidden ? "Einblenden" : "Ausblenden"}
                </Button>
              </View>
            )}
            onPress={() => {
              router.push({
                pathname: "/(drawer)/reply",
                params: { dmId: item.id },
              });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState title="Keine Direktnachrichten" subtitle="Füge Freunde hinzu, um Chats zu starten." />
        }
      />
    </View>
  );
}
