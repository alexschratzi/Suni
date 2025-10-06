import React, { useEffect, useMemo, useRef, useState } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";
import type {
  CalendarKitHandle,
  DateOrDateTime,
  DeepPartial,
  OnCreateEventResponse,
  ThemeConfigs,
} from "@howljs/calendar-kit";
import { CalendarBody, CalendarContainer, CalendarHeader } from "@howljs/calendar-kit";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import "dayjs/locale/de";

type Ev = {
  id: string;
  title: string;
  start: { dateTime: string };
  end: { dateTime: string };
  color?: string;
};

const MIN_H = 7;
const MAX_H = 24;

export default function TimetableScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<Ev[]>([]);

  // measure: outer calendar area (below any custom header you might add)
  const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
  // measure: internal Calendar header block (CalendarHeader + all-day row)
  const [headerBlockH, setHeaderBlockH] = useState(0);

  const calendarRef = useRef<CalendarKitHandle>(null);

  const theme = useMemo<DeepPartial<ThemeConfigs>>(
    () => ({
      headerBackgroundColor: "#fafafa",
      headerBorderColor: "#eaeaea",
      dayName: { fontWeight: "700", fontSize: 12, textAlign: "center" },
      dayNumber: { fontWeight: "700", fontSize: 12, textAlign: "center" },
      hourTextStyle: { fontSize: 11, color: "#6b7280" },
      eventContainerStyle: { borderRadius: 8 },
      eventTitleStyle: { fontSize: 12, fontWeight: "600" },
      minimumEventHeight: 16,
    }),
    []
  );

  const onCreate = (ev: OnCreateEventResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    addEvent(toISO(ev.start), toISO(ev.end));
  };

  const onPressBg = (v: DateOrDateTime) => {
    Haptics.selectionAsync().catch(() => {});
    const s = toDate(v);
    const e = new Date(s.getTime() + 30 * 60 * 1000);
    addEvent(s.toISOString(), e.toISOString());
  };

  const addEvent = (startISO: string, endISO: string) =>
    setEvents((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2),
        title: "Neuer Termin",
        start: { dateTime: startISO },
        end: { dateTime: endISO },
        color: "#2563eb",
      },
    ]);

  // Wochenanker (Montag dieser Woche) + Offset
  const weekStart = useMemo(() => addWeeks(getMonday(new Date()), weekOffset), [weekOffset]);

  const startISO = fmtYMD(weekStart);
  const endISO = fmtYMD(addDays(weekStart, 6));

  // visible time range + grid interval
  const startMinutes = MIN_H * 60;
  const endMinutes = MAX_H * 60;
  const timeInterval = 60; // minutes per row
  const spaceFromTop = 0;
  const spaceFromBottom = 0;

  // compute exact interval height from measured space
  const desiredIntervalHeight = useMemo(() => {
    if (!calendarAreaH) return undefined;
    const usableH = Math.max(0, calendarAreaH - headerBlockH - spaceFromTop - spaceFromBottom);
    const totalMinutes = Math.max(1, endMinutes - startMinutes);
    const raw = (usableH / totalMinutes) * timeInterval;
    return PixelRatio.roundToNearestPixel(raw);
  }, [calendarAreaH, headerBlockH, startMinutes, endMinutes, timeInterval, spaceFromTop, spaceFromBottom]);

  // lock with runtime zoom too
  useEffect(() => {
    if (desiredIntervalHeight && calendarRef.current?.zoom) {
      calendarRef.current.zoom({ height: desiredIntervalHeight });
    }
  }, [desiredIntervalHeight]);

  return (
    <View style={styles.root} onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}>
      <CalendarContainer
        ref={calendarRef}
        numberOfDays={7}
        scrollByDay={false}
        firstDay={1}
        scrollToNow={false}
        spaceFromTop={spaceFromTop}
        spaceFromBottom={spaceFromBottom}
        allowHorizontalSwipe={false}
        allowPinchToZoom={false}
        initialDate={startISO}
        minDate={startISO}
        maxDate={endISO}
        start={startMinutes}
        end={endMinutes}
        timeInterval={timeInterval}
        // lock exact fit
        initialTimeIntervalHeight={desiredIntervalHeight}
        minTimeIntervalHeight={desiredIntervalHeight}
        maxTimeIntervalHeight={desiredIntervalHeight}
        allowDragToCreate
        defaultDuration={30}
        dragStep={15}
        useHaptic
        onDragCreateEventEnd={onCreate}
        onPressBackground={onPressBg}
        events={events}
        locale="de"
        theme={theme}
      >
        {/* measure everything above the grid that calendar renders (header + all-day) */}
        <View onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}>
          <CalendarHeader />
        </View>
        <CalendarBody />
      </CalendarContainer>
    </View>
  );
}

/* ---------------------- Utils ---------------------- */
function getMonday(d: Date) {
  const day = d.getDay(); // So=0, Mo=1 ...
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

const addWeeks = (base: Date, w: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + w * 7);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (base: Date, n: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};
const fmtYMD = (d: Date) => dayjs(d).format("YYYY-MM-DD");

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
});
