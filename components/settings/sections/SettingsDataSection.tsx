import React from "react";
import { Button, Divider, List, Surface, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  clearingLocal: boolean;
  deletingAccount: boolean;
  confirmClearLocal: () => void;
  confirmDeleteAccount: () => void;
};

export function SettingsDataSection({
  listItemTextStyles,
  clearingLocal,
  deletingAccount,
  confirmClearLocal,
  confirmDeleteAccount,
}: Props) {
  const { t } = useTranslation();
  const paperTheme = useTheme();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.data")}
        </List.Subheader>

        <List.Item
          title={t("settings.dataSection.clearLocal")}
          description={t("settings.dataSection.clearLocalDesc")}
          {...listItemTextStyles}
          right={() => (
            <Button
              mode="contained-tonal"
              onPress={confirmClearLocal}
              loading={clearingLocal}
              disabled={clearingLocal}
            >
              {t("settings.dataSection.clearLocalAction")}
            </Button>
          )}
        />
        <Divider />
        <List.Item
          title={t("settings.dataSection.deleteAccount")}
          description={t("settings.dataSection.deleteAccountDesc")}
          {...listItemTextStyles}
          right={() => (
            <Button
              mode="contained"
              buttonColor={paperTheme.colors.error}
              textColor={paperTheme.colors.onError}
              onPress={confirmDeleteAccount}
              loading={deletingAccount}
              disabled={deletingAccount}
            >
              {t("settings.dataSection.deleteAccountAction")}
            </Button>
          )}
        />
      </List.Section>
    </Surface>
  );
}
