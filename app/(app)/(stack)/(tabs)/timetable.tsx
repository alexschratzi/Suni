// app/(app)/(stack)/(tabs)/timetable.tsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter, PixelRatio, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Provider as PaperProvider,
  Surface,
  Text,
  useTheme,
  type MD3Theme,
} from "react-native-paper";
import type { CalendarKitHandle } from "@howljs/calendar-kit";
import dayjs from "dayjs";
import "dayjs/locale/de";

import type { EvWithMeta } from "@/types/timetable";
import { TimetableCalendar } from "@/components/timetable/TimetableCalendar";
import { EventEditorDrawer } from "@/components/timetable/EventEditorDrawer";

import { useTimetableSync } from "@/src/timetable/hooks/useTimetableSync";
import { useTimetableEditor } from "@/src/timetable/hooks/useTimetableEditor";
import { useTimetableJumpToToday } from "@/src/timetable/hooks/useTimetableJumpToToday";

import { addWeeks, fmtYMD, getMonday, makeTitleAbbr } from "@/src/timetable/utils/date";
import { TIMETABLE_HEADER_EVENT, useTimetableDisplayMode } from "@/src/timetable/utils/mode";
import { useTimetableTheming } from "@/src/timetable/utils/useTimetableTheming";

dayjs.locale("de");

const SNAP_TO_MINUTE = 60;
const DEFAULT_EVENT_DURATION_MIN = 60;
const MIN_H = 7;
const MAX_H = 24;

export default function TimetableScreen() {
  const appPaper = useTheme<MD3Theme>();
  const router = useRouter();
  const { jumpToToday } = useLocalSearchParams<{ jumpToToday?: string }>();

  const userId = "1234"; // TODO: real auth

  const [calendarAreaH, setCalendarAreaH] = useState<number | null>(null);
  const [headerBlockH, setHeaderBlockH] = useState(0);

  const calendarRef = useRef<CalendarKitHandle>(null!) as React.RefObject<CalendarKitHandle>;

  // ✅ mode comes from shared hook
  const displayMode = useTimetableDisplayMode("courses");

  // ✅ theming comes from shared hook
  const { screenPaperTheme, calendarTheme } = useTimetableTheming(appPaper, displayMode);

  const emitCurrentMonday = useCallback((mondayIso: string) => {
    DeviceEventEmitter.emit(TIMETABLE_HEADER_EVENT, mondayIso);
  }, []);

  const baseMonday = useMemo(() => getMonday(new Date()), []);
  const initialDate = useMemo(() => fmtYMD(baseMonday), [baseMonday]);

  const minDate = useMemo(() => fmtYMD(addWeeks(baseMonday, -52)), [baseMonday]);
  const maxDate = useMemo(() => fmtYMD(addWeeks(baseMonday, 52)), [baseMonday]);

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
  }, [calendarAreaH, headerBlockH, spaceFromTop, spaceFromBottom, endMinutes, startMinutes, timeInterval]);

  const { events, setEvents, icalMeta, setIcalMeta } = useTimetableSync({ userId });

  const visibleEvents = useMemo(() => {
    // TODO: filter by displayMode
    return events;
  }, [events, displayMode]);

  const editor = useTimetableEditor({
    userId,
    events,
    setEvents,
    icalMeta,
    setIcalMeta,
    makeTitleAbbr,
  });

  const { onChange, onDateChanged } = useTimetableJumpToToday({
    jumpToToday,
    router,
    calendarRef,
    emitCurrentMonday,
    baseMonday,
  });

  const renderDayItem = useCallback(
    ({ dateUnix }: { dateUnix: number }) => {
      const date = new Date(dateUnix);
      const dayLabel = dayjs(date).format("dd");
      const dayNum = dayjs(date).format("D");

      return (
        <Surface mode="flat" elevation={0} style={{ alignItems: "center", backgroundColor: "transparent" }}>
          <Text
            variant="labelSmall"
            style={{ fontSize: 12, fontWeight: "700", color: screenPaperTheme.colors.onSurface }}
          >
            {`${dayLabel} ${dayNum}`}
          </Text>
        </Surface>
      );
    },
    [screenPaperTheme.colors.onSurface],
  );

  const onHeaderLayout = useCallback((h: number) => setHeaderBlockH(h), []);

  return (
    <PaperProvider theme={screenPaperTheme}>
      <Surface
        mode="flat"
        elevation={0}
        style={[styles.root, { backgroundColor: screenPaperTheme.colors.background }]}
        onLayout={(e) => setCalendarAreaH(e.nativeEvent.layout.height)}
      >
        <View style={{ flex: 1 }}>
          <TimetableCalendar
            calendarRef={calendarRef}
            events={visibleEvents as EvWithMeta[]}
            theme={calendarTheme}
            initialDate={initialDate}
            minDate={minDate}
            maxDate={maxDate}
            startMinutes={startMinutes}
            endMinutes={endMinutes}
            timeInterval={timeInterval}
            spaceFromTop={spaceFromTop}
            spaceFromBottom={spaceFromBottom}
            desiredIntervalHeight={desiredIntervalHeight}
            defaultDurationMin={DEFAULT_EVENT_DURATION_MIN}
            dragStepMin={SNAP_TO_MINUTE}
            onCreate={editor.onCreate}
            onPressEvent={editor.onPressEvent}
            onChange={onChange}
            onDateChanged={onDateChanged}
            renderDayItem={renderDayItem}
            onHeaderLayout={onHeaderLayout}
          />
        </View>

        <EventEditorDrawer
          visible={!!editor.editingEvent && !!editor.editorForm}
          paper={screenPaperTheme}
          editingEvent={editor.editingEvent}
          form={editor.editorForm}
          activePicker={editor.activePicker}
          isIcalEditing={editor.isIcalEditing}
          onClose={editor.closeEditor}
          onSave={editor.saveEditor}
          onDelete={editor.deleteEditorEvent}
          onChangeFullTitle={editor.onChangeFullTitle}
          onChangeTitleAbbr={editor.onChangeTitleAbbr}
          onChangeNote={(text) => editor.updateForm({ note: text })}
          onSelectColor={(color) => editor.updateForm({ color })}
          onSetActivePicker={editor.setActivePicker}
          onPickerChange={editor.handlePickerChange}
        />
      </Surface>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
