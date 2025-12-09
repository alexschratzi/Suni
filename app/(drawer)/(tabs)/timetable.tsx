// app/(drawer)/(tabs)/timetable.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PixelRatio,
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  CalendarBody,
  CalendarContainer,
  CalendarHeader,
} from "@howljs/calendar-kit";
import type {
  CalendarKitHandle,
  DateOrDateTime,
  DeepPartial,
  OnCreateEventResponse,
  OnEventResponse,
  ThemeConfigs,
} from "@howljs/calendar-kit";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import "dayjs/locale/de";
import {
  Button,
  Divider,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Ev } from "@/types/timetable";
import { mapPaperToCalendarTheme } from "@/components/timetable/mapPaperToCalendarTheme";
import {
  getICalSubscriptions,
  getCalendarById,
  saveCalendar,
} from "@/src/server/calendar";
import type { CalendarEntryDTO } from "@/src/dto/calendarDTO";

dayjs.locale("de");

const SNAP_TO_MINUTE = 60;
const DEFAULT_EVENT_DURATION_MIN = 60;
const MIN_H = 7;
const MAX_H = 24;

type EventEditorForm = {
  fullTitle: string;
  titleAbbr: string;
  from: string;
  until: string;
  note: string;
  color: string;
};

type EventSource = "local" | "ical";

type EvWithMeta = Ev & {
  fullTitle?: string;
  titleAbbr?: string;
  isTitleAbbrCustom?: boolean;
  note?: string;
  source?: EventSource;
  icalSubscriptionId?: string;
  icalEventUid?: string;
  metaKey?: string;
};

type ActivePicker = "from" | "until" | null;

const COLOR_OPTIONS = [
  "#4dabf7",
  "#f783ac",
  "#ffd43b",
  "#69db7c",
  "#845ef7",
  "#ffa94d",
];

type ICalSubscription = {
  id: string;
  name: string;
  url: string;
  color: string;
};

type ICalEventMeta = {
  titleAbbr?: string;
  note?: string;
  color?: string;
  isTitleAbbrCustom?: boolean;
};

type RawIcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};

const ICAL_ASYNC_KEY = "ical_subscriptions_v1";
const LOCAL_EVENTS_KEY = "timetable_local_events_v1";
const ICAL_EVENT_META_KEY = "ical_event_meta_v1";

