// src/server/calendar.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Calendar,
  CalendarEntryDTO,
  CreateICalSubscriptionRequest,
  ICalSubscriptionDTO,
} from "../dto/calendarDTO";

/**
 * "Mock server" that simulates persistence using AsyncStorage.
 *
 * It exposes:
 *  - iCal subscriptions:
 *      - updateICal
 *      - getICalSubscriptions
 *      - deleteICalSubscription
 *      - syncICalSubscriptions
 *  - Events:
 *      - getCalendarById
 *      - getCalendarByIdDate
 *      - saveCalendar  (bulk)
 *      - saveCalendarEntry
 *      - deleteCalendarEntry
 */

export interface SaveCalendarResponse {
  ok: boolean;
}

// AsyncStorage keys
const ENTRIES_KEY = "mock_calendar_entries_v1";
const ICAL_KEY = "mock_ical_subscriptions_v1";

// Seed data for first run
const DEFAULT_ENTRIES: CalendarEntryDTO[] = [
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

const DEFAULT_ICAL_SUBSCRIPTIONS: ICalSubscriptionDTO[] = [
  // Start empty; you can add a seed subscription if you want:
  // {
  //   id: "sub-1",
  //   user_id: "1234",
  //   name: "FH Salzburg Stundenplan",
  //   url: "https://myplan.fh-salzburg.ac.at/en/events/ical.php?...",
  //   color: "#2196F3",
  // },
];

/* -------------------------------------------------------------------------- */
/* Helpers: load/save from AsyncStorage                                       */
/* -------------------------------------------------------------------------- */

async function loadEntries(): Promise<CalendarEntryDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) {
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(DEFAULT_ENTRIES));
      return DEFAULT_ENTRIES;
    }
    const parsed: CalendarEntryDTO[] = JSON.parse(raw);

    // ⬇️ make sure date & end_date are real Date objects again
    return parsed.map((e) => ({
      ...e,
      date: new Date(e.date),
      end_date: e.end_date ? new Date(e.end_date) : undefined,
    }));
  } catch (e) {
    console.warn("Failed to load calendar entries from storage:", e);
    return DEFAULT_ENTRIES;
  }
}


async function saveEntries(entries: CalendarEntryDTO[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("Failed to save calendar entries to storage:", e);
  }
}

async function loadICalSubscriptions(): Promise<ICalSubscriptionDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(ICAL_KEY);
    if (!raw) {
      await AsyncStorage.setItem(
        ICAL_KEY,
        JSON.stringify(DEFAULT_ICAL_SUBSCRIPTIONS),
      );
      return DEFAULT_ICAL_SUBSCRIPTIONS;
    }
    const parsed: ICalSubscriptionDTO[] = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.warn("Failed to load iCal subscriptions from storage:", e);
    return DEFAULT_ICAL_SUBSCRIPTIONS;
  }
}

async function saveICalSubscriptions(
  subs: ICalSubscriptionDTO[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(ICAL_KEY, JSON.stringify(subs));
  } catch (e) {
    console.warn("Failed to save iCal subscriptions to storage:", e);
  }
}

/* -------------------------------------------------------------------------- */
/* iCal subscription API                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Create or update a single iCal subscription (upsert by userId + url).
 * Simulates POST/PUT /ical-subscriptions.
 */
export async function updateICal(
  payload: CreateICalSubscriptionRequest,
): Promise<ICalSubscriptionDTO> {
  await delay(300);

  const { userId, name, url, color } = payload;
  const subs = await loadICalSubscriptions();

  const existingIndex = subs.findIndex(
    (s) => s.user_id === userId && s.url === url,
  );

  if (existingIndex !== -1) {
    const updated: ICalSubscriptionDTO = {
      ...subs[existingIndex],
      name,
      color,
    };
    subs[existingIndex] = updated;
    await saveICalSubscriptions(subs);
    return updated;
  }

  const newSub: ICalSubscriptionDTO = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    user_id: userId,
    name,
    url,
    color,
  };

  subs.push(newSub);
  await saveICalSubscriptions(subs);
  return newSub;
}

