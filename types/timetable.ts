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
  // For now these are editable fields in the Course edit window (even if derived later).
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

  /**
   * Display type drives overview + edit windows and calendar filtering/transparency.
   */
  displayType: EntryDisplayType;

  /**
   * Hide flag (new)
   * - local: persisted in local events storage / server sync
   * - ical: persisted via ICalEventMeta override
   */
  hidden?: boolean;

  /**
   * Optional structured fields used by the type-specific UI.
   * (For iCal, you’ll later derive these from raw ics summary/location/etc.)
   */
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

  /**
   * New: allow hiding iCal items via meta override
   */
  hidden?: boolean;
};

export type RawIcalEvent = {
  uid: string;
  summary: string;
  start: string;
  end: string;
};
