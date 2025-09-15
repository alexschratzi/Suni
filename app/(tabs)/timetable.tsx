import React, {useMemo, useRef, useState} from "react";
import {LayoutChangeEvent, StyleSheet, View} from "react-native";
import PagerView from "react-native-pager-view";
import type {DateOrDateTime, DeepPartial, OnCreateEventResponse, ThemeConfigs,} from "@howljs/calendar-kit";
import {CalendarBody, CalendarContainer, CalendarHeader} from "@howljs/calendar-kit";
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
const HOURS = MAX_H - MIN_H;

/* ---------------------- Screen ---------------------- */
export default function TimetableScreen() {
    const pagerRef = useRef<PagerView>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [events, setEvents] = useState<Ev[]>([]);
    const [hourH, setHourH] = useState<number | undefined>(undefined);

    // Einfach: gesamte Containerhöhe nehmen und auf 07–24 mappen.
    const onLayout = (e: LayoutChangeEvent) => {
        const {height} = e.nativeEvent.layout;
        if (height > 0) setHourH(Math.floor(height / HOURS));
    };

    const theme = useMemo<DeepPartial<ThemeConfigs>>(
        () => ({
            headerBackgroundColor: "#fafafa",
            headerBorderColor: "#eaeaea",
            dayName: {fontWeight: "700", fontSize: 12, textAlign: "center"},
            dayNumber: {fontWeight: "700", fontSize: 12, textAlign: "center"},
            hourTextStyle: {fontSize: 11, color: "#6b7280"},
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

    const onPressBg = (v: DateOrDateTime) => {
        Haptics.selectionAsync().catch(() => {
        });
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
                start: {dateTime: startISO},
                end: {dateTime: endISO},
                color: "#2563eb",
            },
        ]);

    // Wochenanker (Montag dieser Woche) + Offset
    const weekStart = useMemo(() => addWeeks(getMonday(new Date()), weekOffset), [weekOffset]);

    // Pager: 3 Seiten (vorherige/aktuelle/nächste), nach Scrollen wieder auf Mitte setzen.
    const handlePageSelected = (pos: number) => {
        if (pos === 1) return;
        setWeekOffset((w) => w + (pos === 2 ? 1 : -1));
        requestAnimationFrame(() => pagerRef.current?.setPageWithoutAnimation(1));
    };

    return (
        <View style={styles.root} onLayout={onLayout}>
            <PagerView
                ref={pagerRef}
                style={styles.flex}
                initialPage={1}
                offscreenPageLimit={1}
                orientation="vertical"
                overScrollMode="never"
                onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
            >
                {[-1, 0, 1].map((delta) => {
                    const start = addWeeks(weekStart, delta);
                    const startISO = fmtYMD(start);
                    const endISO = fmtYMD(addDays(start, 6));
                    return (
                        <View key={delta} style={styles.flex}>
                            <CalendarContainer
                                numberOfDays={7}
                                scrollByDay={false}
                                firstDay={1}
                                initialDate={startISO}
                                minDate={startISO}
                                maxDate={endISO}
                                start={MIN_H * 60}
                                end={MAX_H * 60}
                                timeInterval={60}
                                initialTimeIntervalHeight={hourH}
                                minTimeIntervalHeight={hourH}
                                maxTimeIntervalHeight={hourH}
                                spaceFromTop={0}
                                spaceFromBottom={0}
                                allowDragToCreate
                                defaultDuration={30}
                                dragStep={15}
                                useHaptic
                                onDragCreateEventEnd={onCreate}
                                onPressBackground={onPressBg}
                                events={events}
                                locale="de"
                                theme={theme}
                                isLoading={!hourH}
                            >
                                <CalendarHeader/>
                                {hourH ? <CalendarBody/> : null}
                            </CalendarContainer>
                        </View>
                    );
                })}
            </PagerView>
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
    root: {flex: 1, backgroundColor: "#fff"},
    flex: {flex: 1},
});
