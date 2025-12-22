// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // ggf. Pfad anpassen
import { AppThemeProvider } from "../components/theme/AppThemeProvider"; // ƒo. richtiger Pfad/Name
import { StatusBar } from "expo-status-bar";
import "../i18n/i18n";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  // Auth-Listener: setzt user & ready bei jeder Änderung
  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  // User-Dokument anlegen/auffüllen (leere Arrays), damit Friends/Requests immer "update" sind
  useEffect(() => {
    if (!user) return;
    if (provisioning) return;
    setProvisioning(true);

    const ensureUserDoc = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(
            ref,
            {
              uid: user.uid,
              username: user.displayName ?? "",
              phone: user.phoneNumber ?? "",
              role: "student",
              pendingSent: [],
              pendingReceived: [],
              friends: [],
              blocked: [],
              settings: {
                chatThemeColor: "#9b59b6",
                notifications: {
                  global: true,
                  chat: true,
                  direct: true,
                  mention: true,
                  rooms: true,
                },
              },
            },
            { merge: true }
          );
        } else {
          // Fülle fehlende Arrays/Felder auf, überschreibe bestehende nicht
          const data = snap.data() || {};
          await setDoc(
            ref,
            {
              pendingSent: data.pendingSent ?? [],
              pendingReceived: data.pendingReceived ?? [],
              friends: data.friends ?? [],
              blocked: data.blocked ?? [],
              settings:
                data.settings ??
                {
                  chatThemeColor: "#9b59b6",
                  notifications: {
                    global: true,
                    chat: true,
                    direct: true,
                    mention: true,
                    rooms: true,
                  },
                },
            },
            { merge: true }
          );
        }
      } catch (err) {
        console.warn("ensureUserDoc failed", err);
      } finally {
        setProvisioning(false);
      }
    };

    ensureUserDoc();
  }, [user, provisioning]);

  // Navigation reagiert auf JEDEN Wechsel von `user` oder route-segment
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
