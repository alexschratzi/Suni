// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AppThemeProvider } from "../components/theme/AppThemeProvider";
import "../i18n/i18n";

// Keep splash up until app/index.tsx decides where to go.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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
