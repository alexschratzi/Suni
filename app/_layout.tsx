// app/_layout.tsx
import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../src/lib/supabase";

type ProfileCheck = { id: string; username: string | null };

const DEV_AUTH_BYPASS_KEY = "DEV_AUTH_BYPASS_ENABLED";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const [devBypassEnabled, setDevBypassEnabled] = useState(false);
  const [devBypassLoaded, setDevBypassLoaded] = useState(false);

  const inAuthGroup = segments[0] === "(auth)";
  const inAppGroup = segments[0] === "(app)";

  const loadProfileReady = async (userId: string) => {
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle<ProfileCheck>();

    if (error) {
      console.warn("profiles check error:", error.message);
      return false;
    }

    return !!prof?.username && prof.username.trim().length > 0;
  };

  const loadDevBypass = useCallback(async () => {
    if (!__DEV__) {
      setDevBypassEnabled(false);
      setDevBypassLoaded(true);
      return;
    }

    try {
      const v = await AsyncStorage.getItem(DEV_AUTH_BYPASS_KEY);
      setDevBypassEnabled(v === "1");
    } catch (e) {
      console.warn("Failed to read dev bypass:", e);
      setDevBypassEnabled(false);
    } finally {
      setDevBypassLoaded(true);
    }
  }, []);

  // Load dev bypass once
  useEffect(() => {
    loadDevBypass();
  }, [loadDevBypass]);

  // Initial session + subscribe to auth changes
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setReady(false);

      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;

      if (cancelled) return;

      setSessionUserId(userId);

      if (!userId) {
        setProfileReady(false);
        setReady(true);
        return;
      }

      const ok = await loadProfileReady(userId);
      if (cancelled) return;
      setProfileReady(ok);
      setReady(true);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setReady(false);

      const userId = session?.user?.id ?? null;
      setSessionUserId(userId);

      if (!userId) {
        setProfileReady(false);
        setReady(true);
        return;
      }

      const ok = await loadProfileReady(userId);
      setProfileReady(ok);
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Routing decisions
  useEffect(() => {
    // Wait until BOTH are loaded so we don't flicker / bounce
    if (!ready || !devBypassLoaded) return;

    // DEV bypass: treat as "fully authed"
    if (__DEV__ && devBypassEnabled) {
      if (!inAppGroup) router.replace("/(app)/(tabs)/timetable");
      return;
    }

    // Not logged in -> go to auth
    if (!sessionUserId) {
      if (!inAuthGroup) router.replace("/(auth)");
      return;
    }

    // Logged in but profile incomplete -> keep in auth (username step)
    if (sessionUserId && !profileReady) {
      if (!inAuthGroup) router.replace("/(auth)");
      return;
    }

    // Logged in and ready -> go to home
    if (sessionUserId && profileReady) {
      if (!inAppGroup) router.replace("/(app)/(tabs)/timetable");
      return;
    }
  }, [
    ready,
    devBypassLoaded,
    devBypassEnabled,
    sessionUserId,
    profileReady,
    inAuthGroup,
    inAppGroup,
    router,
  ]);

  if (!ready || !devBypassLoaded) {
    return (
      <AppThemeProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </AppThemeProvider>
    );
  }

  return (
    <AppThemeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppThemeProvider>
  );
}
