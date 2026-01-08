// src/timetable/hooks/useTimetableEditor.ts
import { useCallback, useMemo, useState } from "react";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import type { OnCreateEventResponse, OnEventResponse } from "@howljs/calendar-kit";

import type {
  ActivePicker,
  CourseEditorForm,
  EntryDisplayType,
  EvWithMeta,
  EventEditorForm,
  ICalEventMeta,
  PartyEditorForm,
} from "@/types/timetable";
import { saveCalendar } from "@/src/server/calendar";

import { toISO, makeIcalMetaKey } from "@/src/timetable/utils/date";
import { saveIcalMeta, saveLocalEvents } from "@/src/timetable/utils/storage";
import { mapEventToDto } from "@/src/timetable/utils/mapping";

type Params = {
  userId: string;

  events: EvWithMeta[];
  setEvents: React.Dispatch<React.SetStateAction<EvWithMeta[]>>;

  icalMeta: Record<string, ICalEventMeta>;
  setIcalMeta: React.Dispatch<React.SetStateAction<Record<string, ICalEventMeta>>>;

  makeTitleAbbr: (title: string) => string;
};

function normalizeDisplayType(v: any): EntryDisplayType {
  return v === "none" || v === "course" || v === "event" ? v : "none";
}

function toCourseForm(base: EventEditorForm): CourseEditorForm {
  const b = base as any;
  return {
    ...base,
    displayType: "course",
    courseName: b.courseName ?? base.fullTitle ?? "",
    courseType: b.courseType ?? base.fullTitle ?? "",
    lecturer: b.lecturer ?? base.fullTitle ?? "",
    room: b.room ?? base.fullTitle ?? "",
  };
}

function toPartyForm(base: EventEditorForm): PartyEditorForm {
  const b = base as any;
  return {
    ...base,
    displayType: "event",
    eventName: b.eventName ?? base.fullTitle ?? "",
    location: b.location ?? "",
    createdBy: b.createdBy ?? "",
    entryFee: b.entryFee ?? "",
    invitedGroups: b.invitedGroups ?? "",
  };
}

