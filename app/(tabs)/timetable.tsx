// TimetableScreen.tsx — vertical week paging, no horizontal nav, full 07–24 fit, drag-create + haptics
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import PagerView, { PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import {
  CalendarBody,
  CalendarContainer,
  CalendarHeader,
} from "@howljs/calendar-kit";
import type {
  DateOrDateTime,
  OnCreateEventResponse,
  ThemeConfigs,
  DeepPartial,
} from "@howljs/calendar-kit";
import * as Haptics from "expo-haptics"; // npx expo install expo-haptics
import dayjs from "dayjs";
import "dayjs/locale/de";

type Ev = { id: string; title: string; start: { dateTime: string }; end: { dateTime: string }; color?: string };

const MIN_H = 7, MAX_H = 24, HOURS = MAX_H - MIN_H;

/* ---------------------- Screen ---------------------- */
export default function TimetableScreen() {
  const pagerRef = useRef<PagerView>(null);
  const pendingDeltaRef = useRef<0 | -1 | 1>(0);
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = this week
  const [events, setEvents] = useState<Ev[]>([]);

  // Measure available content height (minus header) to fit 07–24 exactly.
  const [containerH, setContainerH] = useState(0);
  const [headerH, setHeaderH] = useState(36);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== containerH) setContainerH(h);
  };
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== headerH) setHeaderH(h);
  };
  const hourH = useMemo(() => {
    if (containerH <= 0) return 0;
    return Math.max(0, (containerH - headerH) / HOURS);
  }, [containerH, headerH]);

  // Stable handlers
  const onCreate = useCallback((ev: OnCreateEventResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const id = String(Math.random());
    setEvents(p => [...p, {
      id,
      title: "Neuer Termin",
      start: { dateTime: toISO(ev.start) },
      end:   { dateTime: toISO(ev.end) },
      color: "#2563eb",
    }]);
  }, []);

  const onPressBg = useCallback((props: DateOrDateTime) => {
    Haptics.selectionAsync().catch(() => {});
    const s = toDate(props), e = new Date(s.getTime() + 30 * 60 * 1000);
    const id = String(Math.random());
    setEvents(p => [...p, {
      id, title: "Neuer Termin",
      start: { dateTime: s.toISOString() },
      end:   { dateTime: e.toISOString() },
      color: "#2563eb",
    }]);
  }, []);

  const theme = useMemo<DeepPartial<ThemeConfigs>>(() => ({
    headerBackgroundColor: "#fafafa",
    headerBorderColor: "#eaeaea",
    dayName: { fontWeight: "700", fontSize: 12, textAlign: "center" },
    dayNumber: { fontWeight: "700", fontSize: 12, textAlign: "center" },
    hourTextStyle: { fontSize: 11, color: "#6b7280" },
    eventContainerStyle: { borderRadius: 8 },
    eventTitleStyle: { fontSize: 12, fontWeight: "600" },
    minimumEventHeight: 16,
  }), []);

  // Vertical week paging: record delta on selection, recenter when idle.
  const currentPageRef = useRef(1);
  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    currentPageRef.current = e.nativeEvent.position; // 0 prev / 1 current / 2 next
  };
  const onPageScrollStateChanged = (state: { nativeEvent: { pageScrollState: string }}) => {
    if (state.nativeEvent.pageScrollState !== "idle") return;
    const pos = currentPageRef.current;
    if (pos === 1) return;
    const delta = (pos === 2 ? 1 : -1) as 1 | -1;
    pendingDeltaRef.current = delta;
    setWeekOffset(w => w + delta);
  };
  useEffect(() => {
    if (pendingDeltaRef.current === 0) return;
    const ref = pagerRef.current;
    requestAnimationFrame(() => ref?.setPageWithoutAnimation(1));
    pendingDeltaRef.current = 0;
    currentPageRef.current = 1;
  }, [weekOffset]);

  // Week anchors derived from a fixed Monday (not from "now" every render)
  const anchorMonday = useMemo(() => getMonday(new Date()), []);
  const startPrev = useMemo(() => addWeeks(anchorMonday, weekOffset - 1), [anchorMonday, weekOffset]);
  const startCurr = useMemo(() => addWeeks(anchorMonday, weekOffset + 0), [anchorMonday, weekOffset]);
  const startNext = useMemo(() => addWeeks(anchorMonday, weekOffset + 1), [anchorMonday, weekOffset]);

  return (
    <View style={styles.root} onLayout={onContainerLayout}>
      <PagerView
        ref={pagerRef}
        style={styles.flex}
        initialPage={1}
        offscreenPageLimit={1}
        orientation="vertical"
        overScrollMode="never"
        onPageSelected={onPageSelected}
        onPageScrollStateChanged={onPageScrollStateChanged}
      >
        <WeekPage
          key="page-0"
          weekStart={startPrev}
          hourH={hourH}
          events={events}
          onCreate={onCreate}
          onPressBg={onPressBg}
          theme={theme}
          onHeaderLayout={onHeaderLayout}
        />
        <WeekPage
          key="page-1"
          weekStart={startCurr}
          hourH={hourH}
          events={events}
          onCreate={onCreate}
          onPressBg={onPressBg}
          theme={theme}
          onHeaderLayout={onHeaderLayout}
        />
        <WeekPage
          key="page-2"
          weekStart={startNext}
          hourH={hourH}
          events={events}
          onCreate={onCreate}
          onPressBg={onPressBg}
          theme={theme}
          onHeaderLayout={onHeaderLayout}
        />
      </PagerView>
    </View>
  );
}

