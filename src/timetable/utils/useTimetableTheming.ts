// src/timetable/theme/useTimetableTheming.ts
import * as React from "react";
import { StyleSheet } from "react-native";
import type { DeepPartial, ThemeConfigs } from "@howljs/calendar-kit";
import type { MD3Theme } from "react-native-paper";

import { mapPaperToCalendarTheme } from "@/src/timetable/utils/mapPaperToCalendarTheme";
import type { TimetableDisplayMode } from "@/src/timetable/utils/mode";
import {
  makePartyCalendarOverrides,
  makePartyHeaderBg,
  makePartyNavColors,
  makePartyPaperTheme,
} from "@/src/timetable/utils/partyTheme";

export function useTimetableTheming(appTheme: MD3Theme, mode: TimetableDisplayMode) {
  const isParty = mode === "party";

  // ✅ Screen-local Paper theme
  const screenPaperTheme = React.useMemo(() => {
    return isParty ? makePartyPaperTheme(appTheme) : appTheme;
  }, [appTheme, isParty]);

  // ✅ CalendarKit theme derived from *screen* theme
  const baseCalendarTheme = React.useMemo<DeepPartial<ThemeConfigs>>(
    () => mapPaperToCalendarTheme(screenPaperTheme),
    [screenPaperTheme],
  );

  const calendarTheme = React.useMemo<DeepPartial<ThemeConfigs>>(() => {
    if (!isParty) return baseCalendarTheme;

    const party = makePartyCalendarOverrides(screenPaperTheme);

    return {
      ...baseCalendarTheme,
      ...party,
      colors: {
        ...(baseCalendarTheme.colors ?? {}),
        ...(party.colors ?? {}),
      },
    };
  }, [baseCalendarTheme, isParty, screenPaperTheme]);

  // ✅ Tab bar styles (ONLY to be applied on timetable tab screen options)
  const nav = React.useMemo(() => {
    if (!isParty) return null;
    return makePartyNavColors(appTheme);
  }, [appTheme, isParty]);

  const baseTabBarStyle = React.useMemo(
    () => ({
      backgroundColor: appTheme.colors.surface,
      borderTopColor: appTheme.colors.outlineVariant,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 90,
      paddingBottom: 10,
      paddingTop: 5,
    }),
    [appTheme],
  );

  const partyTabBarStyle = React.useMemo(() => {
    if (!nav) return null;
    return {
      ...baseTabBarStyle,
      backgroundColor: nav.surface,
      borderTopColor: nav.outline,
    };
  }, [baseTabBarStyle, nav]);

  // ✅ Header background (ONLY while timetable is focused)
  const partyHeaderBg = React.useMemo(() => makePartyHeaderBg(appTheme), [appTheme]);

  return {
    isParty,
    screenPaperTheme,
    calendarTheme,

    // nav/tab-bar helpers
    nav,
    baseTabBarStyle,
    partyTabBarStyle,

    // header helper
    partyHeaderBg,
  };
}
