// TimetableScreen.tsx — stable vertical week paging (no jump-back), 07–24 exact-fit, no horizontal nav
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import PagerView, {PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import { CalendarBody, CalendarContainer, CalendarHeader } from "@howljs/calendar-kit";
import type { DateOrDateTime, DeepPartial, OnCreateEventResponse, ThemeConfigs } from "@howljs/calendar-kit";
import dayjs from "dayjs"; import "dayjs/locale/de";

type Ev = { id: string; title: string; start: { dateTime: string }; end: { dateTime: string }; color?: string };

const MIN_H = 7, MAX_H = 24, HOURS = MAX_H - MIN_H, HEADER = 36;

export default function TimetableScreen() {
  const pagerRef = useRef<PagerView>(null);
  const currentPageRef = useRef(1);                // last selected page (0 prev / 1 curr / 2 next)
  const anchorMonday = useRef(getMonday(new Date())).current; // fixed anchor: "this Monday" at mount

  const [events, setEvents] = useState<Ev[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // weeks relative to anchor

  // exact-fit hour height so 07–24 fills below header (no vertical overflow)
  const hourH = useMemo(() => {
    const h = Dimensions.get("window").height;
    return Math.max(0, (h - HEADER) / HOURS);
  }, []);

  // stable handlers (avoid Reanimated "reading value during render" warnings)
  const handleCreate = useCallback((ev: OnCreateEventResponse) => {
    const id = String(Math.random());
    setEvents(p => [...p, {
      id, title: "Neuer Termin",
      start: { dateTime: toISO(ev.start) },
      end:   { dateTime: toISO(ev.end) },
      color: "#2563eb",
    }]);
  }, []);
  const handlePressBg = useCallback((props: DateOrDateTime) => {
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
  }), []);

  // STEP A: track which page user landed on; do NOT recenter yet.
  const onPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    currentPageRef.current = e.nativeEvent.position; // 0 / 1 / 2
  };

  // STEP B: when pager becomes idle, apply delta then recenter to middle page.
const onScrollStateChanged = (state: { nativeEvent: { pageScrollState: string } }) => {
  if (state.nativeEvent.pageScrollState !== "idle") return;
  const pos = currentPageRef.current;
  if (pos === 1) return;
  const delta = pos === 2 ? 1 : -1;
  setWeekOffset(prev => prev + delta);
  requestAnimationFrame(() => pagerRef.current?.setPageWithoutAnimation(1));
  currentPageRef.current = 1;
};


  // compute week starts from fixed anchor (never from "now" each render)
  const startPrev = useMemo(() => addWeeks(anchorMonday, weekOffset - 1), [anchorMonday, weekOffset]);
  const startCurr = useMemo(() => addWeeks(anchorMonday, weekOffset + 0), [anchorMonday, weekOffset]);
  const startNext = useMemo(() => addWeeks(anchorMonday, weekOffset + 1), [anchorMonday, weekOffset]);

  return (
    <View style={styles.root}>
      <PagerView
  ref={pagerRef}
  style={styles.flex}
  initialPage={1}
  offscreenPageLimit={1}
  orientation="vertical"
  overScrollMode="never"
  onPageSelected={onPageSelected}
  onPageScrollStateChanged={onScrollStateChanged}
>

        <WeekPage key="page-0" weekStart={startPrev} hourH={hourH} events={events}
          onCreate={handleCreate} onPressBg={handlePressBg} theme={theme} />
        <WeekPage key="page-1" weekStart={startCurr} hourH={hourH} events={events}
          onCreate={handleCreate} onPressBg={handlePressBg} theme={theme} />
        <WeekPage key="page-2" weekStart={startNext} hourH={hourH} events={events}
          onCreate={handleCreate} onPressBg={handlePressBg} theme={theme} />
      </PagerView>
    </View>
  );
}

/* ----- memoized week page (stable props -> no Reanimated warnings) ----- */
type WeekPageProps = {
  weekStart: Date; hourH: number; events: Ev[];
  onCreate: (e: OnCreateEventResponse) => void;
  onPressBg: (d: DateOrDateTime) => void;
  theme: DeepPartial<ThemeConfigs>;
};
const WeekPage = memo(({ weekStart, hourH, events, onCreate, onPressBg, theme }: WeekPageProps) => {
  const startISO = useMemo(() => fmtYMD(weekStart), [weekStart]);
  const endISO   = useMemo(() => fmtYMD(addDays(weekStart, 6)), [weekStart]);

  return (
    <View style={styles.flex}>
      <CalendarContainer
        numberOfDays={7}
        firstDay={1}
        scrollByDay={false}
        /* clamp this calendar strictly to its week -> no horizontal navigation */
        initialDate={startISO}
        minDate={startISO}
        maxDate={endISO}
        /* 07–24 exact-fit */
        start={MIN_H * 60}
        end={MAX_H * 60}
        timeInterval={60}
        initialTimeIntervalHeight={hourH}
        minTimeIntervalHeight={hourH}
        maxTimeIntervalHeight={hourH}
        /* interactions */
        allowDragToCreate
        dragStep={15}
        onDragCreateEventEnd={onCreate}
        onPressBackground={onPressBg}
        /* data & look */
        events={events}
        locale="de"
        theme={theme}
      >
        <CalendarHeader />
        <CalendarBody />
      </CalendarContainer>
    </View>
  );
});
WeekPage.displayName = "WeekPage";

/* ---------- utils (no reliance on “now” except at mount) ---------- */
function getMonday(d: Date) {
  const day = d.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d); m.setDate(m.getDate() + diff); m.setHours(0,0,0,0); return m;
}
const addWeeks = (base: Date, w: number) => { const d = new Date(base); d.setDate(d.getDate() + w * 7); return d; };
const addDays  = (base: Date, n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
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

/* ---------- styles ---------- */
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#fff" }, flex: { flex: 1 } });
