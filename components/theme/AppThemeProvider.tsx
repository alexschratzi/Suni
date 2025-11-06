// components/theme/AppThemeProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
} from "react-native-paper";

export type ThemeMode = "light" | "dark" | "system";

type AppThemeContextValue = {
  mode: ThemeMode;                      // gewählte Einstellung
  effectiveMode: "light" | "dark";      // tatsächlich aktiv
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "@suni:themeMode";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined
);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );

  // gespeicherte Wahl laden
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setMode(saved);
        } else {
          setMode("system");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // auf Systemänderungen reagieren
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => sub.remove();
  }, []);

  // Einstellung speichern
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, mode);
      } catch {}
    })();
  }, [mode]);

  const effectiveMode: "light" | "dark" =
    mode === "system" ? systemScheme : mode;

  const paperTheme = useMemo(() => {
    const base = effectiveMode === "dark" ? MD3DarkTheme : MD3LightTheme;
    return { ...base };
  }, [effectiveMode]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      effectiveMode,
      isDark: effectiveMode === "dark",
      setMode,
      toggleTheme: () =>
        setMode((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [mode, effectiveMode]
  );

  return (
    <AppThemeContext.Provider value={value}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx)
    throw new Error("useAppTheme must be used within <AppThemeProvider/>");
  return ctx;
}
