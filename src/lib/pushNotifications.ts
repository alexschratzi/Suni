import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { supabase } from "@/src/lib/supabase";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";

const PUSH_ENABLED_KEY = "push.enabled";
const PUSH_TOKEN_KEY = "push.expoToken";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
};

export const setLocalNotificationsEnabled = async (enabled: boolean) => {
  await AsyncStorage.setItem(PUSH_ENABLED_KEY, enabled ? "1" : "0");
};

export const getLocalNotificationsEnabled = async () => {
  const raw = await AsyncStorage.getItem(PUSH_ENABLED_KEY);
  return raw !== "0";
};

export const getCachedPushToken = async () => {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
};

const updatePushTokens = async (
  userId: string,
  token: string,
  action: "add" | "remove"
) => {
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .select(COLUMNS.profiles.settings)
    .eq(COLUMNS.profiles.id, userId)
    .maybeSingle();

  if (error) {
    console.error("Push settings load error:", error.message);
    return;
  }

  const settings = (data as any)?.[COLUMNS.profiles.settings] || {};
  const existing = Array.isArray(settings.expoPushTokens)
    ? (settings.expoPushTokens as string[]).filter(Boolean)
    : [];

  const next =
    action === "add"
      ? Array.from(new Set([...existing, token]))
      : existing.filter((value) => value !== token);

  if (next.length === existing.length && next.every((v, i) => v === existing[i]))
    return;

  const nextSettings = { ...settings, expoPushTokens: next };
  const { error: updateError } = await supabase
    .from(TABLES.profiles)
    .update({ [COLUMNS.profiles.settings]: nextSettings })
    .eq(COLUMNS.profiles.id, userId);

  if (updateError) {
    console.error("Push settings update error:", updateError.message);
  }
};

export const registerForPushNotificationsAsync = async () => {
  try {
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (finalStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const projectId = getProjectId();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenResponse.data;
    if (token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
    return token;
  } catch (err) {
    console.warn("Push registration failed:", err);
    return null;
  }
};

export const ensurePushEnabledAsync = async (userId: string) => {
  const enabled = await getLocalNotificationsEnabled();
  if (!enabled) return null;

  const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (cachedToken) {
    await updatePushTokens(userId, cachedToken, "add");
    return cachedToken;
  }

  const token = await registerForPushNotificationsAsync();
  if (!token) return null;
  await updatePushTokens(userId, token, "add");
  return token;
};

export const disablePushNotificationsAsync = async (userId: string) => {
  await setLocalNotificationsEnabled(false);
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token) {
    await updatePushTokens(userId, token, "remove");
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
};
