// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

// Keep splash up until OUR gate screen decides.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // (Optional) nothing else here; splash is controlled in app/index.tsx
  useEffect(() => {}, []);

  return (
    <AppThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none", // IMPORTANT: no slide-in for the first navigation
        }}
      />
    </AppThemeProvider>
  );
}
