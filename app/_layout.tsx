// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, Redirect } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase"; // Pfad: app/firebase.ts -> ggf. "../firebase" wenn du anders liegst

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ❗️Redirects AUSFÜHREN, ABER den Stack TROTZDEM IMMER registrieren
  return (
    <>
      {!user && <Redirect href="/(auth)" />}
      {user && <Redirect href="/(drawer)/(tabs)/news" />}

      <Stack screenOptions={{ headerShown: false }}>
        {/* Gruppen IMMER registrieren → verhindert die gelbe Warnung */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
