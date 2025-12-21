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
  mode: ThemeMode;                      // ausgewählte Einstellung
  effectiveMode: "light" | "dark";      // tatsächlich aktiv
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
};

const STORAGE_KEY = "@amadeus:themeMode";
const STORAGE_CONTRAST_KEY = "@amadeus:contrast";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(
  undefined
);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );
  const [highContrast, setHighContrast] = useState(false);

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

  // gespeicherten Kontrast laden
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_CONTRAST_KEY);
        if (saved === "true") setHighContrast(true);
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

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          STORAGE_CONTRAST_KEY,
          highContrast ? "true" : "false"
        );
      } catch {}
    })();
  }, [highContrast]);

  const effectiveMode: "light" | "dark" =
    mode === "system" ? systemScheme : mode;

  const paperTheme = useMemo(() => {
    const base = effectiveMode === "dark" ? MD3DarkTheme : MD3LightTheme;
    const contrastColors =
      effectiveMode === "dark"
        ? {
            primary: "#ffd700", // kräftiges Gelb für maximale Sichtbarkeit
            onPrimary: "#000000",
            secondary: "#ffffff",
            onSecondary: "#000000",
            secondaryContainer: "#111111",
            onSecondaryContainer: "#ffffff",
            surface: "#000000",
            onSurface: "#ffffff",
            surfaceVariant: "#111111",
            onSurfaceVariant: "#f1f5f9",
            background: "#000000",
            onBackground: "#ffffff",
            outline: "#ffd700",
            outlineVariant: "#ffd700",
            tertiary: "#8cf0ff",
            onTertiary: "#001b20",
          }
        : {
            primary: "#000000",
            onPrimary: "#ffffff",
            secondary: "#111827",
            onSecondary: "#ffffff",
            secondaryContainer: "#e5e7eb",
            onSecondaryContainer: "#000000",
            surface: "#ffffff",
            onSurface: "#000000",
            surfaceVariant: "#f3f4f6",
            onSurfaceVariant: "#111827",
            background: "#ffffff",
            onBackground: "#000000",
            outline: "#000000",
            outlineVariant: "#111827",
            tertiary: "#0f172a",
            onTertiary: "#ffffff",
          };

    const colors = highContrast ? { ...base.colors, ...contrastColors } : base.colors;
    return { ...base, colors };
  }, [effectiveMode, highContrast]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      effectiveMode,
      isDark: effectiveMode === "dark",
      setMode,
      toggleTheme: () =>
        setMode((prev) => (prev === "dark" ? "light" : "dark")),
      highContrast,
      setHighContrast,
    }),
    [mode, effectiveMode, highContrast]
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
