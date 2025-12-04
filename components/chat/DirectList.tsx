/**
 * DirectList.tsx
 * -----------------------------------------------
 * Liste aller Direktnachrichten (1:1 Chats).
 *
 * Enthält:
 *  - "Freund hinzufügen"-Button
 *  - "Freundschaftsanfragen anzeigen"-Button
 *  - Liste der Direct-Messages (dm_threads)
 *
 * Props:
 *  - directs: Gefilterte DM-Liste
 *  - router: expo-router Instanz für Navigation
 *
 * Wird verwendet in:
 *  - ChatScreen.tsx
 *
 * Änderungen / Erweiterungen:
 *  - Navigation zu Threads ändern → HIER (router.push)
 *  - Anzeige/Design der DMs anpassen
 *  - Freundeslogik erweitern → Buttons hier anpassen
 *  - Initialen-Logik wird aus utils.ts importiert
 */

import React from "react";
import { View } from "react-native";
import { FlatList } from "react-native";
import {
  Button,
  Divider,
  List,
  Avatar,
  useTheme,
  Text,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import EmptyState from "./EmptyState";
import { initials } from "../../utils/utils";

export type Direct = {
  id: string;
  displayName: string;
  last?: string;
};

type Props = {
  directs: Direct[];
  router: Router;
};

export default function DirectList({ directs, router }: Props) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <Button
        mode="contained"
        icon="account-plus"
        style={{ marginHorizontal: 12, marginBottom: 12, marginTop: 8 }}
        onPress={() => router.push("../(drawer)/(tabs)/addFriends")}
      >
        Freund hinzufügen
      </Button>

      <Button
        mode="text"
        onPress={() => router.push("../(drawer)/friendRequests")}
        style={{ marginHorizontal: 12, marginBottom: 12 }}
      >
        Freundschaftsanfragen anzeigen
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
              <View style={{ justifyContent: "center" }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
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
          <EmptyState
            title="Keine Direktnachrichten"
            subtitle="Füge Freunde hinzu, um Chats zu starten."
          />
        }
      />
    </View>
  );
}
