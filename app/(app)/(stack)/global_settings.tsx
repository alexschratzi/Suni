// app/(app)/(stack)/global_settings.tsx
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Chip, Surface, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  useAppTheme,
  ThemeMode,
  TextScale,
} from "@/components/theme/AppThemeProvider";
import { settingsStyles } from "@/components/settings/settingsStyles";
import { SettingsAccessibilitySection } from "@/components/settings/sections/SettingsAccessibilitySection";
import { SettingsCalendarSection } from "@/components/settings/sections/SettingsCalendarSection";
import { SettingsChatSection } from "@/components/settings/sections/SettingsChatSection";
import { SettingsDataSection } from "@/components/settings/sections/SettingsDataSection";
import { SettingsFriendsSection } from "@/components/settings/sections/SettingsFriendsSection";
import { SettingsGeneralSection } from "@/components/settings/sections/SettingsGeneralSection";
import { SettingsInfoSection } from "@/components/settings/sections/SettingsInfoSection";
import { SettingsNewsSection } from "@/components/settings/sections/SettingsNewsSection";
import { SettingsSecuritySection } from "@/components/settings/sections/SettingsSecuritySection";
import { SettingsUniversitySection } from "@/components/settings/sections/SettingsUniversitySection";
import type { HiddenThread, LanguageCode } from "@/components/settings/types";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import {
  disablePushNotificationsAsync,
  ensurePushEnabledAsync,
  getCachedPushToken,
  setLocalNotificationsEnabled,
} from "@/src/lib/pushNotifications";

