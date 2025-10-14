import type { DeepPartial, ThemeConfigs } from "@howljs/calendar-kit";
import { StyleSheet } from "react-native";

export function mapPaperToCalendarTheme(paper: any): DeepPartial<ThemeConfigs> {
  const isDark = paper?.dark === true;
  return {
    colors: {
      primary: paper.colors.primary,
      onPrimary: paper.colors.onPrimary,
      background: paper.colors.background,
      onBackground: paper.colors.onBackground ?? paper.colors.onSurface,
      border: paper.colors.outlineVariant ?? paper.colors.outline,
      text: paper.colors.onSurface,
      surface: paper.colors.surface,
      onSurface: paper.colors.onSurface,
    },
    textStyle: { color: paper.colors.onSurface, fontSize: 12 },
    headerBackgroundColor: paper.colors.surface,
    headerBorderColor: paper.colors.outlineVariant ?? paper.colors.outline,
    dayBarBorderColor: "transparent",
    hourBackgroundColor: paper.colors.surface,
    hourBorderColor: paper.colors.outlineVariant ?? paper.colors.outline,
    hourTextStyle: {
      fontSize: 12,
      color: paper.colors.onSurfaceVariant,
      fontWeight: "600",
      textAlign: "right",
      marginTop: 6,
    },
    dayName: {
      fontWeight: "700",
      fontSize: 12,
      textAlign: "center",
      color: paper.colors.onSurfaceVariant,
    },
    dayNumber: {
      fontWeight: "700",
      fontSize: 12,
      textAlign: "center",
      color: paper.colors.onSurface,
    },
    eventContainerStyle: {
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    },
    eventTitleStyle: { fontSize: 12, fontWeight: "600", color: paper.colors.onPrimary },
    nowIndicatorColor: paper.colors.primary,
    outOfRangeBackgroundColor: isDark ? "#0b0b0b" : "#fafafa",
    unavailableHourBackgroundColor: paper.colors.surface,
  };
}
