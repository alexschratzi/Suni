import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {PixelRatio, StyleSheet, Text, View} from "react-native";
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

dayjs.locale("de");

type Ev = {
    id: string;
    title: string;
    start: { dateTime: string };
    end: { dateTime: string };
    color?: string;
};

const SNAP_TO_MINUTE = 60;
const DEFAULT_EVENT_DURATION_MIN = 60;

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
            dayBarBorderColor: "transparent",
            dayName: {fontWeight: "700", fontSize: 12, textAlign: "center"},
            dayNumber: {fontWeight: "700", fontSize: 12, textAlign: "center"},
            hourTextStyle: {
                fontSize: 12,
                color: "#6b7280",
                fontWeight: "600",
                textAlign: "right",
                marginTop: 6,
            },
            eventContainerStyle: {borderRadius: 8},
            eventTitleStyle: {fontSize: 12, fontWeight: "600"},
            minimumEventHeight: 16,
        }),
        []
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

    const renderDayItem = useCallback(({dateUnix}: { dateUnix: number }) => {
        const date = new Date(dateUnix);
        const dayLabel = dayjs(date).format("dd"); // Mo, Di, Mi ...
        const dayNum = dayjs(date).format("D");    // 6, 7, 8 ...

        return (
            <View style={{alignItems: "center"}}>
                <Text
                    style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: "#111827", // normaler Text, kein Kreis
                    }}
                >
                    {`${dayLabel} ${dayNum}`}
                </Text>
            </View>
        );
    }, []);

    return (
        <View style={styles.root} onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}>
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

                theme={theme}
            >
                {/* measure everything above the grid that calendar renders (header + all-day) */}
                <View onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}>
                    <CalendarHeader renderDayItem={renderDayItem} dayBarHeight={22}/>
                </View>
                <CalendarBody
                    renderCustomHorizontalLine={renderHourOnlyLine}
                    hourFormat="H"

                />
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
    return (
        <View
            pointerEvents="none"
            style={{height: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderColor}}
        />
    );
};

/* ---------------------- Styles ---------------------- */
const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: "#fff"},
});
