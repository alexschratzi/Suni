// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

import { supabase } from "../src/lib/supabase";

type ProfileCheck = { id: string; username: string | null };

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  const inAuthGroup = segments[0] === "(auth)";
  const inDrawerGroup = segments[0] === "(drawer)";

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
      // During transitions (login/logout), force loader to avoid “white”
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
    if (!ready) return;

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
      if (!inDrawerGroup) router.replace("/(drawer)/(tabs)/timetable");
      return;
    }
  }, [ready, sessionUserId, profileReady, inAuthGroup, inDrawerGroup, router]);

  if (!ready) {
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
