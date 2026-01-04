// components/timetable/TimetableCalendar.tsx
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Divider, Surface } from "react-native-paper";
import {
  CalendarBody,
  CalendarContainer,
  CalendarHeader,
} from "@howljs/calendar-kit";
import type {
  CalendarKitHandle,
  DeepPartial,
  OnCreateEventResponse,
  OnEventResponse,
  ThemeConfigs,
} from "@howljs/calendar-kit";

import type { EvWithMeta } from "@/types/timetable";

type Props = {
  calendarRef: React.RefObject<CalendarKitHandle>;
  events: EvWithMeta[];
  theme: DeepPartial<ThemeConfigs>;

  initialDate: string;
  minDate: string;
  maxDate: string;

  startMinutes: number;
  endMinutes: number;
  timeInterval: number;

  spaceFromTop: number;
  spaceFromBottom: number;

  desiredIntervalHeight?: number;

  defaultDurationMin: number;
  dragStepMin: number;

  onCreate: (ev: OnCreateEventResponse) => void;
  onPressEvent: (event: OnEventResponse) => void;

  // ✅ NEW: fast callback during scrolling/swiping
  onChange: (iso: string) => void;

  // existing: callback when date “settles”
  onDateChanged: (iso: string) => void;

  renderDayItem: (args: { dateUnix: number }) => React.ReactNode;
  onHeaderLayout: (height: number) => void;
};

export function TimetableCalendar(props: Props) {
  const {
    calendarRef,
    events,
    theme,
    initialDate,
    minDate,
    maxDate,
    startMinutes,
    endMinutes,
    timeInterval,
    spaceFromTop,
    spaceFromBottom,
    desiredIntervalHeight,
    defaultDurationMin,
    dragStepMin,
    onCreate,
    onPressEvent,
    onChange,
    onDateChanged,
    renderDayItem,
    onHeaderLayout,
  } = props;

  useEffect(() => {
    if (desiredIntervalHeight && calendarRef.current?.zoom) {
      calendarRef.current.zoom({ height: desiredIntervalHeight });
    }
  }, [desiredIntervalHeight, calendarRef]);

  return (
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
      defaultDuration={defaultDurationMin}
      dragStep={dragStepMin}
      useHaptic={true}
      enableResourceScroll={false}
      onDragCreateEventEnd={onCreate}
      events={events}
      theme={theme}
      pagesPerSide={5}
      onPressEvent={onPressEvent}
      // ✅ NEW: fires during swipe/scroll
      onChange={onChange}
      // still keep settled callback
      onDateChanged={onDateChanged}
    >
      <Surface
        mode="flat"
        elevation={0}
        onLayout={(e) => onHeaderLayout(e.nativeEvent.layout.height)}
        style={{ backgroundColor: "transparent" }}
      >
        <CalendarHeader renderDayItem={renderDayItem} dayBarHeight={22} />
      </Surface>

      <CalendarBody renderCustomHorizontalLine={renderHourOnlyLine} hourFormat="H" />
    </CalendarContainer>
  );
}

const MIN_H = 7;
const MAX_H = 24;

const renderHourOnlyLine = ({ index, borderColor }: { index: number; borderColor: string }) => {
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
