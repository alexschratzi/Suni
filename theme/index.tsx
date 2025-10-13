// theme/index.tsx
import * as React from "react";
import {useColorScheme} from "react-native";
import {adaptNavigationTheme, MD3DarkTheme, MD3LightTheme, MD3Theme, PaperProvider,} from "react-native-paper";
import {
    DarkTheme as NavigationDarkTheme,
    DefaultTheme as NavigationDefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";

// --- Build matching Navigation themes from Paper themes ---
const {LightTheme: NavLight, DarkTheme: NavDark} = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
    materialLight: MD3LightTheme,
    materialDark: MD3DarkTheme,
});

// --- Export static theme objects (usable anywhere) ---
export const lightTheme = MD3LightTheme;
export const darkTheme = MD3DarkTheme;

// --- Helper: get current Paper theme based on system scheme ---
export function getCurrentTheme(): MD3Theme {
    const colorScheme =
        typeof window !== "undefined" && window.matchMedia
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light")
            : "light";
    return colorScheme === "dark" ? darkTheme : lightTheme;
}

// --- React provider for use inside components ---
export function AppThemeProvider({children}: { children: React.ReactNode }) {
    const scheme = useColorScheme(); // "light" | "dark"
    const paperTheme = scheme === "dark" ? darkTheme : lightTheme;
    const navTheme = scheme === "dark" ? NavDark : NavLight;

    return (
        <PaperProvider theme={paperTheme}>
            <NavigationThemeProvider value={navTheme}>
                {children}
            </NavigationThemeProvider>
        </PaperProvider>
    );
}
