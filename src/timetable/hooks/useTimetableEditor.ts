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
  EventEditorFormBase,
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

function clampAbbr(raw: string): string {
  const s = String(raw ?? "").trim();
  return s.replace(/\s+/g, "").slice(0, 4);
}

function toBaseForm(form: EventEditorForm): EventEditorFormBase {
  return {
    fullTitle: form.fullTitle ?? "",
    titleAbbr: form.titleAbbr ?? "",
    from: form.from ?? "",
    until: form.until ?? "",
    note: form.note ?? "",
    color: form.color ?? "#4dabf7",
    displayType: normalizeDisplayType(form.displayType),
  };
}

function toCourseForm(base: EventEditorFormBase, prev?: EventEditorForm, ev?: EvWithMeta): CourseEditorForm {
  const p: any = prev ?? {};
  return {
    ...base,
    displayType: "course",
    courseName: p.courseName ?? ev?.course?.courseName ?? base.fullTitle ?? "",
    courseType: p.courseType ?? ev?.course?.courseType ?? "",
    lecturer: p.lecturer ?? ev?.course?.lecturer ?? "",
    room: p.room ?? ev?.course?.room ?? "",
  };
}

function toPartyForm(base: EventEditorFormBase, prev?: EventEditorForm, ev?: EvWithMeta): PartyEditorForm {
  const p: any = prev ?? {};
  const invitedGroupsStr =
    p.invitedGroups ??
    (Array.isArray(ev?.party?.invitedGroups) ? ev!.party!.invitedGroups!.join(", ") : "") ??
    "";

  return {
    ...base,
    displayType: "event",
    eventName: p.eventName ?? ev?.party?.eventName ?? base.fullTitle ?? "",
    location: p.location ?? ev?.party?.location ?? "",
    createdBy: p.createdBy ?? ev?.party?.createdBy ?? "",
    entryFee: p.entryFee ?? ev?.party?.entryFee ?? "",
    invitedGroups: invitedGroupsStr,
  };
}

