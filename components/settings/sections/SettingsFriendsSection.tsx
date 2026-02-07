import React, { type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  List,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "react-i18next";

import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type { HiddenThread, ListItemTextStyles } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  scale: number;
  blockedCount: number;
  blockedExpanded: boolean;
  setBlockedExpanded: Dispatch<SetStateAction<boolean>>;
  blockedLoading: boolean;
  blockedUsers: string[];
  blockedDisplayName: (uid: string) => string;
  unblockUser: (uid: string) => void;
  hiddenThreads: HiddenThread[];
  hiddenExpanded: boolean;
  setHiddenExpanded: Dispatch<SetStateAction<boolean>>;
  hiddenLoading: boolean;
  hiddenDisplayName: (uid: string) => string;
  unhideThread: (threadId: string) => void;
};

export function SettingsFriendsSection({
  listItemTextStyles,
  scale,
  blockedCount,
  blockedExpanded,
  setBlockedExpanded,
  blockedLoading,
  blockedUsers,
  blockedDisplayName,
  unblockUser,
  hiddenThreads,
  hiddenExpanded,
  setHiddenExpanded,
  hiddenLoading,
  hiddenDisplayName,
  unhideThread,
}: Props) {
  const { t } = useTranslation();
  const paperTheme = useTheme();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.friends")}
        </List.Subheader>

        <List.Item
          title={t("settings.friendsSection.whoCanRequest")}
          description="Alle / Nur bekannte / Niemand"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.friendsSection.autoAccept")}
          description="Nur bekannte Kontakte"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Accordion
          title={`${t("settings.friendsSection.blocked")} (${blockedCount})`}
          description={t("settings.friendsSection.blockedDesc")}
          expanded={blockedExpanded}
          onPress={() => setBlockedExpanded((v) => !v)}
        >
          {blockedLoading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : blockedUsers.length === 0 ? (
            <Text style={{ paddingHorizontal: 16, color: paperTheme.colors.onSurfaceVariant }}>
              {t("settings.friendsSection.blockedEmpty")}
            </Text>
          ) : (
            blockedUsers.map((uid, idx) => (
              <View key={uid}>
                <List.Item
                  title={blockedDisplayName(uid)}
                  {...listItemTextStyles}
                  left={(props) => <List.Icon {...props} icon="account-cancel-outline" />}
                  right={() => (
                    <Button compact onPress={() => unblockUser(uid)}>
                      {t("settings.friendsSection.blockedUnblock")}
                    </Button>
                  )}
                />
                {idx < blockedUsers.length - 1 && (
                  <Divider style={{ marginLeft: 56 }} />
                )}
              </View>
            ))
          )}
        </List.Accordion>
        <Divider />
        <List.Accordion
          title={`${t("settings.friendsSection.hiddenTitle")} (${hiddenThreads.length})`}
          description={t("settings.friendsSection.hiddenDesc")}
          expanded={hiddenExpanded}
          onPress={() => setHiddenExpanded((v) => !v)}
        >
          {hiddenLoading ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : hiddenThreads.length === 0 ? (
            <Text style={{ paddingHorizontal: 16, color: paperTheme.colors.onSurfaceVariant }}>
              {t("settings.friendsSection.hiddenEmpty")}
            </Text>
          ) : (
            hiddenThreads.map((thread, idx) => (
              <View key={thread.id}>
                <List.Item
                  title={hiddenDisplayName(thread.otherUid)}
                  description={thread.last || t("settings.friendsSection.hiddenNoMessage")}
                  {...listItemTextStyles}
                  left={(props) => <List.Icon {...props} icon="account" />}
                  right={() => (
                    <Button compact onPress={() => unhideThread(thread.id)}>
                      {t("settings.friendsSection.hiddenUnhide")}
                    </Button>
                  )}
                />
                {idx < hiddenThreads.length - 1 && (
                  <Divider style={{ marginLeft: 56 }} />
                )}
              </View>
            ))
          )}
        </List.Accordion>
      </List.Section>
    </Surface>
  );
}
