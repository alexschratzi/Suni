// app/(app)/(stack)/global_settings.tsx
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  useTheme,
  List,
  Divider,
  Surface,
  ActivityIndicator,
  Switch,
  Button,
  Chip,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useAppTheme,
  ThemeMode,
  TextScale,
} from "@/components/theme/AppThemeProvider";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
type LanguageCode = "de" | "en";
type SectionKey =
  | "general"
  | "calendar"
  | "chat"
  | "friends"
  | "uni"
  | "news"
  | "data"
  | "security"
  | "accessibility"
  | "info";

type HiddenThread = {
  id: string;
  otherUid: string;
  last?: string | null;
  lastTimestamp?: string | null;
};

const TodoTag = ({
  label = "TODO",
  scale = 1,
}: {
  label?: string;
  scale?: number;
}) => (
  <Text style={[styles.todo, { fontSize: Math.round(12 * scale) }]}>
    {label}
  </Text>
);

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const {
    mode,
    effectiveMode,
    setMode,
    highContrast,
    setHighContrast,
    textScale,
    setTextScale,
  } = useAppTheme();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();
  const router = useRouter();
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
    { key: "news", label: t("settings.sections.news") },
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
  const [blockedExpanded, setBlockedExpanded] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, { username?: string }>>({});
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [hiddenThreads, setHiddenThreads] = useState<HiddenThread[]>([]);
  const [hiddenProfiles, setHiddenProfiles] = useState<Record<string, { username?: string }>>({});
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [clearingLocal, setClearingLocal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const hiddenDisplayName = React.useMemo(
    () => (uid: string) => hiddenProfiles[uid]?.username || uid,
    [hiddenProfiles]
  );
  const blockedDisplayName = React.useMemo(
    () => (uid: string) => blockedProfiles[uid]?.username || uid,
    [blockedProfiles]
  );
  const fetchUsernames = React.useCallback(async (ids: string[]) => {
    let remaining = ids;
    const profileMap: Record<string, { username?: string }> = {};

    const { data: profileData, error: profileError } = await supabase
      .from(TABLES.profiles)
      .select(`${COLUMNS.profiles.id},${COLUMNS.profiles.username}`)
      .in(COLUMNS.profiles.id, remaining);

    if (profileError) {
      console.error("Profiles load error:", profileError.message);
    } else {
      (profileData || []).forEach((row: any) => {
        const id = row?.[COLUMNS.profiles.id];
        const username = row?.[COLUMNS.profiles.username];
        if (id) profileMap[id] = { username };
      });
      remaining = remaining.filter((uid) => !profileMap[uid]?.username);
    }

    if (remaining.length === 0) return profileMap;

    const { data: usernameData, error: usernameError } = await supabase
      .from(TABLES.usernames)
      .select(`${COLUMNS.usernames.userId},${COLUMNS.usernames.username}`)
      .in(COLUMNS.usernames.userId, remaining);

    if (usernameError) {
      console.error("Usernames load error:", usernameError.message);
      return profileMap;
    }

    (usernameData || []).forEach((row: any) => {
      const id = row?.[COLUMNS.usernames.userId];
      const username = row?.[COLUMNS.usernames.username];
      if (id) profileMap[id] = { username };
    });

    return profileMap;
  }, []);

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
      if (!userId) {
        setLoadingPrefs(false);
        return;
      }
      setLoadingPrefs(true);
      try {
        const { data, error } = await supabase
          .from(TABLES.profiles)
          .select(COLUMNS.profiles.settings)
          .eq(COLUMNS.profiles.id, userId)
          .maybeSingle();

        if (error) throw error;

        const settings = (data as any)?.[COLUMNS.profiles.settings] || {};
        const notif = settings.notifications || {};

        if (typeof notif.global === "boolean") setNotifGlobal(notif.global);
        if (typeof notif.chat === "boolean") setNotifChat(notif.chat);
        if (typeof notif.mention === "boolean") setNotifMention(notif.mention);
        if (typeof notif.direct === "boolean") setNotifDirect(notif.direct);
        if (typeof notif.rooms === "boolean") setNotifRooms(notif.rooms);

        if (typeof settings.chatThemeColor === "string")
          setChatColor(settings.chatThemeColor);

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
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoadingPrefs(false);
      }
    };

    loadPrefs();
  }, [setTextScale, userId]);

  useEffect(() => {
    if (!userId) {
      setBlockedUsers([]);
      setBlockedProfiles({});
      setBlockedLoading(false);
      return;
    }

    if (!blockedExpanded) return;

    let cancelled = false;

    const loadBlockedUsers = async () => {
      setBlockedLoading(true);
      const { data, error } = await supabase
        .from(TABLES.blocks)
        .select(COLUMNS.blocks.blockedId)
        .eq(COLUMNS.blocks.blockerId, userId);

      if (error) {
        console.error("Blocked users load error:", error.message);
        if (!cancelled) {
          setBlockedUsers([]);
          setBlockedLoading(false);
        }
        return;
      }

      if (cancelled) return;
      const ids =
        (data || [])
          .map((row: any) => row?.[COLUMNS.blocks.blockedId])
          .filter(Boolean) || [];
      setBlockedUsers(ids);
      setBlockedLoading(false);
    };

    loadBlockedUsers();

    return () => {
      cancelled = true;
    };
  }, [blockedExpanded, userId]);

  useEffect(() => {
    if (!userId) {
      setHiddenThreads([]);
      setHiddenProfiles({});
      setHiddenLoading(false);
      return;
    }

    if (!hiddenExpanded) return;

    let cancelled = false;

    const loadHiddenThreads = async () => {
      setHiddenLoading(true);
      const columns = [
        COLUMNS.dmThreads.id,
        COLUMNS.dmThreads.userIds,
        COLUMNS.dmThreads.lastMessage,
        COLUMNS.dmThreads.lastTimestamp,
        COLUMNS.dmThreads.hiddenBy,
      ].join(",");

      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(columns)
        .contains(COLUMNS.dmThreads.hiddenBy, [userId])
        .order(COLUMNS.dmThreads.lastTimestamp, { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Hidden chats load error:", error.message);
        if (!cancelled) {
          setHiddenThreads([]);
          setHiddenLoading(false);
        }
        return;
      }

      if (cancelled) return;
      const threads =
        (data || [])
          .map((row: any) => {
            const userIds = row?.[COLUMNS.dmThreads.userIds];
            let otherUid = userId;
            if (Array.isArray(userIds)) {
              otherUid = userIds.find((id: string) => id !== userId) || userId;
            }
            return {
              id: row?.[COLUMNS.dmThreads.id],
              otherUid,
              last: row?.[COLUMNS.dmThreads.lastMessage] ?? "",
              lastTimestamp: row?.[COLUMNS.dmThreads.lastTimestamp] ?? null,
            };
          })
          .filter((row: HiddenThread) => row.id && row.otherUid) || [];

      setHiddenThreads(threads);
      setHiddenLoading(false);
    };

    loadHiddenThreads();

    return () => {
      cancelled = true;
    };
  }, [hiddenExpanded, userId]);

  useEffect(() => {
    const missing = Array.from(
      new Set(
        hiddenThreads.map((thread) => thread.otherUid).filter((uid) => !hiddenProfiles[uid])
      )
    );
    if (!missing.length) return;

    (async () => {
      const profileMap = await fetchUsernames(missing);
      if (Object.keys(profileMap).length > 0) {
        setHiddenProfiles((prev) => ({ ...prev, ...profileMap }));
      }
    })();
  }, [hiddenThreads, hiddenProfiles, fetchUsernames]);

  useEffect(() => {
    const missing = Array.from(
      new Set(blockedUsers.filter((uid) => !blockedProfiles[uid]))
    );
    if (!missing.length) return;

    (async () => {
      const profileMap = await fetchUsernames(missing);
      if (Object.keys(profileMap).length > 0) {
        setBlockedProfiles((prev) => ({ ...prev, ...profileMap }));
      }
    })();
  }, [blockedUsers, blockedProfiles, fetchUsernames]);

  const unhideThread = async (threadId: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(COLUMNS.dmThreads.hiddenBy)
        .eq(COLUMNS.dmThreads.id, threadId)
        .maybeSingle();

      if (error) throw error;

      const current = Array.isArray(data?.[COLUMNS.dmThreads.hiddenBy])
        ? (data?.[COLUMNS.dmThreads.hiddenBy] as string[])
        : [];
      const next = current.filter((id) => id !== userId);

      const { error: updateError } = await supabase
        .from(TABLES.dmThreads)
        .update({ [COLUMNS.dmThreads.hiddenBy]: next })
        .eq(COLUMNS.dmThreads.id, threadId);

      if (updateError) throw updateError;

      setHiddenThreads((prev) => prev.filter((thread) => thread.id !== threadId));
    } catch (err) {
      console.error("Hidden chat unhide error:", err);
    }
  };

  const unblockUser = async (blockedId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from(TABLES.blocks)
        .delete()
        .eq(COLUMNS.blocks.blockerId, userId)
        .eq(COLUMNS.blocks.blockedId, blockedId);

      if (error) throw error;

      setBlockedUsers((prev) => prev.filter((id) => id !== blockedId));
    } catch (err) {
      console.error("Blocked user unblock error:", err);
    }
  };

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
    if (!userId) return;

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
      const { error } = await supabase
        .from(TABLES.profiles)
        .update({
          [COLUMNS.profiles.settings]: {
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
        })
        .eq(COLUMNS.profiles.id, userId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to save notification settings", err);
    }
  };

  const confirmClearLocal = () => {
    if (clearingLocal) return;
    Alert.alert(
      t("settings.dataSection.clearLocalConfirmTitle"),
      t("settings.dataSection.clearLocalConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.dataSection.clearLocalConfirmAction"),
          style: "destructive",
          onPress: async () => {
            setClearingLocal(true);
            try {
              await AsyncStorage.clear();
              await supabase.auth.signOut();
              router.replace("/(auth)");
            } catch (err) {
              console.error("Clear local data failed:", err);
            } finally {
              setClearingLocal(false);
            }
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    if (deletingAccount) return;
    Alert.alert(
      t("settings.dataSection.deleteAccountConfirmTitle"),
      t("settings.dataSection.deleteAccountConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("settings.dataSection.deleteAccountConfirmAction"),
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true);
            try {
              const { error } = await supabase.rpc("delete_user");
              if (error) throw error;

              await supabase.auth.signOut();
              router.replace("/(auth)");
            } catch (err) {
              console.error("Account deletion failed:", err);
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
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
          {t(
            "settings.subtitle",
            "Alles auf einer Seite. Tippe auf einen Abschnitt oder scrolle."
          )}
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
          <List.Subheader style={styles.subheader}>
            {t("settings.sections.general")}
          </List.Subheader>

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
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.calendar")}
            </List.Subheader>

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
                    style={{
                      color: paperTheme.colors.onSurfaceVariant,
                      fontSize: Math.round(16 * scale),
                    }}
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
      </View>

      {/* Chat */}
      <View onLayout={handleSectionLayout("chat")}>
        <Surface style={styles.card} mode="elevated">
          <List.Section>
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.chat")}
            </List.Subheader>

            <List.Item
              title={t("settings.chatSection.readReceipts")}
              description="An/Aus"
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.chatSection.notifications")}
              description={t(
                "settings.chatSection.notificationsDesc",
                "Push / Sound / Vibration"
              )}
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
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.friends")}
            </List.Subheader>

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
            <List.Accordion
              title={`${t("settings.friendsSection.blocked")} (${blockedUsers.length})`}
              description={t("settings.friendsSection.blockedDesc")}
              expanded={blockedExpanded}
              onPress={() => setBlockedExpanded((v) => !v)}
            >
              {blockedLoading ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator />
                </View>
              ) : blockedUsers.length === 0 ? (
                <Text style={{ paddingHorizontal: 16, color: paperTheme.colors.onSurfaceVariant }}>
                  {t("settings.friendsSection.blockedEmpty")}
                </Text>
              ) : (
                blockedUsers.map((uid, idx) => (
                  <View key={uid}>
                    <List.Item
                      title={blockedDisplayName(uid)}
                      {...listItemTextStyles}
                      left={(props) => <List.Icon {...props} icon="account-cancel-outline" />}
                      right={() => (
                        <Button compact onPress={() => unblockUser(uid)}>
                          {t("settings.friendsSection.blockedUnblock")}
                        </Button>
                      )}
                    />
                    {idx < blockedUsers.length - 1 && (
                      <Divider style={{ marginLeft: 56 }} />
                    )}
                  </View>
                ))
              )}
            </List.Accordion>
            <Divider />
            <List.Accordion
              title={`${t("settings.friendsSection.hiddenTitle")} (${hiddenThreads.length})`}
              description={t("settings.friendsSection.hiddenDesc")}
              expanded={hiddenExpanded}
              onPress={() => setHiddenExpanded((v) => !v)}
            >
              {hiddenLoading ? (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator />
                </View>
              ) : hiddenThreads.length === 0 ? (
                <Text style={{ paddingHorizontal: 16, color: paperTheme.colors.onSurfaceVariant }}>
                  {t("settings.friendsSection.hiddenEmpty")}
                </Text>
              ) : (
                hiddenThreads.map((thread, idx) => (
                  <View key={thread.id}>
                    <List.Item
                      title={hiddenDisplayName(thread.otherUid)}
                      description={
                        thread.last || t("settings.friendsSection.hiddenNoMessage")
                      }
                      {...listItemTextStyles}
                      left={(props) => <List.Icon {...props} icon="account" />}
                      right={() => (
                        <Button compact onPress={() => unhideThread(thread.id)}>
                          {t("settings.friendsSection.hiddenUnhide")}
                        </Button>
                      )}
                    />
                    {idx < hiddenThreads.length - 1 && (
                      <Divider style={{ marginLeft: 56 }} />
                    )}
                  </View>
                ))
              )}
            </List.Accordion>
          </List.Section>
        </Surface>
      </View>

      {/* Universität */}
      <View onLayout={handleSectionLayout("uni")}>
        <Surface style={styles.card} mode="elevated">
          <List.Section>
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.uni")}
            </List.Subheader>

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

      {/* News */}
      <View onLayout={handleSectionLayout("news")}>
        <Surface style={styles.card} mode="elevated">
          <List.Section>
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.news")}
            </List.Subheader>

            <List.Item
              title={t("settings.newsSection.push")}
              description={t("settings.newsSection.pushDesc")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.newsSection.topics")}
              description={t("settings.newsSection.topicsDesc")}
              {...listItemTextStyles}
              right={() => <TodoTag scale={scale} />}
            />
            <Divider />
            <List.Item
              title={t("settings.newsSection.sources")}
              description={t("settings.newsSection.sourcesDesc")}
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
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.data")}
            </List.Subheader>

            <List.Item
              title={t("settings.dataSection.clearLocal")}
              description={t("settings.dataSection.clearLocalDesc")}
              {...listItemTextStyles}
              right={() => (
                <Button
                  mode="contained-tonal"
                  onPress={confirmClearLocal}
                  loading={clearingLocal}
                  disabled={clearingLocal}
                >
                  {t("settings.dataSection.clearLocalAction")}
                </Button>
              )}
            />
            <Divider />
            <List.Item
              title={t("settings.dataSection.deleteAccount")}
              description={t("settings.dataSection.deleteAccountDesc")}
              {...listItemTextStyles}
              right={() => (
                <Button
                  mode="contained"
                  buttonColor={paperTheme.colors.error}
                  textColor={paperTheme.colors.onError}
                  onPress={confirmDeleteAccount}
                  loading={deletingAccount}
                  disabled={deletingAccount}
                >
                  {t("settings.dataSection.deleteAccountAction")}
                </Button>
              )}
            />
          </List.Section>
        </Surface>
      </View>

      {/* Sicherheit */}
      <View onLayout={handleSectionLayout("security")}>
        <Surface style={styles.card} mode="elevated">
          <List.Section>
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.security")}
            </List.Subheader>

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
            <List.Subheader style={styles.subheader}>
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
              <Surface style={styles.inlineMenu} mode="flat">
                {(["small", "medium", "large"] as TextScale[]).map(
                  (size, idx, arr) => (
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
                  )
                )}
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
            <List.Subheader style={styles.subheader}>
              {t("settings.sections.info")}
            </List.Subheader>

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
