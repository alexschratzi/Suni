import React, { type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import { Button, Divider, List, Surface, Switch, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { ThemeMode } from "@/components/theme/AppThemeProvider";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type {
  LanguageCode,
  ListItemTextStyles,
  SaveNotifications,
} from "@/components/settings/types";

type Props = {
  activeThemeLabel: string;
  themeMenu: boolean;
  setThemeMenu: Dispatch<SetStateAction<boolean>>;
  langMenu: boolean;
  setLangMenu: Dispatch<SetStateAction<boolean>>;
  language: LanguageCode;
  listItemTextStyles: ListItemTextStyles;
  notifGlobal: boolean;
  loadingPrefs: boolean;
  onThemeChange: (value: ThemeMode) => void;
  onLanguageChange: (value: LanguageCode) => void | Promise<void>;
  saveNotifications: SaveNotifications;
};

export function SettingsGeneralSection({
  activeThemeLabel,
  themeMenu,
  setThemeMenu,
  langMenu,
  setLangMenu,
  language,
  listItemTextStyles,
  notifGlobal,
  loadingPrefs,
  onThemeChange,
  onLanguageChange,
  saveNotifications,
}: Props) {
  const { t } = useTranslation();
  const paperTheme = useTheme();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Subheader style={settingsStyles.subheader}>
        {t("settings.sections.general")}
      </List.Subheader>

      <View style={settingsStyles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface }}>
            {t("settings.appearanceTitle")}
          </Text>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {t("settings.theme.activeLabel", { mode: activeThemeLabel })}
          </Text>
        </View>
        <Button
          mode="outlined"
          onPress={() => setThemeMenu((v) => !v)}
          compact
          icon="chevron-down"
        >
          Auswählen
        </Button>
      </View>

      {themeMenu && (
        <Surface style={settingsStyles.inlineMenu} mode="flat">
          <Button mode="text" onPress={() => onThemeChange("system")} contentStyle={settingsStyles.inlineBtn}>
            System
          </Button>
          <Divider />
          <Button mode="text" onPress={() => onThemeChange("light")} contentStyle={settingsStyles.inlineBtn}>
            Hell
          </Button>
          <Divider />
          <Button mode="text" onPress={() => onThemeChange("dark")} contentStyle={settingsStyles.inlineBtn}>
            Dunkel
          </Button>
        </Surface>
      )}

      <Divider style={{ marginVertical: 8 }} />

      <View style={settingsStyles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface }}>
            {t("settings.languageTitle")}
          </Text>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {language === "de"
              ? t("settings.language.german")
              : t("settings.language.english")}
          </Text>
        </View>
        <Button
          mode="outlined"
          onPress={() => setLangMenu((v) => !v)}
          compact
          icon="chevron-down"
        >
          Auswählen
        </Button>
      </View>

      {langMenu && (
        <Surface style={settingsStyles.inlineMenu} mode="flat">
          <Button
            mode="text"
            onPress={() => {
              setLangMenu(false);
              onLanguageChange("de");
            }}
            contentStyle={settingsStyles.inlineBtn}
          >
            Deutsch
          </Button>
          <Divider />
          <Button
            mode="text"
            onPress={() => {
              setLangMenu(false);
              onLanguageChange("en");
            }}
            contentStyle={settingsStyles.inlineBtn}
          >
            English
          </Button>
        </Surface>
      )}

      <Divider style={{ marginVertical: 8 }} />

      <List.Item
        title={t("settings.general.notifications")}
        description={t("settings.general.notificationsDesc", "Globale Push/In-App")}
        {...listItemTextStyles}
        right={() => (
          <Switch
            value={notifGlobal}
            onValueChange={(v) => saveNotifications({ global: v })}
            disabled={loadingPrefs}
          />
        )}
      />
    </Surface>
  );
}
