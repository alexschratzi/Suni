import React, { type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import { Divider, List, Surface, Switch, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import { SettingsTodoTag } from "@/components/settings/SettingsTodoTag";
import { settingsStyles } from "@/components/settings/settingsStyles";
import type {
  EventCategories,
  ListItemTextStyles,
  SaveNotifications,
} from "@/components/settings/types";

type Props = {
  listItemTextStyles: ListItemTextStyles;
  scale: number;
  eventSettingsOpen: boolean;
  setEventSettingsOpen: Dispatch<SetStateAction<boolean>>;
  eventsEnabled: boolean;
  eventCategories: EventCategories;
  loadingPrefs: boolean;
  saveNotifications: SaveNotifications;
};

export function SettingsCalendarSection({
  listItemTextStyles,
  scale,
  eventSettingsOpen,
  setEventSettingsOpen,
  eventsEnabled,
  eventCategories,
  loadingPrefs,
  saveNotifications,
}: Props) {
  const { t } = useTranslation();
  const paperTheme = useTheme();

  return (
    <Surface style={settingsStyles.card} mode="elevated">
      <List.Section>
        <List.Subheader style={settingsStyles.subheader}>
          {t("settings.sections.calendar")}
        </List.Subheader>

        <List.Item
          title={t("settings.calendar.defaultView")}
          description="Woche / Monat"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.calendar.weekStart")}
          description="Montag / Sonntag"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.calendar.reminders")}
          description="Vor Termin, Push"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.calendar.holidays")}
          description="Land auswählen"
          {...listItemTextStyles}
          right={() => <SettingsTodoTag scale={scale} />}
        />
        <Divider />
        <List.Item
          title={t("settings.events.enabled")}
          description={t("settings.events.enabledDesc")}
          {...listItemTextStyles}
          onPress={() => setEventSettingsOpen((v) => !v)}
          right={() => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  color: paperTheme.colors.onSurfaceVariant,
                  fontSize: Math.round(16 * scale),
                }}
              >
                {eventSettingsOpen ? "ƒ-¬" : "ƒ-ô"}
              </Text>
              <Switch
                value={eventsEnabled}
                onValueChange={(v) => saveNotifications({ eventsEnabled: v })}
                disabled={loadingPrefs}
              />
            </View>
          )}
        />

        {eventSettingsOpen && (
          <View style={{ paddingLeft: 12 }}>
            <Divider />
            <Text
              variant="bodySmall"
              style={{
                color: paperTheme.colors.onSurfaceVariant,
                marginLeft: 8,
                marginBottom: 4,
              }}
            >
              {t("settings.events.categoriesDesc")}
            </Text>

            <List.Item
              title={t("settings.events.uniParties")}
              description={t("settings.events.uniPartiesDesc")}
              {...listItemTextStyles}
              right={() => (
                <Switch
                  value={eventCategories.uniParties}
                  onValueChange={(v) =>
                    saveNotifications({ categories: { uniParties: v } })
                  }
                  disabled={!eventsEnabled || loadingPrefs}
                />
              )}
            />
            <Divider />
            <List.Item
              title={t("settings.events.uniEvents")}
              description={t("settings.events.uniEventsDesc")}
              {...listItemTextStyles}
              right={() => (
                <Switch
                  value={eventCategories.uniEvents}
                  onValueChange={(v) =>
                    saveNotifications({ categories: { uniEvents: v } })
                  }
                  disabled={!eventsEnabled || loadingPrefs}
                />
              )}
            />
            <Divider />
            <List.Item
              title={t("settings.events.cityEvents")}
              description={t("settings.events.cityEventsDesc")}
              {...listItemTextStyles}
              right={() => (
                <Switch
                  value={eventCategories.cityEvents}
                  onValueChange={(v) =>
                    saveNotifications({ categories: { cityEvents: v } })
                  }
                  disabled={!eventsEnabled || loadingPrefs}
                />
              )}
            />
          </View>
        )}
      </List.Section>
    </Surface>
  );
}
