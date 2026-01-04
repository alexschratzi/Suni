// src/timetable/hooks/useTimetableJumpToToday.ts
import { useCallback, useEffect, useRef } from "react";
import type { CalendarKitHandle } from "@howljs/calendar-kit";
import type { Router } from "expo-router";

import { fmtYMD, getMonday } from "@/src/timetable/utils/date";

type Params = {
  jumpToToday?: string;
  router: Router;
  calendarRef: React.RefObject<CalendarKitHandle>;
  emitCurrentMonday: (mondayIso: string) => void;
  baseMonday: Date; // kept for signature compatibility (not needed here)
};

export function useTimetableJumpToToday({
  jumpToToday,
  router,
  calendarRef,
  emitCurrentMonday,
}: Params) {
  // Prevent onDateChanged during animated jumps
  const suppressDateChangedRef = useRef(false);

  const pendingJumpMondayIsoRef = useRef<string | null>(null);
  const jumpUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isJumpingRef = useRef(false);
  const jumpLockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ throttle swipes: emit only when monday changes
  const lastEmittedMondayRef = useRef<string | null>(null);

  const clearJumpLock = useCallback(() => {
    suppressDateChangedRef.current = false;
    pendingJumpMondayIsoRef.current = null;

    if (jumpUnlockTimeoutRef.current) {
      clearTimeout(jumpUnlockTimeoutRef.current);
      jumpUnlockTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (jumpLockTimeoutRef.current) clearTimeout(jumpLockTimeoutRef.current);
      clearJumpLock();
    };
  }, [clearJumpLock]);

  // initial emit
  useEffect(() => {
    const initial = fmtYMD(getMonday(new Date()));
    lastEmittedMondayRef.current = initial;
    emitCurrentMonday(initial);
  }, [emitCurrentMonday]);

  // Jump to today
  useEffect(() => {
    if (!jumpToToday) return;

    if (isJumpingRef.current) {
      router.setParams({ jumpToToday: undefined });
      return;
    }

    isJumpingRef.current = true;

    const today = new Date();
    const mondayIso = fmtYMD(getMonday(today));

    pendingJumpMondayIsoRef.current = mondayIso;
    suppressDateChangedRef.current = true;

    lastEmittedMondayRef.current = mondayIso;
    emitCurrentMonday(mondayIso);

    requestAnimationFrame(() => {
      calendarRef.current?.goToDate({
        date: today,
        animatedDate: true,
        hourScroll: false,
        animatedHour: true,
      });
    });

    if (jumpUnlockTimeoutRef.current) clearTimeout(jumpUnlockTimeoutRef.current);
    if (jumpLockTimeoutRef.current) clearTimeout(jumpLockTimeoutRef.current);

    jumpUnlockTimeoutRef.current = setTimeout(() => {
      lastEmittedMondayRef.current = mondayIso;
      emitCurrentMonday(mondayIso);
      clearJumpLock();
    }, 550);

    jumpLockTimeoutRef.current = setTimeout(() => {
      isJumpingRef.current = false;
    }, 650);

    router.setParams({ jumpToToday: undefined });

    return () => {
      lastEmittedMondayRef.current = mondayIso;
      emitCurrentMonday(mondayIso);
      clearJumpLock();
      isJumpingRef.current = false;

      if (jumpLockTimeoutRef.current) {
        clearTimeout(jumpLockTimeoutRef.current);
        jumpLockTimeoutRef.current = null;
      }
    };
  }, [jumpToToday, router, calendarRef, emitCurrentMonday, clearJumpLock]);

  // ✅ FAST: called during scrolling/swiping
  const onChange = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      const mondayIso = fmtYMD(getMonday(d));

      // during jump: only accept target monday
      if (suppressDateChangedRef.current) {
        const pending = pendingJumpMondayIsoRef.current;
        if (pending && mondayIso === pending && lastEmittedMondayRef.current !== mondayIso) {
          lastEmittedMondayRef.current = mondayIso;
          emitCurrentMonday(mondayIso);
        }
        return;
      }

      // throttle: only emit when monday changes
      if (lastEmittedMondayRef.current === mondayIso) return;

      lastEmittedMondayRef.current = mondayIso;
      emitCurrentMonday(mondayIso);
    },
    [emitCurrentMonday],
  );

  // “settled” callback; can keep for consistency (or no-op)
  const onDateChanged = useCallback(
    (iso: string) => {
      // optional: you can leave this empty, or keep it to “finalize”
      onChange(iso);
    },
    [onChange],
  );

  return { onChange, onDateChanged };
}
