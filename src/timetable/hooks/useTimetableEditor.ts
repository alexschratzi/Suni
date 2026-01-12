// src/timetable/hooks/useTimetableEditor.ts
import { useCallback, useMemo, useRef, useState } from "react";
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

function snapshotComparable(form: EventEditorForm | null) {
  if (!form) return null;
  const f: any = form;

  // Compare a stable subset (including type-specific fields if present)
  return {
    displayType: form.displayType,
    fullTitle: form.fullTitle ?? "",
    titleAbbr: form.titleAbbr ?? "",
    from: form.from ?? "",
    until: form.until ?? "",
    note: form.note ?? "",
    color: form.color ?? "",

    // course-ish
    courseName: f.courseName ?? "",
    courseType: f.courseType ?? "",
    lecturer: f.lecturer ?? "",
    room: f.room ?? "",

    // party-ish
    eventName: f.eventName ?? "",
    location: f.location ?? "",
    createdBy: f.createdBy ?? "",
    entryFee: f.entryFee ?? "",
    invitedGroups: f.invitedGroups ?? "",
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
  const [viewingEvent, setViewingEvent] = useState<EvWithMeta | null>(null);

  const [editingEvent, setEditingEvent] = useState<EvWithMeta | null>(null);
  const [editorForm, setEditorForm] = useState<EventEditorForm | null>(null);
  const [hasCustomTitleAbbr, setHasCustomTitleAbbr] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  // ✅ creation marker lives in hook state (not on EvWithMeta type)
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const createdDraftIdRef = useRef<string | null>(null);

  // ✅ dirty tracking snapshot
  const initialSnapshotRef = useRef<any>(null);
  const initialHasCustomAbbrRef = useRef<boolean>(false);

  const isIcalEditing = useMemo(() => editingEvent?.source === "ical", [editingEvent?.source]);

  const syncLocalEventsToServer = useCallback(async (allEvents: EvWithMeta[], uid: string) => {
    const localEvents = allEvents.filter((e) => e.source === "local");
    const entries = localEvents.map((ev) => mapEventToDto(ev, uid));
    await saveCalendar({ entries } as any);
  }, []);

  const openOverviewForEvent = useCallback((ev: EvWithMeta) => setViewingEvent(ev), []);
  const closeOverview = useCallback(() => setViewingEvent(null), []);

  const openEditorForEvent = useCallback(
    (ev: EvWithMeta, opts?: { creating?: boolean }) => {
      const creating = !!opts?.creating;

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

      let finalForm: EventEditorForm = base;
      if (base.displayType === "course") finalForm = toCourseForm(base);
      if (base.displayType === "event") finalForm = toPartyForm(base);

      setEditingEvent(ev);
      setEditorForm(finalForm);
      setHasCustomTitleAbbr(ev.isTitleAbbrCustom ?? false);
      setActivePicker(null);

      setIsCreatingNew(creating);
      createdDraftIdRef.current = creating ? ev.id : null;

      // capture snapshot for dirty tracking
      initialSnapshotRef.current = snapshotComparable(finalForm);
      initialHasCustomAbbrRef.current = ev.isTitleAbbrCustom ?? false;
    },
    [makeTitleAbbr],
  );

  const closeEditor = useCallback(() => {
    setEditingEvent(null);
    setEditorForm(null);
    setHasCustomTitleAbbr(false);
    setActivePicker(null);

    setIsCreatingNew(false);
    createdDraftIdRef.current = null;

    initialSnapshotRef.current = null;
    initialHasCustomAbbrRef.current = false;
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

  const isDirty = useMemo(() => {
    const a = initialSnapshotRef.current;
    const b = snapshotComparable(editorForm);
    if (!a || !b) return false;
    return JSON.stringify(a) !== JSON.stringify(b) || initialHasCustomAbbrRef.current !== hasCustomTitleAbbr;
  }, [editorForm, hasCustomTitleAbbr]);

  // ✅ Called when user tries to close WITHOUT needing a confirm dialog
  // - If creating + no changes => remove draft (not created)
  const requestCloseEditor = useCallback(() => {
    if (!editingEvent) return;

    // new draft + no changes => remove it
    if (isCreatingNew && !isDirty) {
      const draftId = createdDraftIdRef.current;
      if (draftId) {
        setEvents((prev) => prev.filter((e) => e.id !== draftId));
      }
      closeEditor();
      return;
    }

    closeEditor();
  }, [closeEditor, editingEvent, isCreatingNew, isDirty, setEvents]);

  // ✅ Discard changes (used by confirm dialog)
  // - If creating => remove draft entirely
  // - Else just close (we don’t mutate stored event until Save anyway)
  const discardEditorChanges = useCallback(() => {
    if (!editingEvent) return;

    if (isCreatingNew) {
      const draftId = createdDraftIdRef.current;
      if (draftId) {
        setEvents((prev) => prev.filter((e) => e.id !== draftId));
      }
      closeEditor();
      return;
    }

    closeEditor();
  }, [closeEditor, editingEvent, isCreatingNew, setEvents]);

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

      // ✅ Persist only on Save (this is what prevents “unchanged new events” from being created)
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

    // Draft new event: just remove (never persisted)
    if (isCreatingNew) {
      const draftId = createdDraftIdRef.current;
      if (draftId) setEvents((prev) => prev.filter((e) => e.id !== draftId));
      closeEditor();
      return;
    }

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
  }, [closeEditor, editingEvent, isCreatingNew, setEvents, syncLocalEventsToServer, userId]);

  const onCreate = useCallback(
    (ev: OnCreateEventResponse) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const startISO = toISO(ev.start);
      const endISO = toISO(ev.end);

      // ✅ Start empty. Not persisted until Save.
      const newEvent: EvWithMeta = {
        id: Math.random().toString(36).slice(2),
        title: "",
        start: { dateTime: startISO },
        end: { dateTime: endISO },
        color: "#4dabf7",
        fullTitle: "",
        titleAbbr: "",
        isTitleAbbrCustom: false,
        source: "local",
        displayType: "none",
        hidden: false,
      };

      // ✅ Put it in memory so the user can edit it immediately,
      // but DO NOT persist until Save.
      setEvents((prev) => [...prev, newEvent]);

      openEditorForEvent(newEvent, { creating: true });
    },
    [openEditorForEvent, setEvents],
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

    // edit
    editingEvent,
    editorForm,
    activePicker,
    setActivePicker,
    isIcalEditing,

    // ✅ new close/dirty API
    isCreatingNew,
    isDirty,
    requestCloseEditor,
    discardEditorChanges,

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
