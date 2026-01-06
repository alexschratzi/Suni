// src/dto/calendarDTO.ts

export type EntryDisplayTypeDTO = "none" | "course" | "event";

export interface CalendarEntryDTO {
  title: string;
  id: string;
  user_id: string;
  title_short: string;
  ical_id?: string;

  date: Date;
  end_date?: Date;

  note?: string;
  color?: string;

  /**
   * New: display type for filtering/transparency.
   * If missing, treat as "none".
   */
  display_type?: EntryDisplayTypeDTO;
}

export interface ICalSubscriptionDTO {
  id: string;
  user_id: string;
  name: string;
  url: string;
  color: string; // hex, e.g. "#2196F3"

  /**
   * New: default display type for this subscription.
   * null/undefined means “no selection”.
   */
  default_display_type?: EntryDisplayTypeDTO | null;
}

export interface Calendar {
  entries: CalendarEntryDTO[];
  subscriptions?: ICalSubscriptionDTO[];
}

// Payload used when creating/updating a new iCal subscription from the client
export interface CreateICalSubscriptionRequest {
  userId: string;
  name: string;
  url: string;
  color: string;
  defaultDisplayType?: EntryDisplayTypeDTO | null;
}
