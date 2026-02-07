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

export function SettingsNewsSection({ listItemTextStyles, scale }: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.news")}
        </List.Subheader>

        <List.Item
          title={t("settings.newsSection.push")}
          description={t("settings.newsSection.pushDesc")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.newsSection.topics")}
          description={t("settings.newsSection.topicsDesc")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.newsSection.sources")}
          description={t("settings.newsSection.sourcesDesc")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
      </List.Section>
    </Surface>
  );
}