export default function TimetableScreen() {
  const paper = useTheme();
  const router = useRouter();

  const { jumpToToday } = useLocalSearchParams<{ jumpToToday?: string }>();

  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<EvWithMeta[]>([]);
  const theme = useMemo<DeepPartial<ThemeConfigs>>(
    () => mapPaperToCalendarTheme(paper),
    [paper],
  );

  const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
  const [headerBlockH, setHeaderBlockH] = useState(0);

  const calendarRef = useRef<CalendarKitHandle>(null);

  const [editingEvent, setEditingEvent] = useState<EvWithMeta | null>(null);
  const [editorForm, setEditorForm] = useState<EventEditorForm | null>(null);
  const [hasCustomTitleAbbr, setHasCustomTitleAbbr] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const [iCalSyncing, setICalSyncing] = useState(true);
  const [icalMeta, setIcalMeta] = useState<Record<string, ICalEventMeta>>({});

  const userId = "1234"; // TODO: real auth

  /* ------------------------------------------------------------------------ */
  /* Storage helpers                                                          */
  /* ------------------------------------------------------------------------ */

  const saveLocalICalSubscriptions = useCallback(
    async (subs: ICalSubscription[]) => {
      try {
        await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(subs));
      } catch (e) {
        console.warn("Failed to save local iCal subs:", e);
      }
    },
    [],
  );

  const loadLocalEvents = useCallback(async (): Promise<EvWithMeta[]> => {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to load local events:", e);
      return [];
    }
  }, []);

  const saveLocalEvents = useCallback(async (allEvents: EvWithMeta[]) => {
    try {
      const localOnly = allEvents.filter((e) => e.source === "local");
      await AsyncStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(localOnly));
    } catch (e) {
      console.warn("Failed to save local events:", e);
    }
  }, []);

  const loadIcalMeta = useCallback(
    async (): Promise<Record<string, ICalEventMeta>> => {
      try {
        const raw = await AsyncStorage.getItem(ICAL_EVENT_META_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to load iCal event meta:", e);
        return {};
      }
    },
    [],
  );

  const saveIcalMeta = useCallback(
    async (meta: Record<string, ICalEventMeta>) => {
      try {
        await AsyncStorage.setItem(ICAL_EVENT_META_KEY, JSON.stringify(meta));
      } catch (e) {
        console.warn("Failed to save iCal event meta:", e);
      }
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* iCal helpers                                                             */
  /* ------------------------------------------------------------------------ */

  const makeIcalMetaKey = (subscriptionId: string, uid: string) =>
    `${subscriptionId}::${uid}`;

  function parseIcsDate(raw: string): string | null {
    let m = raw.match(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
    );
    if (m) {
      const [, y, mo, d, hh, mm, ss, z] = m;
      const year = Number(y);
      const month = Number(mo) - 1;
      const day = Number(d);
      const hour = Number(hh);
      const minute = Number(mm);
      const second = Number(ss);

      const date = z
        ? new Date(Date.UTC(year, month, day, hour, minute, second))
        : new Date(year, month, day, hour, minute, second);
      return date.toISOString();
    }

    m = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) {
      const [, y, mo, d] = m;
      const year = Number(y);
      const month = Number(mo) - 1;
      const day = Number(d);
      const date = new Date(year, month, day, 0, 0, 0);
      return date.toISOString();
    }

    const fallback = new Date(raw);
    if (!isNaN(fallback.getTime())) {
      return fallback.toISOString();
    }

    return null;
  }

  function parseICS(ics: string): RawIcalEvent[] {
    const unfolded = ics.replace(/\r\n[ \t]/g, "");

    const parts = unfolded.split("BEGIN:VEVENT");
    parts.shift();

    const events: RawIcalEvent[] = [];

    for (const part of parts) {
      const endIdx = part.indexOf("END:VEVENT");
      const body = endIdx === -1 ? part : part.slice(0, endIdx);

      const lines = body.split(/\r?\n/);
      let uid: string | undefined;
      let summary: string | undefined;
      let dtstartRaw: string | undefined;
      let dtendRaw: string | undefined;

      for (const line of lines) {
        if (!line.trim()) continue;
        const [left, right] = line.split(":", 2);
        if (!right) continue;
        const propName = left.split(";")[0].toUpperCase();
        const value = right.trim();

        switch (propName) {
          case "UID":
            uid = value;
            break;
          case "SUMMARY":
            summary = value;
            break;
          case "DTSTART":
            dtstartRaw = value;
            break;
          case "DTEND":
            dtendRaw = value;
            break;
          default:
            break;
        }
      }

      if (!uid || !dtstartRaw || !dtendRaw) continue;
      const startIso = parseIcsDate(dtstartRaw);
      const endIso = parseIcsDate(dtendRaw);
      if (!startIso || !endIso) continue;

      events.push({
        uid,
        summary: summary ?? "",
        start: startIso,
        end: endIso,
      });
    }

    return events;
  }

  async function fetchIcalEventsForSubscription(
    sub: ICalSubscription,
  ): Promise<RawIcalEvent[]> {
    try {
      const res = await fetch(sub.url);
      if (!res.ok) {
        console.warn("Failed to fetch iCal:", sub.url, res.status);
        return [];
      }
      const text = await res.text();
      return parseICS(text);
    } catch (e) {
      console.warn("Error fetching iCal:", sub.url, e);
      return [];
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Calendar DTO <-> Event mapping + server sync                             */
  /* ------------------------------------------------------------------------ */

  function mapDtoToEvent(entry: CalendarEntryDTO): EvWithMeta {
    const fullTitle = entry.title;
    const titleAbbr = entry.title_short || makeTitleAbbr(fullTitle);
    const start = new Date(entry.date);
    const end = new Date(start.getTime() + DEFAULT_EVENT_DURATION_MIN * 60000);

    return {
      id: entry.id,
      title: titleAbbr,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      color: "#4dabf7",
      fullTitle,
      titleAbbr,
      isTitleAbbrCustom: !!entry.title_short,
      source: "local",
    };
  }

  function mapEventToDto(ev: EvWithMeta, userId: string): CalendarEntryDTO {
    const fullTitle = ev.fullTitle || ev.title || "";
    const titleAbbr = ev.titleAbbr || makeTitleAbbr(fullTitle || "Untitled");
    const startIso = toISO(ev.start);
    const startDate = new Date(startIso);

    return {
      id: ev.id,
      user_id: userId,
      title: fullTitle || titleAbbr,
      title_short: titleAbbr,
      date: startDate,
    };
  }

  async function syncLocalEventsToServer(
    allEvents: EvWithMeta[],
    userId: string,
  ) {
    const localEvents = allEvents.filter((e) => e.source === "local");
    const entries = localEvents.map((ev) => mapEventToDto(ev, userId));
    await saveCalendar({ entries });
  }

  /* ------------------------------------------------------------------------ */
  /* iCal + calendar SYNC on screen focus                                     */
  /* ------------------------------------------------------------------------ */

  const syncOnFocus = useCallback(async () => {
    try {
      setICalSyncing(true);

      const storedMeta = await loadIcalMeta();
      setIcalMeta(storedMeta);

      // 1) Read canonical subscriptions from server (no local→server sync)
      const serverSubs = await getICalSubscriptions(userId);
      const normalizedSubs: ICalSubscription[] = serverSubs.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
      }));

      await saveLocalICalSubscriptions(normalizedSubs);

      // 2) Load all local events for user from server
      const serverCalendar = await getCalendarById(1);
      const serverEntriesForUser = serverCalendar.entries.filter(
        (e) => e.user_id === userId,
      );
      const serverLocalEvents: EvWithMeta[] =
        serverEntriesForUser.map(mapDtoToEvent);

      await saveLocalEvents(serverLocalEvents);

      // 3) Fetch ICS events
      let allIcalEvents: EvWithMeta[] = [];

      for (const sub of normalizedSubs) {
        const rawEvents = await fetchIcalEventsForSubscription(sub);

        const mapped: EvWithMeta[] = rawEvents.map((raw) => {
          const metaKey = makeIcalMetaKey(sub.id, raw.uid);
          const meta = storedMeta[metaKey];

          const fullTitle = raw.summary || sub.name;
          const baseAbbr = makeTitleAbbr(fullTitle);

          const color = meta?.color ?? sub.color ?? "#4dabf7";
          const titleAbbr = meta?.titleAbbr ?? baseAbbr;

          return {
            id: metaKey,
            title: titleAbbr,
            start: { dateTime: raw.start },
            end: { dateTime: raw.end },
            color,
            fullTitle,
            titleAbbr,
            note: meta?.note ?? "",
            isTitleAbbrCustom: meta?.isTitleAbbrCustom ?? false,
            source: "ical",
            icalSubscriptionId: sub.id,
            icalEventUid: raw.uid,
            metaKey,
          };
        });

        allIcalEvents = allIcalEvents.concat(mapped);
      }

      const combined: EvWithMeta[] = [...allIcalEvents, ...serverLocalEvents];
      setEvents(combined);
    } catch (e) {
      console.warn("Failed to sync on timetable focus:", e);
      const storedLocalEvents = await loadLocalEvents();
      setEvents(storedLocalEvents);
    } finally {
      setICalSyncing(false);
    }
  }, [
    loadIcalMeta,
    saveLocalICalSubscriptions,
    saveLocalEvents,
    loadLocalEvents,
    userId,
  ]);

  // Run syncOnFocus whenever this screen comes into focus (e.g. after settings)
  useFocusEffect(
    useCallback(() => {
      syncOnFocus();
    }, [syncOnFocus]),
  );

  /* ------------------------------------------------------------------------ */
  /* Existing timetable logic                                                 */
  /* ------------------------------------------------------------------------ */

  const openEditorForEvent = useCallback((ev: EvWithMeta) => {
    const fullTitle = ev.fullTitle ?? ev.title ?? "";
    const autoAbbr = makeTitleAbbr(fullTitle);
    const titleAbbr = ev.titleAbbr ?? autoAbbr;

    setEditingEvent(ev);
    setEditorForm({
      fullTitle,
      titleAbbr,
      from: toISO(ev.start),
      until: toISO(ev.end),
      note: ev.note ?? "",
      color: ev.color ?? "#4dabf7",
    });

    setHasCustomTitleAbbr(ev.isTitleAbbrCustom ?? false);
    setActivePicker(null);
  }, []);

  const onCreate = (ev: OnCreateEventResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const startISO = toISO(ev.start);
    const endISO = toISO(ev.end);

    const fullTitle = "NEW";
    const titleAbbr = makeTitleAbbr(fullTitle);

    const newEvent: EvWithMeta = {
      id: Math.random().toString(36).slice(2),
      title: titleAbbr,
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      color: "#4dabf7",
      fullTitle,
      titleAbbr,
      isTitleAbbrCustom: false,
      source: "local",
    };

    setEvents((prev) => {
      const updated = [...prev, newEvent];
      void saveLocalEvents(updated);
      void syncLocalEventsToServer(updated, userId);
      return updated;
    });
    openEditorForEvent(newEvent);
  };

  const onPressEvent = (event: OnEventResponse) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const ev = events.find((e) => e.id === event.id);
    if (!ev) return;
    openEditorForEvent(ev);
  };

  const updateForm = (patch: Partial<EventEditorForm>) => {
    setEditorForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const onChangeFullTitle = (text: string) => {
    if (editingEvent?.source === "ical") return;

    setEditorForm((prev) => {
      if (!prev) return prev;
      const next: EventEditorForm = { ...prev, fullTitle: text };
      if (!hasCustomTitleAbbr) {
        next.titleAbbr = makeTitleAbbr(text);
      }
      return next;
    });
  };

  const onChangeTitleAbbr = (text: string) => {
    setHasCustomTitleAbbr(true);
    updateForm({ titleAbbr: text });
  };

  const closeEditor = () => {
    setEditingEvent(null);
    setEditorForm(null);
    setHasCustomTitleAbbr(false);
    setActivePicker(null);
  };

  const saveEditor = () => {
    if (!editingEvent || !editorForm) return;
    const isIcal = editingEvent.source === "ical";

    if (isIcal) {
      const metaKey =
        editingEvent.metaKey ||
        makeIcalMetaKey(
          editingEvent.icalSubscriptionId || "unknown",
          editingEvent.icalEventUid || editingEvent.id,
        );

      const fullTitle =
        editingEvent.fullTitle ?? editingEvent.title ?? "Untitled";
      const titleAbbr = editorForm.titleAbbr || makeTitleAbbr(fullTitle);

      const nextMeta: Record<string, ICalEventMeta> = {
        ...icalMeta,
        [metaKey]: {
          titleAbbr,
          note: editorForm.note,
          color: editorForm.color,
          isTitleAbbrCustom: hasCustomTitleAbbr,
        },
      };

      setIcalMeta(nextMeta);
      void saveIcalMeta(nextMeta);

      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEvent.id
            ? {
                ...e,
                title: titleAbbr,
                titleAbbr,
                note: editorForm.note,
                color: editorForm.color || e.color,
                isTitleAbbrCustom: hasCustomTitleAbbr,
              }
            : e,
        ),
      );

      closeEditor();
      return;
    }

    const fullTitle = editorForm.fullTitle || "Untitled";
    const titleAbbr =
      editorForm.titleAbbr || makeTitleAbbr(editorForm.fullTitle);

    const updated: EvWithMeta = {
      ...editingEvent,
      title: titleAbbr,
      color: editorForm.color || editingEvent.color,
      start: { dateTime: editorForm.from },
      end: { dateTime: editorForm.until },
      fullTitle,
      titleAbbr,
      note: editorForm.note,
      isTitleAbbrCustom: hasCustomTitleAbbr,
    };

    setEvents((prev) => {
      const updatedList = prev.map((e) =>
        e.id === updated.id ? updated : e,
      );
      void saveLocalEvents(updatedList);
      void syncLocalEventsToServer(updatedList, userId);
      return updatedList;
    });

    closeEditor();
  };

  const handlePickerChange = (
    event: DateTimePickerEvent,
    date?: Date | undefined,
  ) => {
    if (!editorForm || editingEvent?.source === "ical") return;
    if (!date) return;

    const iso = date.toISOString();
    if (activePicker === "from") {
      updateForm({ from: iso });
    } else if (activePicker === "until") {
      updateForm({ until: iso });
    }
  };

  const baseMonday = useMemo(() => getMonday(new Date()), []);
  const weekStart = useMemo(
    () => addWeeks(baseMonday, weekOffset),
    [baseMonday, weekOffset],
  );

  useEffect(() => {
    const mondayIso = fmtYMD(weekStart);
    router.setParams({ currentMonday: mondayIso });
  }, [weekStart, router]);

  const initialDate = fmtYMD(weekStart);
  const minDate = fmtYMD(addWeeks(baseMonday, -52));
  const maxDate = fmtYMD(addWeeks(baseMonday, 52));

  const startMinutes = MIN_H * 60;
  const endMinutes = MAX_H * 60;
  const timeInterval = 60;
  const spaceFromTop = 0;
  const spaceFromBottom = 0;

  const desiredIntervalHeight = useMemo(() => {
    if (!calendarAreaH) return undefined;
    const usableH = Math.max(
      0,
      calendarAreaH - headerBlockH - spaceFromTop - spaceFromBottom,
    );
    const totalMinutes = Math.max(1, endMinutes - startMinutes);
    const raw = (usableH / totalMinutes) * timeInterval;
    return PixelRatio.roundToNearestPixel(raw);
  }, [
    calendarAreaH,
    headerBlockH,
    startMinutes,
    endMinutes,
    timeInterval,
    spaceFromTop,
    spaceFromBottom,
  ]);

  useEffect(() => {
    if (desiredIntervalHeight && calendarRef.current?.zoom) {
      calendarRef.current.zoom({ height: desiredIntervalHeight });
    }
  }, [desiredIntervalHeight]);

  useEffect(() => {
    if (jumpToToday === "1" || jumpToToday === "true") {
      const today = new Date();
      setWeekOffset(0);
      calendarRef.current?.goToDate({
        date: today,
        animatedDate: true,
        hourScroll: false,
        animatedHour: true,
      });
      router.setParams({ jumpToToday: undefined });
    }
  }, [jumpToToday, router]);

  const renderDayItem = useCallback(
    ({ dateUnix }: { dateUnix: number }) => {
      const date = new Date(dateUnix);
      const dayLabel = dayjs(date).format("dd");
      const dayNum = dayjs(date).format("D");

      return (
        <Surface
          mode="flat"
          elevation={0}
          style={{ alignItems: "center", backgroundColor: "transparent" }}
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
    [paper.colors.onSurface],
  );

  const isIcalEditing = editingEvent?.source === "ical";

  return (
    <Surface
      mode="flat"
      elevation={0}
      style={[styles.root, { backgroundColor: paper.colors.background }]}
      onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}
    >
      <View style={{ flex: 1 }}>
        <CalendarContainer
          ref={calendarRef}
          numberOfDays={7}
          scrollByDay={false}
          firstDay={1}
          locale="de"
          scrollToNow={false}
          spaceFromTop={spaceFromTop}
          spaceFromBottom={spaceFromBottom}
          allowHorizontalSwipe={true}
          allowPinchToZoom={false}
          hourWidth={40}
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
          onPressEvent={onPressEvent}
          onDateChanged={(iso) => {
            const d = new Date(iso);
            const monday = getMonday(d);
            const diffWeeks =
              Math.round(
                (monday.getTime() - baseMonday.getTime()) /
                  (7 * 24 * 60 * 60 * 1000),
              );
            setWeekOffset(diffWeeks);
          }}
        >
          <Surface
            mode="flat"
            elevation={0}
            onLayout={(e) => setHeaderBlockH(e.nativeEvent.layout.height)}
            style={{ backgroundColor: "transparent" }}
          >
            <CalendarHeader renderDayItem={renderDayItem} dayBarHeight={22} />
          </Surface>

          <CalendarBody
            renderCustomHorizontalLine={renderHourOnlyLine}
            hourFormat="H"
          />
        </CalendarContainer>
      </View>

      {editingEvent && editorForm && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable
            style={[
              styles.scrim,
              { backgroundColor: paper.colors.backdrop },
            ]}
            onPress={closeEditor}
          />

          <KeyboardAvoidingView
            style={styles.drawerAvoider}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={64}
          >
            <Surface
              elevation={3}
              mode="elevated"
              style={[
                styles.drawer,
                {
                  backgroundColor: paper.colors.surface,
                  borderLeftColor: paper.colors.outlineVariant,
                },
              ]}
            >
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text variant="titleMedium" style={{ flex: 1 }}>
                    {isIcalEditing
                      ? "iCal-Event anzeigen"
                      : "Event bearbeiten"}
                  </Text>
                  <IconButton icon="close" onPress={closeEditor} />
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="labelSmall" style={styles.label}>
                  Title
                  {isIcalEditing && " (aus iCal, nicht änderbar)"}
                </Text>
                <TextInput
                  mode="outlined"
                  value={editorForm.fullTitle}
                  onChangeText={onChangeFullTitle}
                  dense
                  editable={!isIcalEditing}
                />

                <Text variant="labelSmall" style={styles.label}>
                  Title abbr.
                </Text>
                <TextInput
                  mode="outlined"
                  value={editorForm.titleAbbr}
                  onChangeText={onChangeTitleAbbr}
                  dense
                />

                <Text variant="labelSmall" style={styles.label}>
                  From {isIcalEditing && "(aus iCal, nicht änderbar)"}
                </Text>
                <Pressable
                  onPress={() => {
                    if (isIcalEditing) return;
                    setActivePicker((prev) =>
                      prev === "from" ? null : "from",
                    );
                  }}
                >
                  <TextInput
                    mode="outlined"
                    value={formatDateTimeIso(editorForm.from)}
                    editable={false}
                    pointerEvents="none"
                    dense
                  />
                </Pressable>
                {!isIcalEditing && activePicker === "from" && (
                  <DateTimePicker
                    value={new Date(editorForm.from)}
                    mode="datetime"
                    display="spinner"
                    onChange={handlePickerChange}
                    style={{ alignSelf: "stretch" }}
                  />
                )}

                <Text variant="labelSmall" style={styles.label}>
                  Until {isIcalEditing && "(aus iCal, nicht änderbar)"}
                </Text>
                <Pressable
                  onPress={() => {
                    if (isIcalEditing) return;
                    setActivePicker((prev) =>
                      prev === "until" ? null : "until",
                    );
                  }}
                >
                  <TextInput
                    mode="outlined"
                    value={formatDateTimeIso(editorForm.until)}
                    editable={false}
                    pointerEvents="none"
                    dense
                  />
                </Pressable>
                {!isIcalEditing && activePicker === "until" && (
                  <DateTimePicker
                    value={new Date(editorForm.until)}
                    mode="datetime"
                    display="spinner"
                    onChange={handlePickerChange}
                    style={{ alignSelf: "stretch" }}
                  />
                )}

                <Text variant="labelSmall" style={styles.label}>
                  Note
                </Text>
                <TextInput
                  mode="outlined"
                  value={editorForm.note}
                  onChangeText={(text) => updateForm({ note: text })}
                  multiline
                  numberOfLines={3}
                />

                <Text variant="labelSmall" style={styles.label}>
                  Color
                </Text>
                <View style={styles.colorRow}>
                  {COLOR_OPTIONS.map((c) => {
                    const selected = editorForm.color === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => updateForm({ color: c })}
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor: c,
                            borderColor: paper.colors.outlineVariant,
                          },
                          selected && {
                            borderWidth: 2,
                            borderColor: paper.colors.primary,
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    marginTop: 16,
                    columnGap: 8,
                  }}
                >
                  <Button onPress={closeEditor}>Cancel</Button>
                  <Button mode="contained" onPress={saveEditor}>
                    Save
                  </Button>
                </View>
              </ScrollView>
            </Surface>
          </KeyboardAvoidingView>
        </View>
      )}
    </Surface>
  );
}

/* ---------------------- Utils ---------------------- */
function getMonday(d: Date) {
  const day = d.getDay();
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

const renderHourOnlyLine = ({
  index,
  borderColor,
}: {
  index: number;
  borderColor: string;
}) => {
  if (!Number.isInteger(index)) return null;
  if (index === 0) return null;
  if (index === MAX_H - MIN_H) return null;

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

function makeTitleAbbr(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words
    .map((w) => w.charAt(0))
    .join("");
}

function formatDateTimeIso(iso: string): string {
  if (!iso) return "";
  return dayjs(iso).format("DD.MM.YYYY HH:mm");
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  label: {
    marginTop: 8,
    marginBottom: 2,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerAvoider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "80%",
  },
  drawer: {
    flex: 1,
    padding: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: "flex-start",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
});
