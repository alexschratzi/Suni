// types/timetable.ts

export type EntryDisplayType = "none" | "course" | "event";

export type Ev = {
  id: string;
  title: string;
  start: { dateTime: string };
  end: { dateTime: string };
  color?: string;
};

export type EventEditorFormBase = {
  fullTitle: string;
  titleAbbr: string;
  from: string;
  until: string;
  note: string;
  color: string;
  displayType: EntryDisplayType;
};

export type CourseEditorForm = EventEditorFormBase & {
  courseName: string;
  courseType: string;
  lecturer: string;
  room: string;
};

export type PartyEditorForm = EventEditorFormBase & {
  eventName: string;
  location: string;
  createdBy: string;
  entryFee: string;
  invitedGroups: string; // comma separated for now
};

export type EventEditorForm = EventEditorFormBase | CourseEditorForm | PartyEditorForm;

export type EventSource = "local" | "ical";

export type CourseInfo = {
  courseName: string;
  courseType: string;
  lecturer: string;
  room: string;
};

export type PartyInfo = {
  eventName: string;
  location: string;
  createdBy: string;
  entryFee: string;
  invitedGroups: string[];
  friendsAttending: string[];
};

export type EvWithMeta = Ev & {
  fullTitle?: string;
  titleAbbr?: string;
  isTitleAbbrCustom?: boolean;
  note?: string;

  source: EventSource;

  displayType: EntryDisplayType;

  hidden?: boolean;

  course?: Partial<CourseInfo>;
  party?: Partial<PartyInfo>;

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
  defaultDisplayType?: EntryDisplayType | null;
};

export type ICalEventMeta = {
  titleAbbr?: string;
  note?: string;
  color?: string;
  isTitleAbbrCustom?: boolean;

  displayType?: EntryDisplayType;

  hidden?: boolean;

  /**
   * ✅ NEW: persist type-specific fields for iCal items too
   * (so Course/Event can be edited and kept)
   */
  course?: Partial<CourseInfo>;
  party?: Partial<PartyInfo>;
};

export type RawIcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};