/**
 * GET /ical-subscriptions?userId=...
 */
export async function getICalSubscriptions(
  userId: string,
): Promise<ICalSubscriptionDTO[]> {
  await delay(200);
  const subs = await loadICalSubscriptions();
  return subs.filter((s) => s.user_id === userId);
}

/**
 * DELETE /ical-subscriptions/:id?userId=...
 */
export async function deleteICalSubscription(
  userId: string,
  id: string,
): Promise<void> {
  await delay(200);
  const subs = await loadICalSubscriptions();
  const filtered = subs.filter(
    (sub) => !(sub.user_id === userId && sub.id === id),
  );
  await saveICalSubscriptions(filtered);
}

/**
 * Sync local iCal subscriptions from the client with the server.
 *
 * - localSubs: what the client currently has stored locally (no id/user_id)
 * - Server upserts them (by url) and then returns the full canonical list.
 *
 * This is still available, but your timetable currently just reads
 * from the server instead of pushing local → server for deletions.
 */
export async function syncICalSubscriptions(
  userId: string,
  localSubs: Omit<ICalSubscriptionDTO, "id" | "user_id">[],
): Promise<ICalSubscriptionDTO[]> {
  for (const sub of localSubs) {
    await updateICal({
      userId,
      name: sub.name,
      url: sub.url,
      color: sub.color,
    });
  }

  const serverSubs = await getICalSubscriptions(userId);
  return serverSubs;
}

/* -------------------------------------------------------------------------- */
/* Calendar events API                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Simulate GET /calendar/:id
 */
export async function getCalendarById(_id: number): Promise<Calendar> {
  await delay(300);
  const entries = await loadEntries();
  const subs = await loadICalSubscriptions();

  return {
    entries,
    subscriptions: subs,
  };
}

/**
 * Simulate GET /calendar/:id?from=...&to=...
 */
export async function getCalendarByIdDate(
  _id: number,
  dateFrom: Date,
  dateTo: Date,
): Promise<CalendarEntryDTO[]> {
  await delay(200);
  const entries = await loadEntries();

  return entries.filter(
    (e) => e.date >= dateFrom && e.date <= dateTo,
  );
}

/**
 * Simulate POST/PUT /calendar
 *
 * Bulk overwrite:
 * - Whatever you send as calendar.entries becomes the authoritative list.
 */
export async function saveCalendar(
  calendar: Calendar,
): Promise<SaveCalendarResponse> {
  await delay(300);
  await saveEntries(calendar.entries);
  return { ok: true };
}

/**
 * Simulate POST/PUT /calendar/entries (single entry)
 *
 * Upsert:
 *  - If entry.id exists → update that entry
 *  - Else → create a new id and append
 */
export async function saveCalendarEntry(
  entry: CalendarEntryDTO,
): Promise<CalendarEntryDTO> {
  await delay(200);

  const entries = await loadEntries();
  let result: CalendarEntryDTO;

  if (entry.id) {
    const idx = entries.findIndex((e) => e.id === entry.id);
    if (idx !== -1) {
      const updated: CalendarEntryDTO = {
        ...entries[idx],
        ...entry,
      };
      entries[idx] = updated;
      result = updated;
    } else {
      const newEntry: CalendarEntryDTO = {
        ...entry,
        id: entry.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      entries.push(newEntry);
      result = newEntry;
    }
  } else {
    const newEntry: CalendarEntryDTO = {
      ...entry,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    entries.push(newEntry);
    result = newEntry;
  }

  await saveEntries(entries);
  return result;
}

/**
 * Simulate DELETE /calendar/entries/:id?userId=...
 */
export async function deleteCalendarEntry(
  userId: string,
  id: string,
): Promise<void> {
  await delay(200);

  const entries = await loadEntries();
  const filtered = entries.filter(
    (e) => !(e.user_id === userId && e.id === id),
  );
  await saveEntries(filtered);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
