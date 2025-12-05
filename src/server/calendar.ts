import { Calendar, CalendarEntryDTO } from "../dto/calendarDTO";

const mockEntries: CalendarEntryDTO[] = [
  {
    id: "1",
    user_id: "1234",
    title: "Doctor appointment",
    title_short: "Doctor",
    date: new Date(2025, 11, 24)
  },
  {
    id: "2",
    user_id: "1234",
    title: "Project meeting with team",
    title_short: "Meeting",
    date: new Date(2025, 1, 24)
  },
];

const mockCalendar: Calendar = {
  entries: mockEntries,
};

export async function updateICal(url: string): Promise<Calendar> {
    return mockCalendar;
}

/**
 * Simulate GET /calendar
 * Returns a Promise so you can later replace the implementation
 * with a real network request.
 */
export async function getCalendarById(id: number): Promise<Calendar> {
  // Optional: simulate network delay
  await delay(300);
  return mockCalendar;
}

export async function getCalendarByIdDate(id: number, dateFrom: Date, dateTo: Date) {
    return mockCalendar.entries.filter(e => e.date >= dateFrom && e.date <= dateTo);
}

export interface SaveCalendarResponse {
  ok: boolean;
}

/**
 * Simulate POST/PUT /calendar
 * For now: do nothing with the data, just return { ok: true }.
 */
export async function saveCalendar(
  _calendar: Calendar,
): Promise<SaveCalendarResponse> {
  // In the future, replace this with a real fetch/axios call.
  await delay(300);
  return { ok: true };
}

// --- Helpers ----------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
