// types/timetable.ts

export type EntryDisplayType = "none" | "course" | "event";

export type Ev = {
  id: string;
  title: string;
  start: { dateTime: string };
  end: { dateTime: string };
  color?: string;
};

export type EventEditorForm = {
  fullTitle: string;
  titleAbbr: string;
  from: string;
  until: string;
  note: string;
  color: string;
  displayType: EntryDisplayType;
};

export type EventSource = "local" | "ical";

export type EvWithMeta = Ev & {
  fullTitle?: string;
  titleAbbr?: string;
  isTitleAbbrCustom?: boolean;
  note?: string;

  source: EventSource;

  /**
   * New: 3-way display type used for filtering/transparency based on timetable mode.
   */
  displayType: EntryDisplayType;

  icalSubscriptionId?: string;
  icalEventUid?: string;
  metaKey?: string;
};

export type ActivePicker = "from" | "until" | null;

export type ICalSubscription = {
  id: string;
  name: string;
  url: string;
  color: string;

  /**
   * New: default display type for entries coming from this subscription.
   * null/undefined means “no selection”.
   */
  defaultDisplayType?: EntryDisplayType | null;
};

export type ICalEventMeta = {
  titleAbbr?: string;
  note?: string;
  color?: string;
  isTitleAbbrCustom?: boolean;

  /**
   * New: per-event override (e.g. user changes type of one iCal entry)
   */
  displayType?: EntryDisplayType;
};

export type RawIcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};
