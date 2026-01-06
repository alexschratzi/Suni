// src/timetable/utils/theme/partyTheme.ts
import type { MD3Theme } from "react-native-paper";
import type { DeepPartial, ThemeConfigs } from "@howljs/calendar-kit";

export type PartyNavColors = {
  bg: string;
  surface: string;
  outline: string;
  primary: string;
};

export function makePartyPaperTheme(paper: MD3Theme): MD3Theme {
  const isDark = paper.dark;

  const bg = isDark ? "#1a0b0b" : "#fff1f2";
  const surface = isDark ? "#241010" : "#ffe4e6";
  const surfaceVariant = isDark ? "#2d1414" : "#fecdd3";
  const outline = isDark ? "#7f1d1d" : "#fb7185";
  const primary = isDark ? "#fb7185" : "#be123c";

  return {
    ...paper,
    colors: {
      ...paper.colors,
      background: bg,
      surface,
      surfaceVariant: surfaceVariant as any,
      outline,
      outlineVariant: outline as any,
      primary,
      onPrimary: isDark ? "#000000" : "#ffffff",
    } as any,
  };
}

export function makePartyCalendarOverrides(paper: MD3Theme): DeepPartial<ThemeConfigs> {
  const isDark = paper.dark;

  const bg = isDark ? "#1a0b0b" : "#fff1f2";
  const surface = isDark ? "#241010" : "#ffe4e6";
  const border = isDark ? "rgba(251,113,133,0.35)" : "rgba(190,18,60,0.25)";
  const primary = isDark ? "#fb7185" : "#be123c";

  return {
    colors: {
      background: bg,
      onBackground: paper.colors.onSurface,
      surface,
      onSurface: paper.colors.onSurface,
      border,
      text: paper.colors.onSurface,
      primary,
      onPrimary: isDark ? "#000000" : "#ffffff",
    },
    headerBackgroundColor: surface,
    headerBorderColor: border,
    hourBackgroundColor: surface,
    hourBorderColor: border,
    outOfRangeBackgroundColor: bg,
    nowIndicatorColor: primary,
    eventContainerStyle: { borderColor: border },
  };
}

export function makePartyNavColors(theme: MD3Theme): PartyNavColors {
  const isDark = theme.dark;
  return {
    bg: isDark ? "#1a0b0b" : "#fff1f2",
    surface: isDark ? "#241010" : "#ffe4e6",
    outline: isDark ? "#7f1d1d" : "#fb7185",
    primary: isDark ? "#fb7185" : "#be123c",
  };
}

export function makePartyHeaderBg(theme: MD3Theme) {
  const isDark = theme.dark;
  return isDark ? "#241010" : "#ffe4e6";
}
