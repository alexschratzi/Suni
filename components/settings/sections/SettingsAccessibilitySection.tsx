import React, { type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import { Button, Divider, List, Surface, Switch } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { TextScale } from "@/components/theme/AppThemeProvider";
import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type { ListItemTextStyles, SaveNotifications } from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  textSizeLabel: string;
  textMenu: boolean;
  setTextMenu: Dispatch<SetStateAction<boolean>>;
  setThemeMenu: Dispatch<SetStateAction<boolean>>;
  setLangMenu: Dispatch<SetStateAction<boolean>>;
  saveNotifications: SaveNotifications;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
  scale: number;
};

export function SettingsAccessibilitySection({
  listItemTextStyles,
  textSizeLabel,
  textMenu,
  setTextMenu,
  setThemeMenu,
  setLangMenu,
  saveNotifications,
  highContrast,
  setHighContrast,
  scale,
}: Props) {
  const { t } = useTranslation();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.accessibility")}
        </List.Subheader>

        <List.Item
          title={t("settings.accessibilitySection.fontSize")}
          description={textSizeLabel}
          {...listItemTextStyles}
          right={() => (
            <Button
              mode="outlined"
              onPress={() => {
                setTextMenu((v) => !v);
                setThemeMenu(false);
                setLangMenu(false);
              }}
              compact
              icon={textMenu ? "chevron-up" : "chevron-down"}
            >
              {t("settings.theme.select", "Auswählen")}
            </Button>
          )}
        />

        {textMenu && (
          <Surface style={settingsStyles.inlineMenu} mode="flat">
            {(["small", "medium", "large"] as TextScale[]).map((size, idx, arr) => (
              <View key={size}>
                <Button
                  mode="text"
                  onPress={() => {
                    saveNotifications({ textScale: size });
                    setTextMenu(false);
                  }}
                  contentStyle={settingsStyles.inlineBtn}
                >
                  {t(`settings.accessibilitySection.${size}`)}
                </Button>
                {idx < arr.length - 1 && <Divider />}
              </View>
            ))}
          </Surface>
        )}

        <Divider />

        <List.Item
          title={t("settings.accessibilitySection.contrast")}
          description={t("settings.accessibilitySection.contrastDesc")}
          {...listItemTextStyles}
          right={() => (
            <Switch value={highContrast} onValueChange={(v) => setHighContrast(v)} />
          )}
        />
        <Divider />
        <List.Item
          title={t("settings.accessibilitySection.reduceMotion")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.accessibilitySection.haptics")}
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
      </List.Section>
    </Surface>
  );
}
