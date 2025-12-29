// app/(app)/(stack)/logout.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Logout failed:", err);
      } finally {
        if (alive) router.replace("/(auth)");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
