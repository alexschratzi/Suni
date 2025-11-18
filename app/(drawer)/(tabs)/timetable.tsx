import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PixelRatio, StyleSheet} from "react-native";
import type {
  CalendarKitHandle,
  DateOrDateTime,
  DeepPartial,
  OnCreateEventResponse,
  ThemeConfigs,
} from "@howljs/calendar-kit";
import {CalendarBody, CalendarContainer, CalendarHeader} from "@howljs/calendar-kit";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import "dayjs/locale/de";
import {Divider, Surface, Text, useTheme} from "react-native-paper";
import {Ev} from "@/types/timetable";
import {mapPaperToCalendarTheme} from "@/components/timetable/mapPaperToCalendarTheme";

dayjs.locale("de");

const SNAP_TO_MINUTE = 60;
const DEFAULT_EVENT_DURATION_MIN = 60;
const MIN_H = 7;
const MAX_H = 24;

export default function TimetableScreen() {
  const paper = useTheme();

  // you can still keep this if you want to "jump" to specific weeks later
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<Ev[]>([]);
  const theme = useMemo<DeepPartial<ThemeConfigs>>(
    () => mapPaperToCalendarTheme(paper),
    [paper]
  );

  const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
  const [headerBlockH, setHeaderBlockH] = useState(0);

  const calendarRef = useRef<CalendarKitHandle>(null);

  const onCreate = (ev: OnCreateEventResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    addEvent(toISO(ev.start), toISO(ev.end));
  };

  const addEvent = (startISO: string, endISO: string) =>
    setEvents((p) => [
      ...p,
      {
        id: Math.random().toString(36).slice(2),
        title: "NEW",
        start: {dateTime: startISO},
        end: {dateTime: endISO},
        color: "#4dabf7",
      },
    ]);

  // Monday this week + optional offset
  const baseMonday = getMonday(new Date());
  const weekStart = useMemo(
    () => addWeeks(baseMonday, weekOffset),
    [baseMonday, weekOffset]
  );

  // current week’s "anchor" date
  const initialDate = fmtYMD(weekStart);

  // allow navigation about a year in both directions
  const minDate = fmtYMD(addWeeks(baseMonday, -52));
  const maxDate = fmtYMD(addWeeks(baseMonday, 52));

  // visible time range + grid interval
  const startMinutes = MIN_H * 60;
  const endMinutes = MAX_H * 60;
  const timeInterval = 60;
  const spaceFromTop = 0;
  const spaceFromBottom = 0;

  const desiredIntervalHeight = useMemo(() => {
    if (!calendarAreaH) return undefined;
    const usableH = Math.max(0, calendarAreaH - headerBlockH - spaceFromTop - spaceFromBottom);
    const totalMinutes = Math.max(1, endMinutes - startMinutes);
    const raw = (usableH / totalMinutes) * timeInterval;
    return PixelRatio.roundToNearestPixel(raw);
  }, [calendarAreaH, headerBlockH, startMinutes, endMinutes, timeInterval, spaceFromTop, spaceFromBottom]);

  useEffect(() => {
    if (desiredIntervalHeight && calendarRef.current?.zoom) {
      calendarRef.current.zoom({height: desiredIntervalHeight});
    }
  }, [desiredIntervalHeight]);

  const renderDayItem = useCallback(
    ({dateUnix}: { dateUnix: number }) => {
      const date = new Date(dateUnix);
      const dayLabel = dayjs(date).format("dd");
      const dayNum = dayjs(date).format("D");

      return (
        <Surface
          mode="flat"
          elevation={0}
          style={{alignItems: "center", backgroundColor: "transparent"}}
        >
          <Text
            variant="labelSmall"
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: paper.colors.onSurface,
            }}
          >
            {`${dayLabel} ${dayNum}`}
          </Text>
        </Surface>
      );
    },
    [paper.colors.onSurface]
  );

  return (
    <Surface
      mode="flat"
      elevation={0}
      style={[styles.root, {backgroundColor: paper.colors.background}]}
      onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}
    >
      <CalendarContainer
        ref={calendarRef}
        numberOfDays={7}
        // week paging (not day-by-day) when swiping horizontally
        scrollByDay={false}
        firstDay={1}
        locale="de"
        scrollToNow={false}
        spaceFromTop={spaceFromTop}
        spaceFromBottom={spaceFromBottom}
        // let the library handle horizontal week navigation
        allowHorizontalSwipe={true}
        allowPinchToZoom={false}
        hourWidth={40}
        // week anchor + wide range around it
        initialDate={initialDate}
        minDate={minDate}
        maxDate={maxDate}
        start={startMinutes}
        end={endMinutes}
        timeInterval={timeInterval}
        initialTimeIntervalHeight={desiredIntervalHeight}
        minTimeIntervalHeight={desiredIntervalHeight}
        maxTimeIntervalHeight={desiredIntervalHeight}
        allowDragToCreate
        dragToCreateMode={"date-time"}
        defaultDuration={DEFAULT_EVENT_DURATION_MIN}
        dragStep={SNAP_TO_MINUTE}
        useHaptic={true}
        enableResourceScroll={false}
        onDragCreateEventEnd={onCreate}
        events={events}
        theme={theme}
        // optional: keep track of current visible week in state
        onDateChanged={(iso) => {
          const d = new Date(iso);
          const monday = getMonday(d);
          const diffWeeks =
            Math.round(
              (monday.getTime() - baseMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );
          setWeekOffset(diffWeeks);
        }}
      >
        <Surface
          mode="flat"
          elevation={0}
          onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}
          style={{backgroundColor: "transparent"}}
        >
          <CalendarHeader renderDayItem={renderDayItem} dayBarHeight={22}/>
        </Surface>

        <CalendarBody
          renderCustomHorizontalLine={renderHourOnlyLine}
          hourFormat="H"
        />
      </CalendarContainer>
    </Surface>
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

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  if (typeof v === "object" && v !== null) {
    const obj = v as { dateTime?: string; date?: string };
    if (obj.dateTime) return new Date(obj.dateTime);
    if (obj.date) return new Date(`${obj.date}T00:00:00`);
  }
  return new Date();
}

const toISO = (v: DateOrDateTime | undefined) => toDate(v).toISOString();

const renderHourOnlyLine = ({index, borderColor}: { index: number; borderColor: string }) => {
  if (!Number.isInteger(index)) return null;
  if (index === 0) return null;
  if (index === (MAX_H - MIN_H)) return null;

  return (
    <Divider
      pointerEvents="none"
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: borderColor,
      }}
    />
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
});
