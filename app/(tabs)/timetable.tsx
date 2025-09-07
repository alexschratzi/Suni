import * as Calendar from "expo-calendar";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Appbar, Provider as PaperProvider, Surface } from "react-native-paper";

// ⬇️ NEW: Big Calendar
import "dayjs/locale/de"; // enable German locale in Big Calendar
import { TouchableOpacity } from "react-native";
import { Calendar as BigCalendar, CalendarTouchableOpacityProps, ICalendarEventBase } from "react-native-big-calendar";

/**
 * CONFIG — tweak as you like
 */
const SUBSCRIBED_TYPES: Calendar.CalendarType[] = [
  Calendar.CalendarType.SUBSCRIBED,
  Calendar.CalendarType.LOCAL,
  Calendar.CalendarType.CALDAV,
];

// Extra data you want to render inside events
type EventMeta = {
  calendarId: string;
  calendarTitle?: string;
  location?: string;
  notes?: string;
  color?: string;
  id: string;
};

// BigCalendar event shape
type CalEvent = ICalendarEventBase & EventMeta;

export default function TimetableScreen() {
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [calendars, setCalendars] = useState<Calendar.Calendar[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [calHeight, setCalHeight] = useState<number>(Math.round(Dimensions.get("window").height * 0.7));

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        const granted = status === "granted";
        setPermissionGranted(granted);
        if (!granted) {
          setLoading(false);
          return;
        }
        const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const allowed = all.filter(
          (c) =>
            SUBSCRIBED_TYPES.includes(c.source?.type as any) ||
            SUBSCRIBED_TYPES.includes(c.type as any)
        );
        setCalendars(allowed);
      } catch (e: any) {
        Alert.alert("Kalender-Fehler", e?.message ?? "Unbekannter Fehler.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadEvents = useCallback(
    async (startOfWeek: Date) => {
      if (!permissionGranted || calendars.length === 0) {
        setEvents([]);
        return;
      }
      const from = new Date(startOfWeek);
      const to = new Date(startOfWeek);
      to.setDate(to.getDate() + 5); // Monday..Friday (Saturday exclusive)

      try {
        const byCal = await Promise.all(
          calendars.map(async (cal) => {
            const items = await Calendar.getEventsAsync([cal.id], from, to);
            return items.map<CalEvent>((ev) => ({
              calendarId: String(cal.id),
              calendarTitle: cal.title,
              title: ev.title ?? "(Ohne Titel)",
              start: new Date(ev.startDate),
              end: new Date(ev.endDate),
              location: ev.location ?? "",
              notes: ev.notes ?? "",
              color: cal.color as string | undefined,
              id: String(ev.id),
            }));
          })
        );
        const flat = ([] as CalEvent[]).concat(...byCal);

        // Clip to 07–23 and Mon–Fri
        const segments = flat.flatMap(clipToWindow(7, 23));
        const filtered = segments.filter((seg) => {
          const dow = seg.start.getDay(); // 1..5 = Mon..Fri
          return dow >= 1 && dow <= 5;
        });

        setEvents(filtered);
      } catch (e: any) {
        Alert.alert("Fehler beim Laden von Terminen", e?.message ?? "Unbekannter Fehler.");
        setEvents([]);
      }
    },
    [permissionGranted, calendars]
  );

  useEffect(() => {
    reloadEvents(weekStart);
  }, [weekStart, calendars, reloadEvents]);

  const titleRange = formatWeekRangeLabel(weekStart);

  const goPrevWeek = () => {
    setWeekStart((prev) => getMonday(addDays(prev, -7)));
  };
  const goNextWeek = () => {
    setWeekStart((prev) => getMonday(addDays(prev, 7)));
  };
  const goToday = () => setWeekStart(getMonday(new Date()));

  const onSwipeEnd = (d: Date) => {
    // Big Calendar fires with a date inside the new visible range
    setWeekStart(getMonday(d));
  };

  const onCalendarLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) setCalHeight(Math.round(height));
  };

  if (loading) {
    return (
      <PaperProvider>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Kalender wird geladen…</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!permissionGranted) {
    return (
      <PaperProvider>
        <View style={styles.center}>
          <Text style={styles.heading}>📅 Dein Stundenplan</Text>
          <Text>Bitte erlaube den Zugriff auf Kalender in den Systemeinstellungen.</Text>
        </View>
      </PaperProvider>
    );
  }

  return (
  <PaperProvider>
    <View style={styles.root}>
      {/* TOP APP BAR */}
      <Appbar.Header mode="center-aligned" elevated>
        <Appbar.Action icon="chevron-left" onPress={goPrevWeek} />
        <Appbar.Content title={titleRange} />
        <Appbar.Action icon="calendar-today" onPress={goToday} />
        <Appbar.Action icon="chevron-right" onPress={goNextWeek} />
      </Appbar.Header>

      {/* CONTENT CARD */}
      <Surface style={styles.surface} elevation={1} onLayout={onCalendarLayout}>
        <View style={styles.surfaceInner}>
          <Text style={styles.sub}>Montag–Freitag, 07:00–23:00</Text>

          {/* BIG CALENDAR */}
          <View style={styles.calendarWrap}>
            <BigCalendar<CalEvent>
              events={events}
              height={calHeight}
              mode="week"
              minHour={7}
              maxHour={23}
              weekStartsOn={1}
              weekEndsOn={5}
              date={weekStart}
              swipeEnabled
              onSwipeEnd={onSwipeEnd}
              locale="de"

              /* styles */
              hourStyle={styles.hourText}
              headerContainerStyle={styles.headerRow}
              dayHeaderStyle={styles.headerCell}
              calendarContainerStyle={styles.calendarContainer}
              bodyContainerStyle={styles.gridBody}

              /* optional: tweak header text via theme’s typography */
              theme={{
                typography: {
                  sm: { fontWeight: "700", fontSize: 12, letterSpacing: 0.5, textAlign: "center" },
                },
              }}

              renderEvent={renderEventBlock}
              overlapOffset={8}
            />
          </View>
        </View>
      </Surface>
    </View>
  </PaperProvider>
  );

}

