import React from "react";
import { ActivityIndicator, Button, List, Surface } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  handleUniLogout: () => void;
  uniLogoutBusy: boolean;
};

export function SettingsUniversitySection({
  listItemTextStyles,
  handleUniLogout,
  uniLogoutBusy,
}: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.uni")}
        </List.Subheader>

        <List.Item
          title="Logout"
          description="Logout Uni Account"
          {...listItemTextStyles}
          onPress={handleUniLogout}
          right={() =>
            uniLogoutBusy ? (
              <ActivityIndicator />
            ) : (
              <Button mode="contained-tonal" onPress={handleUniLogout}>
                Logout
              </Button>
            )
          }
        />
      </List.Section>
    </Surface>
  );
}
