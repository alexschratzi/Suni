// src/server/calendar.ts
import {
  Calendar,
  CalendarEntryDTO,
  CreateICalSubscriptionRequest,
  ICalSubscriptionDTO,
} from "../dto/calendarDTO";

const mockEntries: CalendarEntryDTO[] = [
  {
    id: "1",
    user_id: "1234",
    title: "Doctor appointment",
    title_short: "Doctor",
    date: new Date(2025, 11, 24),
  },
  {
    id: "2",
    user_id: "1234",
    title: "Project meeting with team",
    title_short: "Meeting",
    date: new Date(2025, 1, 24),
  },
];

const mockCalendar: Calendar = {
  entries: mockEntries,
};

// --- NEW: mock iCal subscriptions -------------------------------------------

let mockICalSubscriptions: ICalSubscriptionDTO[] = [
  // Example pre-existing subscription
  // {
  //   id: "sub-1",
  //   user_id: "1234",
  //   name: "FH Salzburg Stundenplan",
  //   url: "https://myplan.fh-salzburg.ac.at/en/events/ical.php?...",
  //   color: "#2196F3",
  // },
];

export interface SaveCalendarResponse {
  ok: boolean;
}

// --- iCal subscription helpers ----------------------------------------------

/**
 * Push a single iCal subscription to the "server".
 * Equivalent to POST /ical-subscriptions
 */
export async function updateICal(
  payload: CreateICalSubscriptionRequest,
): Promise<ICalSubscriptionDTO> {
  await delay(300);

  // Simple upsert by (userId + url)
  const existingIndex = mockICalSubscriptions.findIndex(
    (s) => s.user_id === payload.userId && s.url === payload.url,
  );

  if (existingIndex !== -1) {
    const updated: ICalSubscriptionDTO = {
      ...mockICalSubscriptions[existingIndex],
      name: payload.name,
      color: payload.color,
    };
    mockICalSubscriptions[existingIndex] = updated;
    return updated;
  }

  const newSub: ICalSubscriptionDTO = {
    id: `sub-${Date.now()}`,
    user_id: payload.userId,
    name: payload.name,
    url: payload.url,
    color: payload.color,
  };

  mockICalSubscriptions.push(newSub);
  return newSub;
}

/**
 * GET /ical-subscriptions?userId=...
 */
export async function getICalSubscriptions(
  userId: string,
): Promise<ICalSubscriptionDTO[]> {
  await delay(200);
  return mockICalSubscriptions.filter((s) => s.user_id === userId);
}

/**
 * "Sync" local iCal subscriptions with the server.
 *
 * - localSubs = what the app has stored locally (e.g. AsyncStorage)
 * - server merges them (upsert by url) and returns the final canonical list.
 *
 * This is effectively: push local → get_ical result.
 */
export async function syncICalSubscriptions(
  userId: string,
  localSubs: Omit<ICalSubscriptionDTO, "id" | "user_id">[],
): Promise<ICalSubscriptionDTO[]> {
  // First, upsert all local subscriptions
  for (const sub of localSubs) {
    await updateICal({
      userId,
      name: sub.name,
      url: sub.url,
      color: sub.color,
    });
  }

  // Then return the full, updated list from the "server"
  const serverSubs = await getICalSubscriptions(userId);
  return serverSubs;
}

// --- Existing mock calendar API ---------------------------------------------

/**
 * Simulate GET /calendar
 */
export async function getCalendarById(_id: number): Promise<Calendar> {
  await delay(300);
  return {
    ...mockCalendar,
    subscriptions: mockICalSubscriptions,
  };
}

export async function getCalendarByIdDate(
  _id: number,
  dateFrom: Date,
  dateTo: Date,
) {
  // Just filter entries for now; you could also expand iCal subscriptions here.
  return mockCalendar.entries.filter(
    (e) => e.date >= dateFrom && e.date <= dateTo,
  );
}

/**
 * Simulate POST/PUT /calendar
 */
export async function saveCalendar(
  _calendar: Calendar,
): Promise<SaveCalendarResponse> {
  await delay(300);
  return { ok: true };
}

// --- Helpers ----------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
