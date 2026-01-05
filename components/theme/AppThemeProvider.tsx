// components/theme/AppThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import {
  Provider as PaperProvider,
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";

export type ThemeMode = "light" | "dark" | "system";
export type TextScale = "small" | "medium" | "large";

type AppThemeContextValue = {
  mode: ThemeMode; // ausgewählte Einstellung
  effectiveMode: "light" | "dark"; // tatsächlich aktiv
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
  textScale: TextScale;
  setTextScale: (v: TextScale) => void;
};

const STORAGE_KEY = "@amadeus:themeMode";
const STORAGE_CONTRAST_KEY = "@amadeus:contrast";
const STORAGE_TEXTSCALE_KEY = "@amadeus:textScale";

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

/**
 * Paper MD3 font tokens are typed such that some entries may not include fontSize/lineHeight.
 * We only scale those that actually have numeric values.
 */
function scaleMd3Fonts<TFonts extends Record<string, any>>(fonts: TFonts, fontScale: number): TFonts {
  // Create a shallow copy preserving keys
  const out: Record<string, any> = { ...fonts };

  for (const key of Object.keys(out)) {
    const token = out[key];

    // Defensive: token can be undefined or not an object in weird cases
    if (!token || typeof token !== "object") continue;

    const hasFontSize = typeof (token as any).fontSize === "number";
    const hasLineHeight = typeof (token as any).lineHeight === "number";

    if (!hasFontSize && !hasLineHeight) continue;

    out[key] = {
      ...token,
      ...(hasFontSize ? { fontSize: Math.round((token as any).fontSize * fontScale) } : null),
      ...(hasLineHeight ? { lineHeight: Math.round((token as any).lineHeight * fontScale) } : null),
    };
  }

  return out as TFonts;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<"light" | "dark">(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );
  const [highContrast, setHighContrast] = useState(false);
  const [textScale, setTextScale] = useState<TextScale>("medium");

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

  // gespeicherte Textgröße laden
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_TEXTSCALE_KEY);
        if (saved === "small" || saved === "medium" || saved === "large") {
          setTextScale(saved);
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

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_CONTRAST_KEY, highContrast ? "true" : "false");
      } catch {}
    })();
  }, [highContrast]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_TEXTSCALE_KEY, textScale);
      } catch {}
    })();
  }, [textScale]);

  const effectiveMode: "light" | "dark" = mode === "system" ? systemScheme : mode;

  const paperTheme = useMemo<MD3Theme>(() => {
    const base = effectiveMode === "dark" ? MD3DarkTheme : MD3LightTheme;

    const contrastColors =
      effectiveMode === "dark"
        ? {
            primary: "#ffd700",
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

    const colors = highContrast ? ({ ...base.colors, ...contrastColors } as MD3Theme["colors"]) : base.colors;

    const fontScale = textScale === "small" ? 0.85 : textScale === "large" ? 1.25 : 1;

    // ✅ Fix: only scale tokens that actually include fontSize/lineHeight
    const fonts = scaleMd3Fonts(base.fonts, fontScale);

    return { ...base, colors, fonts };
  }, [effectiveMode, highContrast, textScale]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      effectiveMode,
      isDark: effectiveMode === "dark",
      setMode,
      toggleTheme: () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
      highContrast,
      setHighContrast,
      textScale,
      setTextScale,
    }),
    [mode, effectiveMode, highContrast, textScale]
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
