// app/(drawer)/settings.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  RadioButton,
  useTheme,
  List,
  Divider,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAppTheme, ThemeMode } from "../../components/theme/AppThemeProvider";
import { auth, db } from "../../firebase";
import { doc, setDoc } from "firebase/firestore";

type LanguageCode = "de" | "en";

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const { mode, effectiveMode, setMode } = useAppTheme();
  const { t, i18n } = useTranslation();

  const [language, setLanguage] = useState<LanguageCode>(() =>
    i18n.language?.startsWith("de") ? "de" : "en"
  );

  const onThemeChange = (value: ThemeMode) => setMode(value);

  const handleLanguageChange = async (value: LanguageCode) => {
    if (value === language) return;

    setLanguage(value);

    // i18n wechseln
    await i18n.changeLanguage(value);

    // lokal speichern
    try {
      await AsyncStorage.setItem("appLanguage", value);
    } catch (e) {
      console.warn("Failed to save language to AsyncStorage", e);
    }

    // im User-Dokument speichern (geräteübergreifend)
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { lang: value },
          { merge: true }
        );
      } catch (e) {
        console.warn("Failed to update language in Firestore", e);
      }
    }
  };

  // falls Sprache irgendwo anders geändert wird, UI nachziehen
  useEffect(() => {
    const handler = (lng: string) => {
      setLanguage(lng.startsWith("de") ? "de" : "en");
    };
    i18n.on("languageChanged", handler);
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, [i18n]);

  const activeThemeLabel =
    effectiveMode === "dark"
      ? t("settings.theme.activeDark")
      : t("settings.theme.activeLight");

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: paperTheme.colors.surface },
      ]}
    >
      {/* Erscheinungsbild / Theme */}
      <Text
        variant="titleLarge"
        style={[styles.title, { color: paperTheme.colors.onSurface }]}
      >
        {t("settings.appearanceTitle")}
      </Text>

      <View
        style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}
      >
        <RadioButton.Group
          onValueChange={(v) => onThemeChange(v as ThemeMode)}
          value={mode}
        >
          <List.Item
            title={t("settings.theme.system.title")}
            description={t("settings.theme.system.description")}
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <RadioButton value="system" />}
            onPress={() => onThemeChange("system")}
          />
          <Divider />
          <List.Item
            title={t("settings.theme.light.title")}
            description={t("settings.theme.light.description")}
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => (
              <List.Icon {...props} icon="white-balance-sunny" />
            )}
            right={() => <RadioButton value="light" />}
            onPress={() => onThemeChange("light")}
          />
          <Divider />
          <List.Item
            title={t("settings.theme.dark.title")}
            description={t("settings.theme.dark.description")}
            titleStyle={{ color: paperTheme.colors.onSurface }}
            descriptionStyle={{ color: paperTheme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="weather-night" />}
            right={() => <RadioButton value="dark" />}
            onPress={() => onThemeChange("dark")}
          />
        </RadioButton.Group>
      </View>

      <Text
        variant="bodyMedium"
        style={{
          marginTop: 16,
          color: paperTheme.colors.onSurfaceVariant,
        }}
      >
        {t("settings.theme.activeLabel", { mode: activeThemeLabel })}
        {mode === "system" ? t("settings.theme.followSystem") : ""}
      </Text>

      {/* Sprache */}
      <Text
        variant="titleLarge"
        style={[
          styles.title,
          { marginTop: 32, color: paperTheme.colors.onSurface },
        ]}
      >
        {t("settings.languageTitle")}
      </Text>

      <View
        style={[styles.card, { backgroundColor: paperTheme.colors.surface }]}
      >
        <RadioButton.Group
          onValueChange={(v) => handleLanguageChange(v as LanguageCode)}
          value={language}
        >
          <List.Item
            title={t("settings.language.german")}
            titleStyle={{ color: paperTheme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="flag-outline" />}
            right={() => <RadioButton value="de" />}
            onPress={() => handleLanguageChange("de")}
          />
          <Divider />
          <List.Item
            title={t("settings.language.english")}
            titleStyle={{ color: paperTheme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="flag" />}
            right={() => <RadioButton value="en" />}
            onPress={() => handleLanguageChange("en")}
          />
        </RadioButton.Group>
      </View>

      <Text
        variant="bodyMedium"
        style={{
          marginTop: 16,
          color: paperTheme.colors.onSurfaceVariant,
        }}
      >
        {t("settings.language.info")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    minHeight: "100%",
    gap: 12,
  },
  title: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
});
