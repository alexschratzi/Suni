import React from "react";
import { Divider, List, Surface } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  scale: number;
  onPressPrivacy?: () => void;
};

export function SettingsInfoSection({
  listItemTextStyles,
  scale,
  onPressPrivacy,
}: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.info")}
        </List.Subheader>

        <List.Item
          title={t("settings.infoSection.faq")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.infoSection.privacy")}
          {...listItemTextStyles}
          onPress={onPressPrivacy}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <Divider />
        <List.Item
          title={t("settings.infoSection.terms")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.infoSection.imprint")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.infoSection.contact")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
      </List.Section>
    </Surface>
  );
}
