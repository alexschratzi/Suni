// app/(app)/global_settings.tsx
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  useTheme,
  List,
  Divider,
  Surface,
  Switch,
  Button,
  Chip,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme, ThemeMode, TextScale } from "../../components/theme/AppThemeProvider";
import { auth, db } from "../../firebase";
import firestore from "@react-native-firebase/firestore";

type LanguageCode = "de" | "en";
type SectionKey =
  | "general"
  | "calendar"
  | "chat"
  | "friends"
  | "uni"
  | "data"
  | "security"
  | "accessibility"
  | "info";

const TodoTag = ({ label = "TODO", scale = 1 }: { label?: string; scale?: number }) => (
  <Text style={[styles.todo, { fontSize: Math.round(12 * scale) }]}>{label}</Text>
);

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const { mode, effectiveMode, setMode, highContrast, setHighContrast, textScale, setTextScale } =
    useAppTheme();
  const { t, i18n } = useTranslation();
  const scale = textScale === "small" ? 0.85 : textScale === "large" ? 1.25 : 1;
  const textSizeLabel = t(`settings.accessibilitySection.${textScale}`);
  const listItemTextStyles = React.useMemo(
    () => ({
      titleStyle: { fontSize: Math.round(16 * scale) },
      descriptionStyle: { fontSize: Math.round(14 * scale) },
    }),
    [scale]
  );
  const SECTION_META: { key: SectionKey; label: string }[] = [
    { key: "general", label: t("settings.sections.general") },
    { key: "calendar", label: t("settings.sections.calendar") },
    { key: "chat", label: t("settings.sections.chat") },
    { key: "friends", label: t("settings.sections.friends") },
    { key: "uni", label: t("settings.sections.uni") },
    { key: "data", label: t("settings.sections.data") },
    { key: "security", label: t("settings.sections.security") },
    { key: "accessibility", label: t("settings.sections.accessibility") },
    { key: "info", label: t("settings.sections.info") },
  ];
  const params = useLocalSearchParams();

  const [language, setLanguage] = useState<LanguageCode>(() =>
    i18n.language?.startsWith("de") ? "de" : "en"
  );
  const [themeMenu, setThemeMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const [textMenu, setTextMenu] = useState(false);
  const [notifGlobal, setNotifGlobal] = useState(true);
  const [notifChat, setNotifChat] = useState(true);
  const [notifMention, setNotifMention] = useState(true);
  const [notifDirect, setNotifDirect] = useState(true);
  const [notifRooms, setNotifRooms] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [chatColor, setChatColor] = useState<string | null>(null);
  const [eventsEnabled, setEventsEnabled] = useState(true);
  const [eventSettingsOpen, setEventSettingsOpen] = useState(false);
  const [eventCategories, setEventCategories] = useState<{
    uniParties: boolean;
    uniEvents: boolean;
    cityEvents: boolean;
  }>({ uniParties: true, uniEvents: true, cityEvents: true });

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

  // Preferences laden
  useEffect(() => {
    const loadPrefs = async () => {
      if (!auth.currentUser) return;
      setLoadingPrefs(true);
      try {
        const snap = await db.collection("users").doc(auth.currentUser.uid).get();
        const data = snap.data() || {};
        const settings = (data.settings as any) || {};
        const notif = settings.notifications || {};
        if (typeof notif.global === "boolean") setNotifGlobal(notif.global);
        if (typeof notif.chat === "boolean") setNotifChat(notif.chat);
        if (typeof notif.mention === "boolean") setNotifMention(notif.mention);
        if (typeof notif.direct === "boolean") setNotifDirect(notif.direct);
        if (typeof notif.rooms === "boolean") setNotifRooms(notif.rooms);
        if (typeof settings.chatThemeColor === "string") setChatColor(settings.chatThemeColor);
        const events = settings.eventPrefs || {};
        if (typeof events.enabled === "boolean") setEventsEnabled(events.enabled);
        const cats = events.categories || {};
        setEventCategories({
          uniParties: typeof cats.uniParties === "boolean" ? cats.uniParties : true,
          uniEvents: typeof cats.uniEvents === "boolean" ? cats.uniEvents : true,
          cityEvents: typeof cats.cityEvents === "boolean" ? cats.cityEvents : true,
        });
        if (settings.textScale === "small" || settings.textScale === "large") {
          setTextScale(settings.textScale);
        } else {
          setTextScale("medium");
        }
      } finally {
        setLoadingPrefs(false);
      }
    };
    loadPrefs();
  }, []);

  const saveNotifications = async (next: {
    global?: boolean;
    chat?: boolean;
    mention?: boolean;
    direct?: boolean;
    rooms?: boolean;
    color?: string | null;
    eventsEnabled?: boolean;
    categories?: {
      uniParties?: boolean;
      uniEvents?: boolean;
      cityEvents?: boolean;
    };
    textScale?: TextScale;
  }) => {
    if (!auth.currentUser) return;
    const newGlobal = next.global ?? notifGlobal;
    const newChat = next.chat ?? notifChat;
    const newMention = next.mention ?? notifMention;
    const newDirect = next.direct ?? notifDirect;
    const newRooms = next.rooms ?? notifRooms;
    const newColor = next.color ?? chatColor;
    const newEventsEnabled = next.eventsEnabled ?? eventsEnabled;
    const newCats = {
      uniParties: next.categories?.uniParties ?? eventCategories.uniParties,
      uniEvents: next.categories?.uniEvents ?? eventCategories.uniEvents,
      cityEvents: next.categories?.cityEvents ?? eventCategories.cityEvents,
    };
    const newTextScale = next.textScale ?? textScale;
    setNotifGlobal(newGlobal);
    setNotifChat(newChat);
    setNotifMention(newMention);
    setNotifDirect(newDirect);
    setNotifRooms(newRooms);
    setChatColor(newColor);
    setEventsEnabled(newEventsEnabled);
    setEventCategories(newCats);
    setTextScale(newTextScale);
    try {
      await db
        .collection("users")
        .doc(auth.currentUser.uid)
        .set(
        {
          settings: {
            notifications: {
              global: newGlobal,
              chat: newChat,
              mention: newMention,
              direct: newDirect,
              rooms: newRooms,
            },
            chatThemeColor: newColor,
            eventPrefs: {
              enabled: newEventsEnabled,
              categories: newCats,
            },
            textScale: newTextScale,
          },
        },
        { merge: true }
        );
    } catch (err) {
      console.error("Failed to save notification settings", err);
    }
  };

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
          {t("settings.title", "Einstellungen")}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {t("settings.subtitle", "Alles auf einer Seite. Tippe auf einen Abschnitt oder scrolle.")}
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
        <List.Subheader style={styles.subheader}>{t("settings.sections.general")}</List.Subheader>

        <View style={styles.row}>
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
              {t("settings.languageTitle")}
            </Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
              {language === "de" ? t("settings.language.german") : t("settings.language.english")}
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
      </View>

      {/* Kalender + Events */}
      <View onLayout={handleSectionLayout("calendar")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.calendar")}</List.Subheader>
          <List.Item
            title={t("settings.calendar.defaultView")}
            description="Woche / Monat"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.calendar.weekStart")}
            description="Montag / Sonntag"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.calendar.reminders")}
            description="Vor Termin, Push"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.calendar.holidays")}
            description="Land auswählen"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
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
                  style={{ color: paperTheme.colors.onSurfaceVariant, fontSize: Math.round(16 * scale) }}
                >
                  {eventSettingsOpen ? "▼" : "▶"}
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
                style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8, marginBottom: 4 }}
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
                    onValueChange={(v) => saveNotifications({ categories: { uniParties: v } })}
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
                    onValueChange={(v) => saveNotifications({ categories: { uniEvents: v } })}
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
                    onValueChange={(v) => saveNotifications({ categories: { cityEvents: v } })}
                    disabled={!eventsEnabled || loadingPrefs}
                  />
                )}
              />
            </View>
          )}
        </List.Section>
        </Surface>
      </View>

      {/* Chat */}
      <View onLayout={handleSectionLayout("chat")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.chat")}</List.Subheader>
          <List.Item
            title={t("settings.chatSection.readReceipts")}
            description="An/Aus"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.notifications")}
            description={t("settings.chatSection.notificationsDesc", "Push / Sound / Vibration")}
            {...listItemTextStyles}
            right={() => (
              <Switch
                value={notifChat}
                onValueChange={(v) => saveNotifications({ chat: v })}
                disabled={loadingPrefs}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.notifyMention")}
            description={t("settings.chatSection.notifyMentionDesc")}
            {...listItemTextStyles}
            right={() => (
              <Switch
                value={notifMention}
                onValueChange={(v) => saveNotifications({ mention: v })}
                disabled={loadingPrefs}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.notifyDirect")}
            description={t("settings.chatSection.notifyDirectDesc")}
            {...listItemTextStyles}
            right={() => (
              <Switch
                value={notifDirect}
                onValueChange={(v) => saveNotifications({ direct: v })}
                disabled={loadingPrefs}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.notifyRooms")}
            description={t("settings.chatSection.notifyRoomsDesc")}
            {...listItemTextStyles}
            right={() => (
              <Switch
                value={notifRooms}
                onValueChange={(v) => saveNotifications({ rooms: v })}
                disabled={loadingPrefs}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.mediaDownload")}
            description="WLAN/Mobil/Aus"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.chatSection.theme")}
            description="Farben/Blasen"
            {...listItemTextStyles}
            right={() => (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {["#6750A4", "#0EA5E9", "#22C55E", "#EAB308", "#EF4444"].map((c) => (
                  <Button
                    key={c}
                    mode={chatColor === c ? "contained" : "outlined"}
                    compact
                    buttonColor={c}
                    textColor={chatColor === c ? "white" : c}
                    onPress={() => saveNotifications({ color: c })}
                    style={{ marginHorizontal: 2 }}
                  >
                    {chatColor === c ? "•" : ""}
                  </Button>
                ))}
              </View>
            )}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Freunde / DM */}
      <View onLayout={handleSectionLayout("friends")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.friends")}</List.Subheader>
          <List.Item
            title={t("settings.friendsSection.whoCanRequest")}
            description="Alle / Nur bekannte / Niemand"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.friendsSection.autoAccept")}
            description="Nur bekannte Kontakte"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.friendsSection.blocked")}
            description="Verwalten"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Universität */}
      <View onLayout={handleSectionLayout("uni")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.uni")}</List.Subheader>
          <List.Item
            title={t("settings.uniSection.degree")}
            description="Auswahl"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.uniSection.faculty")}
            description="Auswahl"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.uniSection.newsPush")}
            description="An/Aus"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Daten & Cache */}
      <View onLayout={handleSectionLayout("data")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.data")}</List.Subheader>
          <List.Item
            title={t("settings.dataSection.clearMedia")}
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.dataSection.resetOffline")}
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.dataSection.export")}
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Sicherheit */}
      <View onLayout={handleSectionLayout("security")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.security")}</List.Subheader>
          <List.Item
            title={t("settings.securitySection.pin")}
            description="Zum Öffnen"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.securitySection.devices")}
            description="Aktive Sitzungen"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.securitySection.twofa")}
            description="Optional"
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Barrierefreiheit */}
      <View onLayout={handleSectionLayout("accessibility")}>
        <Surface style={styles.card} mode="elevated">
        <List.Section>
          <List.Subheader style={styles.subheader}>{t("settings.sections.accessibility")}</List.Subheader>
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
            <Surface style={styles.inlineMenu} mode="flat">
              {(["small", "medium", "large"] as TextScale[]).map((size, idx, arr) => (
                <View key={size}>
                  <Button
                    mode="text"
                    onPress={() => {
                      saveNotifications({ textScale: size });
                      setTextMenu(false);
                    }}
                    contentStyle={styles.inlineBtn}
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
              <Switch
                value={highContrast}
                onValueChange={(v) => setHighContrast(v)}
              />
            )}
          />
          <Divider />
          <List.Item
            title={t("settings.accessibilitySection.reduceMotion")}
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
          <Divider />
          <List.Item
            title={t("settings.accessibilitySection.haptics")}
            {...listItemTextStyles}
            right={() => <TodoTag scale={scale} />}
          />
        </List.Section>
        </Surface>
      </View>

      {/* Info / Rechtliches */}
      <View onLayout={handleSectionLayout("info")}>
        <Surface style={styles.card} mode="elevated">
          <List.Section>
            <List.Subheader style={styles.subheader}>{t("settings.sections.info")}</List.Subheader>
            <List.Item
              title={t("settings.infoSection.faq")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.infoSection.privacy")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.infoSection.terms")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.infoSection.imprint")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.infoSection.contact")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
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
