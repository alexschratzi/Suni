// components/chat/RoomsList.tsx
import React from "react";
import { View } from "react-native";
import { FlatList } from "react-native";
import { Card, Avatar, Divider, Text, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import EmptyState from "./EmptyState";

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

  return (
    <FlatList
      data={rooms}
      keyExtractor={(it) => it.key}
      ItemSeparatorComponent={() => (
        <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      )}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      renderItem={({ item }) => (
        <Card
          mode="elevated"
          onPress={() => onSelect(item.key)}
          style={{
            marginBottom: 12,
            backgroundColor: theme.colors.elevation.level2,
          }}
        >
          <Card.Title
            title={item.title}
            subtitle={item.subtitle}
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => (
              <Avatar.Icon
                {...props}
                icon="chat"
                color={theme.colors.onPrimary}
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
            right={() => (
              <View style={{ paddingRight: 8, justifyContent: "center" }}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </View>
            )}
          />
        </Card>
      )}
      ListEmptyComponent={
        <EmptyState
          title="Keine Räume gefunden"
          subtitle="Passe deine Suche an."
        />
      }
    />
  );
}
