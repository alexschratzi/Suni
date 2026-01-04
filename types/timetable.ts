// types/timetable.ts
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
};

export type EventSource = "local" | "ical";

export type EvWithMeta = Ev & {
  fullTitle?: string;
  titleAbbr?: string;
  isTitleAbbrCustom?: boolean;
  note?: string;

  source: EventSource;

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
};

export type ICalEventMeta = {
  titleAbbr?: string;
  note?: string;
  color?: string;
  isTitleAbbrCustom?: boolean;
};

export type RawIcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};
