import React from "react";
import { Divider, List, Surface } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  scale: number;
};

export function SettingsSecuritySection({ listItemTextStyles, scale }: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.security")}
        </List.Subheader>

        <List.Item
          title={t("settings.securitySection.pin")}
          description="Zum Öffnen"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.securitySection.devices")}
          description="Aktive Sitzungen"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.securitySection.twofa")}
          description="Optional"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
      </List.Section>
    </Surface>
  );
}
