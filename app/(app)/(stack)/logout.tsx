// app/(app)/(stack)/logout.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Logout failed:", err);
      } finally {
        // With the new root guard, unauthenticated users will be forced into /(auth) anyway.
        // Still, doing it explicitly avoids any momentary "stuck" feeling.
        if (!cancelled) router.replace("/(auth)");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
