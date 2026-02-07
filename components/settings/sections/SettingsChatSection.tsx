import React from "react";
import { View } from "react-native";
import { Button, Divider, List, Surface, Switch } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles, SaveNotifications } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  scale: number;
  notifChat: boolean;
  notifMention: boolean;
  notifDirect: boolean;
  notifRooms: boolean;
  chatColor: string | null;
  loadingPrefs: boolean;
  saveNotifications: SaveNotifications;
};

export function SettingsChatSection({
  listItemTextStyles,
  scale,
  notifChat,
  notifMention,
  notifDirect,
  notifRooms,
  chatColor,
  loadingPrefs,
  saveNotifications,
}: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.chat")}
        </List.Subheader>

        <List.Item
          title={t("settings.chatSection.readReceipts")}
          description="An/Aus"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.chatSection.notifications")}
          description={t("settings.chatSection.notificationsDesc", "Push / Sound / Vibration")}
          {...listItemTextStyles}
          right={() => (
            <Switch
              value={notifChat}
              onValueChange={(v) => saveNotifications({ chat: v })}
              disabled={loadingPrefs}
            />
          )}
        />
        <Divider />
        <List.Item
          title={t("settings.chatSection.notifyMention")}
          description={t("settings.chatSection.notifyMentionDesc")}
          {...listItemTextStyles}
          right={() => (
            <Switch
              value={notifMention}
              onValueChange={(v) => saveNotifications({ mention: v })}
              disabled={loadingPrefs}
            />
          )}
        />
        <Divider />
        <List.Item
          title={t("settings.chatSection.notifyDirect")}
          description={t("settings.chatSection.notifyDirectDesc")}
          {...listItemTextStyles}
          right={() => (
            <Switch
              value={notifDirect}
              onValueChange={(v) => saveNotifications({ direct: v })}
              disabled={loadingPrefs}
            />
          )}
        />
        <List.Item
          title={t("settings.chatSection.notifyRooms")}
          description={t("settings.chatSection.notifyRoomsDesc")}
          {...listItemTextStyles}
          right={() => (
            <Switch
              value={notifRooms}
              onValueChange={(v) => saveNotifications({ rooms: v })}
              disabled={loadingPrefs}
            />
          )}
        />
        <Divider />
        <List.Item
          title={t("settings.chatSection.mediaDownload")}
          description="WLAN/Mobil/Aus"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.chatSection.theme")}
          description="Farben/Blasen"
          {...listItemTextStyles}
          right={() => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {["#6750A4", "#0EA5E9", "#22C55E", "#EAB308", "#EF4444"].map((c) => (
                <Button
                  key={c}
                  mode={chatColor === c ? "contained" : "outlined"}
                  compact
                  buttonColor={c}
                  textColor={chatColor === c ? "white" : c}
                  onPress={() => saveNotifications({ color: c })}
                  style={{ marginHorizontal: 2 }}
                >
                  {chatColor === c ? "ƒ?½" : ""}
                </Button>
              ))}
            </View>
          )}
        />
      </List.Section>
    </Surface>
  );
}
