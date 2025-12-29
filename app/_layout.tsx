// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

import { supabase } from "../src/lib/supabase";

type ProfileCheck = { id: string; username: string | null };

const APP_HOME = "/(app)/(stack)/(tabs)/timetable";
const AUTH_HOME = "/(auth)";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  // Only needed to decide whether authed users are allowed to stay in /(auth)
  const [profileReady, setProfileReady] = useState<boolean>(false);
  const [profileChecked, setProfileChecked] = useState<boolean>(false);

  const inAuthGroup = segments[0] === "(auth)";

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

      const { data, error } = await supabase.auth.getSession();
      if (error) console.warn("getSession error:", error.message);

      if (cancelled) return;

      const userId = data.session?.user?.id ?? null;
      const isAuthed = !!userId;

      setAuthed(isAuthed);

      if (!userId) {
        setProfileReady(false);
        setProfileChecked(true);
        setReady(true);
        return;
      }

      // Preload profile readiness once on boot (helps avoid flicker)
      const ok = await loadProfileReady(userId);
      if (cancelled) return;

      setProfileReady(ok);
      setProfileChecked(true);
      setReady(true);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id ?? null;
      const isAuthed = !!userId;

      setAuthed(isAuthed);

      if (!userId) {
        setProfileReady(false);
        setProfileChecked(true);
        return;
      }

      // Re-check when session changes (login/logout)
      setProfileChecked(false);
      const ok = await loadProfileReady(userId);
      setProfileReady(ok);
      setProfileChecked(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Routing decisions:
  // 1) unauthenticated -> must be in /(auth)
  // 2) authenticated -> allowed in /(auth) ONLY if onboarding (no username yet)
  // 3) authenticated + profileReady -> should not be in /(auth)
  useEffect(() => {
    if (!ready) return;

    if (!authed) {
      if (!inAuthGroup) router.replace(AUTH_HOME);
      return;
    }

    // authed
    // If user is in auth, only kick them out if their profile is ready.
    if (inAuthGroup) {
      if (!profileChecked) return; // wait until we know if username exists

      if (profileReady) {
        router.replace(APP_HOME);
      }
      // else: stay in auth to choose username
      return;
    }

    // Outside auth group, do nothing. (No auto-routing to app.)
  }, [ready, authed, inAuthGroup, profileChecked, profileReady, router]);

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
