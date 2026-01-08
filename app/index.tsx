// app/index.tsx
import React, { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { supabase } from "../src/lib/supabase";

type ProfileCheck = { id: string; username: string | null };

const APP_HOME = "/(app)/(stack)/(tabs)/timetable";
const AUTH_HOME = "/(auth)";

async function loadProfileReady(userId: string) {
  try {
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
  } catch (err) {
    console.warn("profiles check error:", err);
    return false;
  }
}

async function loadProfileReadyWithTimeout(userId: string, timeoutMs = 6000) {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<boolean>((resolve) => {
    timeoutHandle = setTimeout(() => {
      console.warn("profiles check timeout");
      resolve(false);
    }, timeoutMs);
  });

  const result = await Promise.race([loadProfileReady(userId), timeoutPromise]);

  if (timeoutHandle) clearTimeout(timeoutHandle);
  return result;
}

export default function Index() {
  const [href, setHref] = useState<typeof APP_HOME | typeof AUTH_HOME | null>(null);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.warn("getSession error:", error.message);
      if (cancelled) return;

      const userId = data.session?.user?.id ?? null;

      if (!userId) {
        setHref(AUTH_HOME);
        return;
      }

      // If profile is ready -> go app. Otherwise -> stay in auth (onboarding/username)
      const ok = await loadProfileReadyWithTimeout(userId);
      if (cancelled) return;

      setHref(ok ? APP_HOME : AUTH_HOME);
    };

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep splash until we know the destination.
  // Hide after navigation can commit (2 RAFs avoids a blank frame on some devices).
  useEffect(() => {
    if (!href) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    });
  }, [href]);

  // While deciding: render nothing (splash stays visible)
  if (!href) return null;

  // This screen is the ONLY thing that renders initially, so auth can’t flicker.
  return <Redirect href={href} />;
}
