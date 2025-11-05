// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase"; // ggf. Pfad anpassen
import { AppThemeProvider } from "../components/theme/AppThemeProvider"; // ✅ richtiger Pfad/Name
import { StatusBar } from "expo-status-bar";


export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // 1) Auth-Listener: setzt user & ready bei jeder Änderung
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  // 2) Navigation reagiert auf JEDEN Wechsel von `user` oder route-segment
  useEffect(() => {
    if (!ready) return;

    const inAuth = segments[0] === "(auth)";
    const inDrawer = segments[0] === "(drawer)";

    if (!user && !inAuth) {
      router.replace("/(auth)");
      return;
    }
    if (user && !inDrawer) {
      router.replace("/(drawer)/(tabs)/timetable");
      return;
    }
  }, [ready, user, segments, router]);

  
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
