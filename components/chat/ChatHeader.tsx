// components/chat/ChatHeader.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { SegmentedButtons, Searchbar, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

type TabKey = "rooms" | "direct";

type Props = {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  search: string;
  setSearch: (v: string) => void;
};

export default function ChatHeader({ tab, setTab, search, setSearch }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
        buttons={[
          { value: "rooms", label: t("chat.tabs.rooms"), icon: "chat" },
          { value: "direct", label: t("chat.tabs.direct"), icon: "account" },
        ]}
        style={styles.segment}
      />
      <Searchbar
        placeholder={
          tab === "rooms"
            ? t("chat.search.roomsPlaceholder")
            : t("chat.search.directPlaceholder")
        }
        value={search}
        onChangeText={setSearch}
        style={[styles.search, { backgroundColor: theme.colors.surfaceVariant }]}
        iconColor={theme.colors.onSurfaceVariant}
        inputStyle={{ color: theme.colors.onSurface }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 8 },
  segment: { marginBottom: 8 },
  search: { marginBottom: 6, borderRadius: 12 },
});