/** ---------- Helpers ---------- */
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();                     // 0..6
  const diff = (day === 0 ? -6 : 1) - day;    // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Label like: "09.–13. Sep 2025" (DE style; adjusts month/year boundaries gracefully)
function formatWeekRangeLabel(monday: Date) {
  const start = new Date(monday);
  const end = new Date(monday);
  end.setDate(end.getDate() + 4); // Friday

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "short", year: "numeric" }).format(d);

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const dayStart = new Intl.DateTimeFormat("de-AT", { day: "2-digit" }).format(start);
    const dayEnd = new Intl.DateTimeFormat("de-AT", { day: "2-digit" }).format(end);
    const monthYear = new Intl.DateTimeFormat("de-AT", { month: "short", year: "numeric" }).format(end);
    return `${dayStart}.–${dayEnd}. ${monthYear}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function clipToWindow(windowStartHour: number, windowEndHour: number) {
  return (e: CalEvent) => {
    const s = new Date(e.start);
    const t = new Date(e.end);
    const chunks: CalEvent[] = [];
    let cursor = new Date(s);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= t) {
      const dayStart = new Date(cursor);
      const dayEnd = new Date(cursor);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const clipStart = new Date(dayStart);
      clipStart.setHours(windowStartHour, 0, 0, 0);

      const clipEnd = new Date(dayStart);
      clipEnd.setHours(windowEndHour, 0, 0, 0);

      const segStart = maxDate(s, clipStart);
      const segEnd = minDate(t, clipEnd);

      if (segEnd > segStart) {
        chunks.push({
          ...e,
          start: segStart,
          end: segEnd,
        });
      }

      cursor = dayEnd;
    }

    return chunks;
  };
}

function maxDate(a: Date, b: Date) { return a > b ? a : b; }
function minDate(a: Date, b: Date) { return a < b ? a : b; }

// Custom event cell (styled like your WeekView EventComponent)
function renderEventBlock(
  event: CalEvent,
  touchableOpacityProps: CalendarTouchableOpacityProps
) {
  // ⬅️ Remove "key" so it isn’t spread into JSX
  const { key: _ignoreKey, style, ...rest } = touchableOpacityProps as any;

  const bg = event.color || autoColor(event.calendarId);
  return (
    <TouchableOpacity {...rest} style={[{ flex: 1 }, style]}>
      <View style={[styles.event /* , { backgroundColor: bg } */]}>
        <Text style={[styles.eventTitle]} numberOfLines={2}>
          {event.title}
        </Text>
        {!!event.location && (
          <Text style={styles.eventSub} numberOfLines={1}>{event.location}</Text>
        )}
        {!!event.calendarTitle && (
          <Text style={styles.eventBadge} numberOfLines={1}>{event.calendarTitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}


// Fallback color if calendar doesn't provide one
function autoColor(key: string) {
  const palette = ["#d97706", "#059669", "#2563eb", "#7c3aed", "#ea580c", "#16a34a", "#0369a1", "#be185d"];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % palette.length;
  return palette[idx];
}

/** ---------- Styles ---------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f7f7f9" },
  surface: {
    flex: 1,
    margin: 12,
    borderRadius: 12,
    //overflow: "hidden",
    backgroundColor: "#fff",
  },
  surfaceInner: {
    flex: 1,
    borderRadius: 12,          // same radius as Surface
    overflow: "hidden",        // ✅ clip child content here instead
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  heading: { fontSize: 24, fontWeight: "bold", marginHorizontal: 16, marginBottom: 4 },
  sub: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, color: "#666" },
  calendarWrap: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#eee" },

  // Big Calendar containers
  calendarContainer: { backgroundColor: "#fff" },
  gridBody: { borderColor: "#f1f1f1" },

  // Header row (week days)
  headerRow: {
    backgroundColor: "#fafafa",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eaeaea",
  },
  headerCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  headerText: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 12,
    color: "#222",
  },

  // Hour column & grid
  hourText: { color: "#6b7280", fontSize: 11 },

  // Event block
  event: { padding: 6 },
  eventTitle: { fontWeight: "600", fontSize: 12, color: "#111" },
  eventSub: { fontSize: 10, color: "#333", opacity: 0.75 },
  eventBadge: { fontSize: 9, marginTop: 2, color: "#111", opacity: 0.6 },
});