function snapshotComparable(form: EventEditorForm | null) {
  if (!form) return null;
  const f: any = form;

  return {
    displayType: form.displayType,
    fullTitle: form.fullTitle ?? "",
    titleAbbr: form.titleAbbr ?? "",
    from: form.from ?? "",
    until: form.until ?? "",
    note: form.note ?? "",
    color: form.color ?? "",

    courseName: f.courseName ?? "",
    courseType: f.courseType ?? "",
    lecturer: f.lecturer ?? "",
    room: f.room ?? "",

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

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const createdDraftIdRef = useRef<string | null>(null);

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
      const autoAbbr = clampAbbr(makeTitleAbbr(fullTitle));
      const titleAbbr = clampAbbr(ev.titleAbbr ?? autoAbbr);

      const base: EventEditorFormBase = {
        fullTitle,
        titleAbbr,
        from: toISO(ev.start),
        until: toISO(ev.end),
        note: ev.note ?? "",
        color: ev.color ?? "#4dabf7",
        displayType: normalizeDisplayType(ev.displayType),
      };

      let finalForm: EventEditorForm = base;
      if (base.displayType === "course") finalForm = toCourseForm(base, undefined, ev);
      if (base.displayType === "event") finalForm = toPartyForm(base, undefined, ev);

      setEditingEvent(ev);
      setEditorForm(finalForm);

      setHasCustomTitleAbbr(ev.isTitleAbbrCustom ?? false);
      setActivePicker(null);

      setIsCreatingNew(creating);
      createdDraftIdRef.current = creating ? ev.id : null;

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

  /**
   * ✅ NEW: When user switches type, convert the form shape so Course/Event fields become editable.
   */
  const setDisplayType = useCallback(
    (nextType: EntryDisplayType) => {
      setEditorForm((prev) => {
        if (!prev) return prev;
        if (!editingEvent) return prev;

        const next = normalizeDisplayType(nextType);
        const base = toBaseForm({ ...(prev as any), displayType: next } as any);

        if (next === "course") return toCourseForm(base, prev, editingEvent);
        if (next === "event") return toPartyForm(base, prev, editingEvent);

        // next === "none"
        return { ...base, displayType: "none" };
      });
    },
    [editingEvent],
  );

  const onChangeFullTitle = useCallback(
    (text: string) => {
      if (editingEvent?.source === "ical") return;

      setEditorForm((prev) => {
        if (!prev) return prev;

        const next: any = { ...prev, fullTitle: text };

        if (!hasCustomTitleAbbr) {
          next.titleAbbr = clampAbbr(makeTitleAbbr(text));
        }
        return next;
      });
    },
    [editingEvent?.source, hasCustomTitleAbbr, makeTitleAbbr],
  );

  const onChangeTitleAbbr = useCallback(
    (text: string) => {
      if (editingEvent?.source === "ical") return;
      const clamped = clampAbbr(text);
      setHasCustomTitleAbbr(true);
      updateForm({ titleAbbr: clamped });
    },
    [editingEvent?.source, updateForm],
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
    return (
      JSON.stringify(a) !== JSON.stringify(b) ||
      initialHasCustomAbbrRef.current !== hasCustomTitleAbbr
    );
  }, [editorForm, hasCustomTitleAbbr]);

  const requestCloseEditor = useCallback(() => {
    if (!editingEvent) return;

    if (isCreatingNew && !isDirty) {
      const draftId = createdDraftIdRef.current;
      if (draftId) setEvents((prev) => prev.filter((e) => e.id !== draftId));
      closeEditor();
      return;
    }

    closeEditor();
  }, [closeEditor, editingEvent, isCreatingNew, isDirty, setEvents]);

  const discardEditorChanges = useCallback(() => {
    if (!editingEvent) return;

    if (isCreatingNew) {
      const draftId = createdDraftIdRef.current;
      if (draftId) setEvents((prev) => prev.filter((e) => e.id !== draftId));
      closeEditor();
      return;
    }

    closeEditor();
  }, [closeEditor, editingEvent, isCreatingNew, setEvents]);

  const saveEditor = useCallback(() => {
    if (!editingEvent || !editorForm) return;
    const isIcal = editingEvent.source === "ical";

    const nextDisplayType = normalizeDisplayType(editorForm.displayType);

    // Pull type-specific edits (if any) from the current form
    const f: any = editorForm;

    const nextCourse =
      nextDisplayType === "course"
        ? {
            courseName: String(f.courseName ?? ""),
            courseType: String(f.courseType ?? ""),
            lecturer: String(f.lecturer ?? ""),
            room: String(f.room ?? ""),
          }
        : undefined;

    const invitedGroupsRaw = String(f.invitedGroups ?? "");
    const nextParty =
      nextDisplayType === "event"
        ? {
            eventName: String(f.eventName ?? ""),
            location: String(f.location ?? ""),
            createdBy: String(f.createdBy ?? ""),
            entryFee: String(f.entryFee ?? ""),
            invitedGroups: invitedGroupsRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            friendsAttending: [],
          }
        : undefined;

    if (isIcal) {
      const metaKey =
        editingEvent.metaKey ||
        makeIcalMetaKey(
          editingEvent.icalSubscriptionId || "unknown",
          editingEvent.icalEventUid || editingEvent.id,
        );

      const fullTitle = editingEvent.fullTitle ?? editingEvent.title ?? "Untitled";
      const titleAbbr = clampAbbr(editorForm.titleAbbr || makeTitleAbbr(fullTitle));

      const nextMeta: Record<string, ICalEventMeta> = {
        ...icalMeta,
        [metaKey]: {
          titleAbbr,
          note: editorForm.note,
          color: editorForm.color,
          isTitleAbbrCustom: hasCustomTitleAbbr,
          displayType: nextDisplayType,
          hidden: !!editingEvent.hidden,

          // ✅ NEW: persist course/party edits for iCal items
          course: nextCourse,
          party: nextParty,
        },
      };

      setIcalMeta(nextMeta);
      void saveIcalMeta(nextMeta);

      // Reflect immediately in UI event list
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

                // ✅ NEW: keep the edited type fields on the event object too
                course: nextCourse,
                party: nextParty,
              }
            : e,
        ),
      );

      closeEditor();
      return;
    }

    // Local event save
    const fullTitle = editorForm.fullTitle || "Untitled";
    const titleAbbr = clampAbbr(editorForm.titleAbbr || makeTitleAbbr(fullTitle));

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
    viewingEvent,
    openOverviewForEvent,
    closeOverview,

    editingEvent,
    editorForm,
    activePicker,
    setActivePicker,
    isIcalEditing,

    isCreatingNew,
    isDirty,
    requestCloseEditor,
    discardEditorChanges,

    openEditorForEvent,
    closeEditor,

    updateForm,
    setDisplayType, // ✅ NEW

    onChangeFullTitle,
    onChangeTitleAbbr,
    handlePickerChange,

    saveEditor,
    deleteEditorEvent,

    onCreate,
    onPressEvent,
  };
}