/* ---------------------- Week Page ---------------------- */
type WeekPageProps = {
  weekStart: Date;
  hourH: number;                 // computed exact hour height (0 until measured)
  events: Ev[];
  onCreate: (e: OnCreateEventResponse) => void;
  onPressBg: (d: DateOrDateTime) => void;
  theme: DeepPartial<ThemeConfigs>;
  onHeaderLayout: (e: LayoutChangeEvent) => void;
};

const WeekPage = memo(({ weekStart, hourH, events, onCreate, onPressBg, theme, onHeaderLayout }: WeekPageProps) => {
  const startISO = useMemo(() => fmtYMD(weekStart), [weekStart]);
  const endISO   = useMemo(() => fmtYMD(addDays(weekStart, 6)), [weekStart]);

  // Until we’ve measured container+header, don’t render the body (prevents wrong height flashes)
  const ready = hourH > 0;

  return (
    <View style={styles.flex}>
      <CalendarContainer
        /* CLAMP this week -> horizontal (left/right) navigation is disabled */
        numberOfDays={7}
        scrollByDay={false}
        firstDay={1}
        initialDate={startISO}
        minDate={startISO}
        maxDate={endISO}
        /* EXACT 07–24 window -> no internal vertical scrolling */
        start={MIN_H * 60}
        end={MAX_H * 60}
        timeInterval={60}
        initialTimeIntervalHeight={ready ? hourH : undefined}
        minTimeIntervalHeight={ready ? hourH : undefined}
        maxTimeIntervalHeight={ready ? hourH : undefined}
        spaceFromTop={0}
        spaceFromBottom={0}
        /* drag-create + haptics */
        allowDragToCreate
        defaultDuration={30}
        dragStep={15}
        useHaptic
        onDragCreateEventEnd={onCreate}
        onPressBackground={onPressBg}
        /* data & look */
        events={events}
        locale="de"
        theme={theme}
        /* Prevent accidental internal scroll bounce when not ready */
        isLoading={!ready}
      >
        <View onLayout={onHeaderLayout}>
          <CalendarHeader />
        </View>
        {ready && <CalendarBody />}
      </CalendarContainer>
    </View>
  );
});
WeekPage.displayName = "WeekPage";

/* ---------------------- Utils ---------------------- */
function getMonday(d: Date) {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
const addWeeks = (base: Date, w: number) => { const d = new Date(base); d.setDate(d.getDate() + w * 7); d.setHours(0,0,0,0); return d; };
const addDays  = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); d.setHours(0,0,0,0); return d; };
const fmtYMD   = (d: Date) => dayjs(d).format("YYYY-MM-DD");

function toDate(v: DateOrDateTime | undefined): Date {
  if (!v) return new Date();
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  if ("dateTime" in v) return new Date((v as any).dateTime);
  if ("date" in v) return new Date(String((v as any).date) + "T00:00:00");
  return new Date();
}
const toISO = (v: DateOrDateTime | undefined) => toDate(v).toISOString();

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },
});
