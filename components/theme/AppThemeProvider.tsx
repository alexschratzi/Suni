// components/theme/AppThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";

type ThemeMode = "light" | "dark";

type AppThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "@suni:themeMode";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  // Standard: Systempräferenz als Startwert
  const systemIsDark = Appearance.getColorScheme() === "dark";
  const [mode, setMode] = useState<ThemeMode>(systemIsDark ? "dark" : "light");

  // Persistenz laden
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setMode(saved);
        }
      } catch {}
    })();
  }, []);

  // Persistenz speichern
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, mode);
      } catch {}
    })();
  }, [mode]);

  const paperTheme = useMemo(() => {
    const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
    // ⚠️ Hier KEINE harten Farben setzen, damit dein bestehendes Design/Theming erhalten bleibt.
    // Optional: Customizations hier einfügen, z. B. runde Ecken, eigene Farben etc.
    return {
      ...base,
    };
  }, [mode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode: (m) => setMode(m),
      toggleTheme: () => setMode((m) => (m === "dark" ? "light" : "dark")),
    }),
    [mode]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within <AppThemeProvider/>");
  return ctx;
}
