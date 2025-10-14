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

dayjs.locale("de");

type Ev = {
    id: string;
    title: string;
    start: { dateTime: string };
    end: { dateTime: string };
    color?: string;
};
//todo: make events follow theme (dark/light mode)

const SNAP_TO_MINUTE = 60;
const DEFAULT_EVENT_DURATION_MIN = 60;
const MIN_H = 7;
const MAX_H = 24;

export default function TimetableScreen() {
    const paper = useTheme();                     // ← current Paper theme
    const isDark = (paper as any).dark === true;  // MD3 themes expose .dark

    const [weekOffset, setWeekOffset] = useState(0);
    const [events, setEvents] = useState<Ev[]>([]);

    // measure: outer calendar area (below any custom header you might add)
    const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
    // measure: internal Calendar header block (CalendarHeader + all-day row)
    const [headerBlockH, setHeaderBlockH] = useState(0);

    const calendarRef = useRef<CalendarKitHandle>(null);

    // Map Paper tokens → CalendarKit theme
    const theme = useMemo<DeepPartial<ThemeConfigs>>(
  () => ({
    // ---- NEW: define the colors map explicitly ----
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

    // ---- defaults for all texts (Calendar Body uses this) ----
    textStyle: {
      color: paper.colors.onSurface,
      fontSize: 12,
    },

    // containers / bars
    headerBackgroundColor: paper.colors.surface,
    headerBorderColor: paper.colors.outlineVariant ?? paper.colors.outline,
    dayBarBorderColor: "transparent",

    // hour column (this is the bit you’re seeing not themed)
    hourBackgroundColor: paper.colors.surface,             // ← important
    hourBorderColor: paper.colors.outlineVariant ?? paper.colors.outline,
    hourTextStyle: {
      fontSize: 12,
      color: paper.colors.onSurfaceVariant,
      fontWeight: "600",
      textAlign: "right",
      marginTop: 6,
    },

    // day labels
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

    // events
    eventContainerStyle: {
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    },
    eventTitleStyle: {
      fontSize: 12,
      fontWeight: "600",
      color: paper.colors.onPrimary,
    },
    minimumEventHeight: 16,

    // grid / now line / out-of-range
    lineColor: paper.colors.outlineVariant ?? paper.colors.outline,
    nowIndicatorColor: paper.colors.primary,
    outOfRangeBackgroundColor: isDark ? "#0b0b0b" : "#fafafa",
    unavailableHourBackgroundColor: paper.colors.surface, // optional
  }),
  [paper, isDark]
);

    const onCreate = (ev: OnCreateEventResponse) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        });
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
                color: "#4dabf7", // fixed color light blue
                // color: paper.colors.primary, // follow theme primary color (does not update when theme changes)
            },
        ]);

    // Wochenanker (Montag dieser Woche) + Offset
    const weekStart = useMemo(() => addWeeks(getMonday(new Date()), weekOffset), [weekOffset]);
    const startISO = fmtYMD(weekStart);
    const endISO = fmtYMD(addDays(weekStart, 6));

    // visible time range + grid interval
    const startMinutes = MIN_H * 60;
    const endMinutes = MAX_H * 60;
    const timeInterval = 60;
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
            calendarRef.current.zoom({height: desiredIntervalHeight});
        }
    }, [desiredIntervalHeight]);

    const renderDayItem = useCallback(
        ({dateUnix}: { dateUnix: number }) => {
            const date = new Date(dateUnix);
            const dayLabel = dayjs(date).format("dd"); // Mo, Di, Mi ...
            const dayNum = dayjs(date).format("D");    // 6, 7, 8 ...

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
                            color: paper.colors.onSurface, // ← follow theme
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
            style={[styles.root, {backgroundColor: paper.colors.background}]} // ← follow theme
            onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}
        >
            <CalendarContainer
                ref={calendarRef}
                numberOfDays={7}
                scrollByDay={false}
                firstDay={1}
                locale="de"
                scrollToNow={false}
                spaceFromTop={spaceFromTop}
                spaceFromBottom={spaceFromBottom}
                allowHorizontalSwipe={false}
                allowPinchToZoom={false}
                hourWidth={40}
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
                dragToCreateMode={"date-time"}
                defaultDuration={DEFAULT_EVENT_DURATION_MIN}
                dragStep={SNAP_TO_MINUTE}
                useHaptic={true}
                enableResourceScroll={false}
                onDragCreateEventEnd={onCreate}
                events={events}
                theme={theme} // ← the important line
            >
                {/* measure everything above the grid that calendar renders (header + all-day) */}
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
    // skip 30-min lines (i + 0.5)
    if (!Number.isInteger(index)) return null;
    // remove first line
    if (index === 0) return null;
    // remove last line
    if (index === (MAX_H - MIN_H)) return null;

    // Use Paper's Divider so the line picks up MD3 defaults, but we override the color/height
    return (
        <Divider
            // keep interaction disabled
            pointerEvents="none"
            // emulate a hairline bottom border
            style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: borderColor,
            }}
        />
    );
};

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
    root: {flex: 1},
});
