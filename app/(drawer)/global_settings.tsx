// app/(drawer)/global_settings.tsx
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  useTheme,
  List,
  Divider,
  Surface,
  Button,
  Chip,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme, ThemeMode } from "../../components/theme/AppThemeProvider";

type LanguageCode = "de" | "en";
type SectionKey =
  | "general"
  | "calendar"
  | "chat"
  | "friends"
  | "uni"
  | "data"
  | "security"
  | "accessibility";

const SECTION_META: { key: SectionKey; label: string }[] = [
  { key: "general", label: "Allgemein" },
  { key: "calendar", label: "Kalender" },
  { key: "chat", label: "Chat" },
  { key: "friends", label: "Freunde" },
  { key: "uni", label: "Universität" },
  { key: "data", label: "Daten & Cache" },
  { key: "security", label: "Sicherheit" },
  { key: "accessibility", label: "Barrierefreiheit" },
];

const TodoTag = ({ label = "TODO" }) => (
  <Text style={styles.todo}>{label}</Text>
);

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const { mode, effectiveMode, setMode } = useAppTheme();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams();

  const [language, setLanguage] = useState<LanguageCode>(() =>
    i18n.language?.startsWith("de") ? "de" : "en"
  );
  const [themeMenu, setThemeMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [positions, setPositions] = useState<Record<SectionKey, number>>(
    {} as Record<SectionKey, number>
  );
  const [pendingScroll, setPendingScroll] = useState<SectionKey | null>(null);

  const targetSection =
    typeof params.section === "string"
      ? (params.section as SectionKey)
      : undefined;

  useEffect(() => {
    if (targetSection) setPendingScroll(targetSection);
  }, [targetSection]);

  const onThemeChange = (value: ThemeMode) => {
    setThemeMenu(false);
    setLangMenu(false);
    setMode(value);
  };

  const handleLanguageChange = async (value: LanguageCode) => {
    if (value === language) return;
    setLanguage(value);
    await i18n.changeLanguage(value);
    try {
      await AsyncStorage.setItem("appLanguage", value);
    } catch (e) {
      console.warn("Failed to save language to AsyncStorage", e);
    }
  };

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
    mode === "system"
      ? t("settings.theme.system.title")
      : effectiveMode === "dark"
      ? t("settings.theme.activeDark")
      : t("settings.theme.activeLight");

  const scrollToSection = (key: SectionKey) => {
    const y = positions[key];
    if (y == null) {
      setPendingScroll(key);
      return;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
    setPendingScroll(null);
  };

  useEffect(() => {
    if (!pendingScroll) return;
    const timeout = setTimeout(() => scrollToSection(pendingScroll), 50);
    return () => clearTimeout(timeout);
  }, [pendingScroll, positions]);

  const handleSectionLayout = (key: SectionKey) => (e: any) => {
    const y = e?.nativeEvent?.layout?.y;
    if (y != null) {
      setPositions((p) => ({ ...p, [key]: y }));
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: paperTheme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Surface style={styles.card} mode="elevated">
        <Text variant="titleLarge" style={{ color: paperTheme.colors.onSurface }}>
          Einstellungen
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          Alles auf einer Seite. Tippe auf einen Abschnitt oder scrolle.
        </Text>
        <View style={styles.chipRow}>
          {SECTION_META.map((s) => (
            <Chip
              key={s.key}
              onPress={() => scrollToSection(s.key)}
              compact
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              {s.label}
            </Chip>
          ))}
        </View>
      </Surface>

      {/* Allgemein */}
      <View onLayout={handleSectionLayout("general")}>
        <Surface style={styles.card} mode="elevated">
        <List.Subheader style={styles.subheader}>Allgemein</List.Subheader>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface }}>
              Theme
            </Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              Aktiv: {activeThemeLabel}
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
          <Surface style={styles.inlineMenu} mode="flat">
            <Button
              mode="text"
              onPress={() => onThemeChange("system")}
              contentStyle={styles.inlineBtn}
            >
              System
            </Button>
            <Divider />
            <Button
              mode="text"
              onPress={() => onThemeChange("light")}
              contentStyle={styles.inlineBtn}
            >
              Hell
            </Button>
            <Divider />
            <Button
              mode="text"
              onPress={() => onThemeChange("dark")}
              contentStyle={styles.inlineBtn}
            >
              Dunkel
            </Button>
          </Surface>
        )}

        <Divider style={{ marginVertical: 8 }} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface }}>
              Sprache
            </Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              {language === "de" ? "Deutsch" : "English"}
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
          <Surface style={styles.inlineMenu} mode="flat">
            <Button
              mode="text"
              onPress={() => {
                setLangMenu(false);
                handleLanguageChange("de");
              }}
              contentStyle={styles.inlineBtn}
            >
              Deutsch
            </Button>
            <Divider />
            <Button
              mode="text"
              onPress={() => {
                setLangMenu(false);
                handleLanguageChange("en");
              }}
              contentStyle={styles.inlineBtn}
            >
              English
            </Button>
          </Surface>
        )}

        <Divider style={{ marginVertical: 8 }} />

        <List.Item
          title="Mitteilungen"
          description="Globale Push/In-App"
          right={() => <TodoTag />}
        />
        </Surface>
      </View>

      {/* Kalender */}
      <View onLayout={handleSectionLayout("calendar")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Kalender</List.Subheader>
          <List.Item
            title="Standard-Ansicht"
            description="Woche / Monat"
            right={() => <TodoTag />}
          />
          <Divider />
          <List.Item title="Wochenstart" description="Montag / Sonntag" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Erinnerungen" description="Vor Termin, Push" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Feiertage" description="Land auswählen" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Chat */}
      <View onLayout={handleSectionLayout("chat")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Chat</List.Subheader>
          <List.Item title="Lesebestätigungen" description="An/Aus" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Benachrichtigungen" description="Ton, Vibration" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Medien-Auto-Download" description="WLAN/Mobil/Aus" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Chat-Theme" description="Farben/Blasen" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Freunde / DM */}
      <View onLayout={handleSectionLayout("friends")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Freunde & Direktnachrichten</List.Subheader>
          <List.Item
            title="Wer darf Anfragen schicken?"
            description="Alle / Nur bekannte / Niemand"
            right={() => <TodoTag />}
          />
          <Divider />
          <List.Item
            title="Automatisch annehmen"
            description="Nur bekannte Kontakte"
            right={() => <TodoTag />}
          />
          <Divider />
          <List.Item title="Blockierte Nutzer" description="Verwalten" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Universität */}
      <View onLayout={handleSectionLayout("uni")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Universität</List.Subheader>
          <List.Item title="Studiengang" description="Auswahl" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Fakultät" description="Auswahl" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Uni-News Push" description="An/Aus" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Daten & Cache */}
      <View onLayout={handleSectionLayout("data")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Daten & Cache</List.Subheader>
          <List.Item title="Mediencache löschen" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Offline-Daten zurücksetzen" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Export / Backup" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Sicherheit */}
      <View onLayout={handleSectionLayout("security")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Sicherheit</List.Subheader>
          <List.Item title="App-PIN / Biometrie" description="Zum Öffnen" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Geräteverwaltung" description="Aktive Sitzungen" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="2-Faktor-Auth" description="Optional" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>

      {/* Barrierefreiheit */}
      <View onLayout={handleSectionLayout("accessibility")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>Barrierefreiheit</List.Subheader>
          <List.Item title="Schriftgröße" description="App-intern" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Kontrastmodus" description="Hochkontrast" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Animationen reduzieren" right={() => <TodoTag />} />
          <Divider />
          <List.Item title="Haptisches Feedback" right={() => <TodoTag />} />
        </List.Section>
        </Surface>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  subheader: {
    marginBottom: 4,
  },
  card: {
    borderRadius: 14,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  inlineMenu: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "transparent",
    paddingHorizontal: 16,
  },
  inlineBtn: {
    justifyContent: "flex-start",
  },
  todo: {
    color: "#d97706",
    fontWeight: "600",
    fontSize: 12,
  },
});
