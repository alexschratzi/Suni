// src/timetable/utils/mode.ts
import * as React from "react";
import { DeviceEventEmitter } from "react-native";

export type TimetableDisplayMode = "courses" | "party";

export const TIMETABLE_MODE_EVENT = "timetable:displayMode" as const;
export const TIMETABLE_HEADER_EVENT = "timetable:currentMonday" as const;

/**
 * In-memory (session) mode store.
 * - Persists while JS runtime is alive
 * - Resets to "courses" on full reload
 */
let _mode: TimetableDisplayMode = "courses";
const _listeners = new Set<(m: TimetableDisplayMode) => void>();

function notify(m: TimetableDisplayMode) {
  for (const fn of _listeners) fn(m);
  // keep existing event bus behavior for header/tab/stack components
  DeviceEventEmitter.emit(TIMETABLE_MODE_EVENT, m);
}

export function getTimetableDisplayMode(): TimetableDisplayMode {
  return _mode;
}

export function setTimetableDisplayMode(next: TimetableDisplayMode) {
  if (next !== "courses" && next !== "party") return;
  if (_mode === next) return;
  _mode = next;
  notify(_mode);
}

export function toggleTimetableDisplayMode() {
  setTimetableDisplayMode(_mode === "courses" ? "party" : "courses");
}

/**
 * React hook: returns the current mode and stays in sync (session-persistent).
 *
 * NOTE:
 * - defaultMode is only used if the store is still unset (we keep it always set),
 *   but it’s handy if you ever change initialization later.
 */
export function useTimetableDisplayMode(defaultMode: TimetableDisplayMode = "courses") {
  const [mode, setMode] = React.useState<TimetableDisplayMode>(() => _mode ?? defaultMode);

  React.useEffect(() => {
    const onStore = (m: TimetableDisplayMode) => setMode(m);
    _listeners.add(onStore);

    // also accept updates coming from legacy emitters (if something else still emits)
    const sub = DeviceEventEmitter.addListener(
      TIMETABLE_MODE_EVENT,
      (m?: TimetableDisplayMode) => {
        if (m === "courses" || m === "party") setTimetableDisplayMode(m);
      },
    );

    // sync once on mount (in case something set it before hook ran)
    setMode(_mode);

    return () => {
      _listeners.delete(onStore);
      sub.remove();
    };
  }, []);

  return mode;
}
