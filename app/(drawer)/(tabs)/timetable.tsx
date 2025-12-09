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

// ⬇️ NEW: server-side iCal helpers (push + get_ical)
import {
  syncICalSubscriptions,
  getICalSubscriptions,
} from "@/src/server/calendar"; // <-- adjust path

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

// Local extension of your Ev type with metadata
type EvWithMeta = Ev & {
  fullTitle?: string;
  titleAbbr?: string;
  isTitleAbbrCustom?: boolean;
  note?: string;
};

type ActivePicker = "from" | "until" | null;

const COLOR_OPTIONS = [
  "#4dabf7", // blue
  "#f783ac", // pink
  "#ffd43b", // yellow
  "#69db7c", // green
  "#845ef7", // purple
  "#ffa94d", // orange
];

// ⬇️ NEW: local representation of stored iCal subscriptions
type ICalSubscription = {
  id: string;
  name: string;
  url: string;
  color: string;
};

// ⬇️ NEW: AsyncStorage key shared with settings screen
const ICAL_ASYNC_KEY = "ical_subscriptions_v1";

export default function TimetableScreen() {
  const paper = useTheme();
  const router = useRouter();

  const { jumpToToday } = useLocalSearchParams<{
    jumpToToday?: string;
  }>();

  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<EvWithMeta[]>([]);
  const theme = useMemo<DeepPartial<ThemeConfigs>>(
    () => mapPaperToCalendarTheme(paper),
    [paper]
  );

  const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
  const [headerBlockH, setHeaderBlockH] = useState(0);

  const calendarRef = useRef<CalendarKitHandle>(null);

  const [editingEvent, setEditingEvent] = useState<EvWithMeta | null>(null);
  const [editorForm, setEditorForm] = useState<EventEditorForm | null>(null);
  const [hasCustomTitleAbbr, setHasCustomTitleAbbr] = useState(false);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // ⬇️ NEW: (optional) loading flag for iCal sync – could be used to gate fetching of events later
  const [iCalSyncing, setICalSyncing] = useState(true);

  // ⬇️ TODO: replace with real user id once you have auth
  const userId = "1234";

  /* ------------------------------------------------------------------------ */
  /* iCal SYNC ON LOAD (push + get_ical)                                      */
  /* ------------------------------------------------------------------------ */

  const loadLocalICalSubscriptions = useCallback(
    async (): Promise<ICalSubscription[]> => {
      try {
        const raw = await AsyncStorage.getItem(ICAL_ASYNC_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to load local iCal subs:", e);
        return [];
      }
    },
    []
  );

  const saveLocalICalSubscriptions = useCallback(
    async (subs: ICalSubscription[]) => {
      try {
        await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(subs));
      } catch (e) {
        console.warn("Failed to save local iCal subs:", e);
      }
    },
    []
  );

  useEffect(() => {
    const syncICalOnMount = async () => {
      try {
        setICalSyncing(true);

        // 1) load what we have stored locally (from settings or previous runs)
        const localSubs = await loadLocalICalSubscriptions();

        // 2) push local → server and get canonical list back
        //    syncICalSubscriptions internally:
        //    - calls updateICal (push ical)
        //    - then getICalSubscriptions (get_ical)
        const syncedFromServer = await syncICalSubscriptions(
          userId,
          localSubs.map((s) => ({
            name: s.name,
            url: s.url,
            color: s.color,
          }))
        );

        // 3) normalize + store canonical list locally so settings screen can just read it
        const normalized: ICalSubscription[] = syncedFromServer.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          color: s.color,
        }));

        await saveLocalICalSubscriptions(normalized);

        // ⬇️ If you later want to fetch & merge ICS events into `events`, this is
        //     the perfect place to trigger that, using `normalized`.
      } catch (e) {
        console.warn("Failed to sync iCal subscriptions on timetable load:", e);

        // fallback: keep whatever is in local storage, don't crash the screen
        // (could also show a toast/snackbar)
      } finally {
        setICalSyncing(false);
      }
    };

    syncICalOnMount();
  }, [loadLocalICalSubscriptions, saveLocalICalSubscriptions, userId]);

  /* ------------------------------------------------------------------------ */
  /* EXISTING TIMETABLE LOGIC                                                 */
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
    };

    setEvents((p) => [...p, newEvent]);
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

    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    closeEditor();
  };

  // Date-time picker handler (inline)
  const handlePickerChange = (
    event: DateTimePickerEvent,
    date?: Date | undefined
  ) => {
    if (!editorForm) return;
    if (!date) return;

    const iso = date.toISOString();
    if (activePicker === "from") {
      updateForm({ from: iso });
    } else if (activePicker === "until") {
      updateForm({ until: iso });
    }
  };

  // Stable "base" Monday (week 0) for relative offset
  const baseMonday = useMemo(() => getMonday(new Date()), []);
  const weekStart = useMemo(
    () => addWeeks(baseMonday, weekOffset),
    [baseMonday, weekOffset]
  );

  useEffect(() => {
    const mondayIso = fmtYMD(weekStart); // "YYYY-MM-DD"
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
      calendarAreaH - headerBlockH - spaceFromTop - spaceFromBottom
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

  // Handle the "Zu heute springen" command coming from settings
  useEffect(() => {
    if (jumpToToday === "1" || jumpToToday === "true") {
      const today = new Date();

      // our own state: week 0 is the "base" week
      setWeekOffset(0);

      // tell the calendar to go to today
      calendarRef.current?.goToDate({
        date: today,
        animatedDate: true,
        hourScroll: false,
        animatedHour: true,
      });

      // clear the param so a future tap in settings can trigger again
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
    [paper.colors.onSurface]
  );

  return (
    <Surface
      mode="flat"
      elevation={0}
      style={[styles.root, { backgroundColor: paper.colors.background }]}
      onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}
    >
      {/* Main calendar (stays static, NOT affected by keyboard) */}
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
                  (7 * 24 * 60 * 60 * 1000)
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

      {/* FULL-SCREEN overlay, drawer from the right */}
      {editingEvent && editorForm && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Scrim */}
          <Pressable
            style={[
              styles.scrim,
              { backgroundColor: paper.colors.backdrop },
            ]}
            onPress={closeEditor}
          />

          {/* KeyboardAvoidingView ONLY for the sidebar */}
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
                    Event bearbeiten
                  </Text>
                  <IconButton icon="close" onPress={closeEditor} />
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="labelSmall" style={styles.label}>
                  Title
                </Text>
                <TextInput
                  mode="outlined"
                  value={editorForm.fullTitle}
                  onChangeText={onChangeFullTitle}
                  dense
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
                  From
                </Text>
                <Pressable
                  onPress={() =>
                    setActivePicker((prev) =>
                      prev === "from" ? null : "from"
                    )
                  }
                >
                  <TextInput
                    mode="outlined"
                    value={formatDateTimeIso(editorForm.from)}
                    editable={false}
                    pointerEvents="none"
                    dense
                  />
                </Pressable>
                {activePicker === "from" && (
                  <DateTimePicker
                    value={new Date(editorForm.from)}
                    mode="datetime"
                    display="spinner"
                    onChange={handlePickerChange}
                    style={{ alignSelf: "stretch" }}
                  />
                )}

                <Text variant="labelSmall" style={styles.label}>
                  Until
                </Text>
                <Pressable
                  onPress={() =>
                    setActivePicker((prev) =>
                      prev === "until" ? null : "until"
                    )
                  }
                >
                  <TextInput
                    mode="outlined"
                    value={formatDateTimeIso(editorForm.until)}
                    editable={false}
                    pointerEvents="none"
                    dense
                  />
                </Pressable>
                {activePicker === "until" && (
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
