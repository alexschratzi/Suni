// src/timetable/utils/mapping.ts
import type { EvWithMeta } from "@/types/timetable";
import type { CalendarEntryDTO } from "@/src/dto/calendarDTO";
import { makeTitleAbbr, toISO } from "@/src/timetable/utils/date";

const DEFAULT_EVENT_DURATION_MIN = 60;

function normalizeDisplayType(v: any): "none" | "course" | "event" {
  return v === "course" || v === "event" || v === "none" ? v : "none";
}

export function mapDtoToEvent(entry: CalendarEntryDTO): EvWithMeta {
  const fullTitle = entry.title;
  const titleAbbr = entry.title_short || makeTitleAbbr(fullTitle);

  const start = new Date(entry.date as any);
  const end = entry.end_date
    ? new Date(entry.end_date as any)
    : new Date(start.getTime() + DEFAULT_EVENT_DURATION_MIN * 60000);

  return {
    id: entry.id,
    title: titleAbbr,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    color: entry.color || "#4dabf7",
    fullTitle,
    titleAbbr,
    isTitleAbbrCustom: !!entry.title_short,
    note: entry.note,
    source: "local",
    displayType: normalizeDisplayType((entry as any).display_type),
  };
}

export function mapEventToDto(ev: EvWithMeta, userId: string): CalendarEntryDTO {
  const fullTitle = ev.fullTitle || ev.title || "";
  const titleAbbr = ev.titleAbbr || makeTitleAbbr(fullTitle || "Untitled");

  const startIso = toISO(ev.start);
  const endIso = toISO(ev.end);

  const startDate = new Date(startIso);
  const endDate = new Date(endIso);

  return {
    id: ev.id,
    user_id: userId as any,
    title: fullTitle || titleAbbr,
    title_short: titleAbbr,
    date: startDate as any,
    end_date: endDate as any,
    note: ev.note,
    color: ev.color,
    display_type: normalizeDisplayType((ev as any).displayType),
  };
}
