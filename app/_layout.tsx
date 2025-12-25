// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

import { auth, db } from "../firebase"; // adjust if your exports differ
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  // Ensure user document exists / has default arrays
  useEffect(() => {
    if (!user) return;
    if (provisioning) return;

    setProvisioning(true);

    const ensureUserDoc = async () => {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        const defaults = {
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
        };

        if (!snap.exists()) {
          await setDoc(ref, defaults, { merge: true });
        } else {
          const data = snap.data() as any;

          // Fill missing arrays/fields without overwriting existing values
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
  }, [user?.uid, provisioning]);

  // Navigation reacts to changes of user/route segments
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