export function useTimetableEditor({
  userId,
  events,
  setEvents,
  icalMeta,
  setIcalMeta,
  makeTitleAbbr,
}: Params) {
  // NEW: overview state
  const [viewingEvent, setViewingEvent] = useState<EvWithMeta | null>(null);

  // edit state (existing)
  const [editingEvent, setEditingEvent] = useState<EvWithMeta | null>(null);
  const [editorForm, setEditorForm] = useState<EventEditorForm | null>(null);
  const [hasCustomTitleAbbr, setHasCustomTitleAbbr] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const isIcalEditing = useMemo(() => editingEvent?.source === "ical", [editingEvent?.source]);

  const syncLocalEventsToServer = useCallback(async (allEvents: EvWithMeta[], uid: string) => {
    const localEvents = allEvents.filter((e) => e.source === "local");
    const entries = localEvents.map((ev) => mapEventToDto(ev, uid));
    await saveCalendar({ entries } as any);
  }, []);

  const openOverviewForEvent = useCallback((ev: EvWithMeta) => {
    setViewingEvent(ev);
  }, []);

  const closeOverview = useCallback(() => setViewingEvent(null), []);

  const openEditorForEvent = useCallback(
    (ev: EvWithMeta) => {
      const fullTitle = ev.fullTitle ?? ev.title ?? "";
      const autoAbbr = makeTitleAbbr(fullTitle);
      const titleAbbr = ev.titleAbbr ?? autoAbbr;

      const base: EventEditorForm = {
        fullTitle,
        titleAbbr,
        from: toISO(ev.start),
        until: toISO(ev.end),
        note: ev.note ?? "",
        color: ev.color ?? "#4dabf7",
        displayType: normalizeDisplayType(ev.displayType),
      };

      // Type-specific default edit forms
      let finalForm: EventEditorForm = base;
      if (base.displayType === "course") finalForm = toCourseForm(base);
      if (base.displayType === "event") finalForm = toPartyForm(base);

      setEditingEvent(ev);
      setEditorForm(finalForm);

      setHasCustomTitleAbbr(ev.isTitleAbbrCustom ?? false);
      setActivePicker(null);
    },
    [makeTitleAbbr],
  );

  const openEditFromOverview = useCallback(() => {
    if (!viewingEvent) return;
    setViewingEvent(null);
    openEditorForEvent(viewingEvent);
  }, [openEditorForEvent, viewingEvent]);

  const closeEditor = useCallback(() => {
    setEditingEvent(null);
    setEditorForm(null);
    setHasCustomTitleAbbr(false);
    setActivePicker(null);
  }, []);

  const updateForm = useCallback((patch: Partial<EventEditorForm>) => {
    setEditorForm((prev) => (prev ? { ...(prev as any), ...(patch as any) } : prev));
  }, []);

  const onChangeFullTitle = useCallback(
    (text: string) => {
      if (editingEvent?.source === "ical") return;

      setEditorForm((prev) => {
        if (!prev) return prev;
        const next: any = { ...prev, fullTitle: text };
        if (!hasCustomTitleAbbr) next.titleAbbr = makeTitleAbbr(text);
        return next;
      });
    },
    [editingEvent?.source, hasCustomTitleAbbr, makeTitleAbbr],
  );

  const onChangeTitleAbbr = useCallback(
    (text: string) => {
      setHasCustomTitleAbbr(true);
      updateForm({ titleAbbr: text });
    },
    [updateForm],
  );

  const handlePickerChange = useCallback(
    (_event: DateTimePickerEvent, date?: Date) => {
      if (!editorForm || editingEvent?.source === "ical") return;
      if (!date) return;

      const iso = date.toISOString();
      if (activePicker === "from") updateForm({ from: iso });
      else if (activePicker === "until") updateForm({ until: iso });
    },
    [activePicker, editingEvent?.source, editorForm, updateForm],
  );

  // NEW: hide (works from overview)
  const hideViewedEvent = useCallback(() => {
    if (!viewingEvent) return;

    const ev = viewingEvent;

    // iCal: store hidden in meta
    if (ev.source === "ical") {
      const metaKey =
        ev.metaKey ||
        makeIcalMetaKey(ev.icalSubscriptionId || "unknown", ev.icalEventUid || ev.id);

      const nextMeta: Record<string, ICalEventMeta> = {
        ...icalMeta,
        [metaKey]: {
          ...(icalMeta[metaKey] ?? {}),
          hidden: true,
          // also keep type override if present
          displayType: normalizeDisplayType(ev.displayType),
        },
      };

      setIcalMeta(nextMeta);
      void saveIcalMeta(nextMeta);

      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, hidden: true } : e)));
      setViewingEvent(null);
      return;
    }

    // local: persist hidden via saveLocalEvents + server sync
    setEvents((prev) => {
      const updated = prev.map((e) => (e.id === ev.id ? { ...e, hidden: true } : e));
      void saveLocalEvents(updated);
      void syncLocalEventsToServer(updated, userId);
      return updated;
    });

    setViewingEvent(null);
  }, [icalMeta, setEvents, setIcalMeta, syncLocalEventsToServer, userId, viewingEvent]);

  const saveEditor = useCallback(() => {
    if (!editingEvent || !editorForm) return;
    const isIcal = editingEvent.source === "ical";

    const nextDisplayType = normalizeDisplayType(editorForm.displayType);

    if (isIcal) {
      const metaKey =
        editingEvent.metaKey ||
        makeIcalMetaKey(
          editingEvent.icalSubscriptionId || "unknown",
          editingEvent.icalEventUid || editingEvent.id,
        );

      const fullTitle = editingEvent.fullTitle ?? editingEvent.title ?? "Untitled";
      const titleAbbr = editorForm.titleAbbr || makeTitleAbbr(fullTitle);

      const nextMeta: Record<string, ICalEventMeta> = {
        ...icalMeta,
        [metaKey]: {
          titleAbbr,
          note: editorForm.note,
          color: editorForm.color,
          isTitleAbbrCustom: hasCustomTitleAbbr,
          displayType: nextDisplayType,
          hidden: !!editingEvent.hidden,
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
                displayType: nextDisplayType,
              }
            : e,
        ),
      );

      closeEditor();
      return;
    }

    const fullTitle = editorForm.fullTitle || "Untitled";
    const titleAbbr = editorForm.titleAbbr || makeTitleAbbr(fullTitle);

    // persist type-specific fields into event (optional)
    const nextCourse =
      nextDisplayType === "course"
        ? {
            courseName: (editorForm as any).courseName ?? "",
            courseType: (editorForm as any).courseType ?? "",
            lecturer: (editorForm as any).lecturer ?? "",
            room: (editorForm as any).room ?? "",
          }
        : undefined;

    const invitedGroupsRaw = String((editorForm as any).invitedGroups ?? "");
    const nextParty =
      nextDisplayType === "event"
        ? {
            eventName: (editorForm as any).eventName ?? "",
            location: (editorForm as any).location ?? "",
            createdBy: (editorForm as any).createdBy ?? "",
            entryFee: (editorForm as any).entryFee ?? "",
            invitedGroups: invitedGroupsRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            friendsAttending: [],
          }
        : undefined;

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
      source: "local",
      displayType: nextDisplayType,
      course: nextCourse,
      party: nextParty,
    };

    setEvents((prev) => {
      const updatedList = prev.map((e) => (e.id === updated.id ? updated : e));
      void saveLocalEvents(updatedList);
      void syncLocalEventsToServer(updatedList, userId);
      return updatedList;
    });

    closeEditor();
  }, [
    closeEditor,
    editingEvent,
    editorForm,
    hasCustomTitleAbbr,
    icalMeta,
    makeTitleAbbr,
    setEvents,
    setIcalMeta,
    syncLocalEventsToServer,
    userId,
  ]);

  const deleteEditorEvent = useCallback(() => {
    if (!editingEvent) return;

    if (editingEvent.source === "ical") {
      closeEditor();
      return;
    }

    setEvents((prev) => {
      const updatedList = prev.filter((e) => e.id !== editingEvent.id);
      void saveLocalEvents(updatedList);
      void syncLocalEventsToServer(updatedList, userId);
      return updatedList;
    });

    closeEditor();
  }, [closeEditor, editingEvent, setEvents, syncLocalEventsToServer, userId]);

  const onCreate = useCallback(
    (ev: OnCreateEventResponse) => {
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
        displayType: "none",
        hidden: false,
      };

      setEvents((prev) => {
        const updated = [...prev, newEvent];
        void saveLocalEvents(updated);
        void syncLocalEventsToServer(updated, userId);
        return updated;
      });

      // Creation should open EDIT directly (as before), not overview
      openEditorForEvent(newEvent);
    },
    [makeTitleAbbr, openEditorForEvent, setEvents, syncLocalEventsToServer, userId],
  );

  const onPressEvent = useCallback(
    (event: OnEventResponse) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ev = events.find((e) => e.id === event.id);
      if (!ev) return;
      openOverviewForEvent(ev);
    },
    [events, openOverviewForEvent],
  );

  return {
    // overview
    viewingEvent,
    openOverviewForEvent,
    closeOverview,
    openEditFromOverview,
    hideViewedEvent,

    // edit
    editingEvent,
    editorForm,
    activePicker,
    setActivePicker,
    isIcalEditing,

    openEditorForEvent,
    closeEditor,

    updateForm,
    onChangeFullTitle,
    onChangeTitleAbbr,
    handlePickerChange,

    saveEditor,
    deleteEditorEvent,

    onCreate,
    onPressEvent,
  };
}
