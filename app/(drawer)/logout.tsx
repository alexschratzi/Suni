// app/(drawer)/logout.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "../../firebase";

export default function LogoutScreen() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await auth.signOut();
      } finally {
        if (active) router.replace("/(auth)");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