import { useResetOnboarding } from "@/components/university/useResetOnboarding";
import { useUniversity } from "@/components/university/UniversityContext";

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

   const handleUniLogout = async () => {
    if (uniLogoutBusy) return;

    Alert.alert(
      "Uni Logout",
      "Möchtest du dich wirklich von der Uni abmelden?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            setUniLogoutBusy(true);
            try {
              // optional: clear selected university in app state (if available)
              try {
                setUniversity?.(null as any);
              } catch {}

              await resetOnboarding({ clearCookies: true });
            } catch (err) {
              console.error("Uni logout failed:", err);
            } finally {
              setUniLogoutBusy(false);
            }
          },
        },
      ]
    );
  };

    const resetOnboarding = useResetOnboarding();
    const { setUniversity } = useUniversity(); // if your context exposes this
    const [uniLogoutBusy, setUniLogoutBusy] = useState(false);

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
  const settingsSnapshotRef = useRef<Record<string, any> | null>(null);

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
  const [blockedCount, setBlockedCount] = useState(0);
  const blockedLoadedRef = useRef(false);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [hiddenThreads, setHiddenThreads] = useState<HiddenThread[]>([]);
  const [hiddenProfiles, setHiddenProfiles] = useState<Record<string, { username?: string }>>({});
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [clearingLocal, setClearingLocal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const hiddenDisplayName = React.useMemo(
    () => (uid: string) => hiddenProfiles[uid]?.username || "...",
    [hiddenProfiles]
  );
  const blockedDisplayName = React.useMemo(
    () => (uid: string) => blockedProfiles[uid]?.username || "...",
    [blockedProfiles]
  );
  const fetchUsernames = React.useCallback(async (ids: string[]) => {
    let remaining = ids;
    const profileMap: Record<string, { username?: string }> = {};

    const cached = getMemoryProfiles(remaining);
    Object.entries(cached).forEach(([id, entry]) => {
      if (entry?.username) profileMap[id] = { username: entry.username ?? undefined };
    });
    remaining = remaining.filter((uid) => !profileMap[uid]?.username);

    if (remaining.length > 0) {
      const profiles = await fetchProfilesWithCache(remaining);
      Object.entries(profiles).forEach(([id, entry]) => {
        if (entry?.username) profileMap[id] = { username: entry.username ?? undefined };
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

        settingsSnapshotRef.current = settings;

        if (typeof notif.global === "boolean") {
          setNotifGlobal(notif.global);
          try {
            await setLocalNotificationsEnabled(notif.global);
          } catch (err) {
            console.warn("Failed to update local notification toggle", err);
          }
        }
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

  const loadBlockedUsers = React.useCallback(
    async (options?: { showLoader?: boolean; force?: boolean }) => {
      if (!userId) return;
      if (blockedLoadedRef.current && !options?.force) return;

      if (options?.showLoader) setBlockedLoading(true);
      const { data, error } = await supabase
        .from(TABLES.blocks)
        .select(COLUMNS.blocks.blockedId)
        .eq(COLUMNS.blocks.blockerId, userId);

      if (error) {
        console.error("Blocked users load error:", error.message);
        if (options?.showLoader) setBlockedLoading(false);
        return;
      }

      const ids =
        (data || [])
          .map((row: any) => row?.[COLUMNS.blocks.blockedId])
          .filter(Boolean) || [];
      setBlockedUsers(ids);
      setBlockedCount(ids.length);
      blockedLoadedRef.current = true;
      if (options?.showLoader) setBlockedLoading(false);
    },
    [userId]
  );

  useEffect(() => {
    blockedLoadedRef.current = false;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setBlockedUsers([]);
      setBlockedProfiles({});
      setBlockedLoading(false);
      setBlockedCount(0);
      return;
    }

    if (!blockedExpanded) return;
    loadBlockedUsers({ showLoader: true });
  }, [blockedExpanded, loadBlockedUsers, userId]);

  useEffect(() => {
    if (!userId) return;
    loadBlockedUsers({ showLoader: false });
  }, [loadBlockedUsers, userId]);

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

      setBlockedUsers((prev) => {
        const next = prev.filter((id) => id !== blockedId);
        setBlockedCount(next.length);
        return next;
      });
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

    const prevGlobal = notifGlobal;
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

    const existingSettings = settingsSnapshotRef.current ?? {};
    const existingNotifications =
      (existingSettings.notifications as Record<string, any>) || {};
    const existingEventPrefs =
      (existingSettings.eventPrefs as Record<string, any>) || {};

    const nextSettings = {
      ...existingSettings,
      notifications: {
        ...existingNotifications,
        global: newGlobal,
        chat: newChat,
        mention: newMention,
        direct: newDirect,
        rooms: newRooms,
      },
      chatThemeColor: newColor,
      eventPrefs: {
        ...existingEventPrefs,
        enabled: newEventsEnabled,
        categories: newCats,
      },
      textScale: newTextScale,
    };

    settingsSnapshotRef.current = nextSettings;

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
          [COLUMNS.profiles.settings]: nextSettings,
        })
        .eq(COLUMNS.profiles.id, userId);

      if (error) throw error;
    } catch (err) {
      console.error("Failed to save notification settings", err);
    }

    if (next.global !== undefined && newGlobal !== prevGlobal) {
      try {
        if (newGlobal) {
          await setLocalNotificationsEnabled(true);
          const token = await ensurePushEnabledAsync(userId);
          if (token) {
            const current = settingsSnapshotRef.current ?? {};
            const existingTokens = Array.isArray(current.expoPushTokens)
              ? current.expoPushTokens.filter(Boolean)
              : [];
            const mergedTokens = Array.from(new Set([...existingTokens, token]));
            settingsSnapshotRef.current = { ...current, expoPushTokens: mergedTokens };
          }
        } else {
          const cachedToken = await getCachedPushToken();
          await disablePushNotificationsAsync(userId);
          if (cachedToken) {
            const current = settingsSnapshotRef.current ?? {};
            const existingTokens = Array.isArray(current.expoPushTokens)
              ? current.expoPushTokens.filter(Boolean)
              : [];
            const nextTokens = existingTokens.filter((value) => value !== cachedToken);
            settingsSnapshotRef.current = { ...current, expoPushTokens: nextTokens };
          }
        }
      } catch (err) {
        console.warn("Push toggle failed:", err);
      }
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
      contentContainerStyle={settingsStyles.container}
    >
      <Surface style={settingsStyles.card} mode="elevated">
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
        <View style={settingsStyles.chipRow}>
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
        <SettingsGeneralSection
          activeThemeLabel={activeThemeLabel}
          themeMenu={themeMenu}
          setThemeMenu={setThemeMenu}
          langMenu={langMenu}
          setLangMenu={setLangMenu}
          language={language}
          listItemTextStyles={listItemTextStyles}
          notifGlobal={notifGlobal}
          loadingPrefs={loadingPrefs}
          onThemeChange={onThemeChange}
          onLanguageChange={handleLanguageChange}
          saveNotifications={saveNotifications}
        />
      </View>

      {/* Kalender + Events */}
      <View onLayout={handleSectionLayout("calendar")}>
        <SettingsCalendarSection
          listItemTextStyles={listItemTextStyles}
          scale={scale}
          eventSettingsOpen={eventSettingsOpen}
          setEventSettingsOpen={setEventSettingsOpen}
          eventsEnabled={eventsEnabled}
          eventCategories={eventCategories}
          loadingPrefs={loadingPrefs}
          saveNotifications={saveNotifications}
        />
      </View>

      {/* Chat */}
      <View onLayout={handleSectionLayout("chat")}>
        <SettingsChatSection
          listItemTextStyles={listItemTextStyles}
          scale={scale}
          notifChat={notifChat}
          notifMention={notifMention}
          notifDirect={notifDirect}
          notifRooms={notifRooms}
          chatColor={chatColor}
          loadingPrefs={loadingPrefs}
          saveNotifications={saveNotifications}
        />
      </View>

      {/* Freunde / DM */}
      <View onLayout={handleSectionLayout("friends")}>
        <SettingsFriendsSection
          listItemTextStyles={listItemTextStyles}
          scale={scale}
          blockedCount={blockedCount}
          blockedExpanded={blockedExpanded}
          setBlockedExpanded={setBlockedExpanded}
          blockedLoading={blockedLoading}
          blockedUsers={blockedUsers}
          blockedDisplayName={blockedDisplayName}
          unblockUser={unblockUser}
          hiddenThreads={hiddenThreads}
          hiddenExpanded={hiddenExpanded}
          setHiddenExpanded={setHiddenExpanded}
          hiddenLoading={hiddenLoading}
          hiddenDisplayName={hiddenDisplayName}
          unhideThread={unhideThread}
        />
      </View>

      {/* Universit?t */}
      <View onLayout={handleSectionLayout("uni")}>
        <SettingsUniversitySection
          listItemTextStyles={listItemTextStyles}
          handleUniLogout={handleUniLogout}
          uniLogoutBusy={uniLogoutBusy}
        />
      </View>

      {/* News */}
      <View onLayout={handleSectionLayout("news")}>
        <SettingsNewsSection listItemTextStyles={listItemTextStyles} scale={scale} />
      </View>

      {/* Daten & Cache */}
      <View onLayout={handleSectionLayout("data")}>
        <SettingsDataSection
          listItemTextStyles={listItemTextStyles}
          clearingLocal={clearingLocal}
          confirmClearLocal={confirmClearLocal}
          deletingAccount={deletingAccount}
          confirmDeleteAccount={confirmDeleteAccount}
        />
      </View>

      {/* Sicherheit */}
      <View onLayout={handleSectionLayout("security")}>
        <SettingsSecuritySection listItemTextStyles={listItemTextStyles} scale={scale} />
      </View>

      {/* Barrierefreiheit */}
      <View onLayout={handleSectionLayout("accessibility")}>
        <SettingsAccessibilitySection
          listItemTextStyles={listItemTextStyles}
          textSizeLabel={textSizeLabel}
          textMenu={textMenu}
          setTextMenu={setTextMenu}
          setThemeMenu={setThemeMenu}
          setLangMenu={setLangMenu}
          saveNotifications={saveNotifications}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          scale={scale}
        />
      </View>

      {/* Info / Rechtliches */}
      <View onLayout={handleSectionLayout("info")}>
        <SettingsInfoSection listItemTextStyles={listItemTextStyles} scale={scale} />
      </View>
    </ScrollView>
  );
}
