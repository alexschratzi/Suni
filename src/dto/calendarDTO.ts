// src/dto/calendarDTO.ts

export interface CalendarEntryDTO {
  title: string;
  id: string;
  user_id: string;
  title_short: string;
  ical_id?: string;
  date: Date;
}

export interface ICalSubscriptionDTO {
  id: string;
  user_id: string;
  name: string;
  url: string;
  color: string; // hex, e.g. "#2196F3"
}

export interface Calendar {
  entries: CalendarEntryDTO[];
  subscriptions?: ICalSubscriptionDTO[];
}

// Payload used when creating a new iCal subscription from the client
export interface CreateICalSubscriptionRequest {
  userId: string;
  name: string;
  url: string;
  color: string;
}
