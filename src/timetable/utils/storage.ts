// src/timetable/utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EvWithMeta, ICalEventMeta, ICalSubscription } from "@/types/timetable";

const ICAL_ASYNC_KEY = "ical_subscriptions_v1";
const LOCAL_EVENTS_KEY = "timetable_local_events_v1";
const ICAL_EVENT_META_KEY = "ical_event_meta_v1";

export async function saveLocalICalSubscriptions(subs: ICalSubscription[]) {
  try {
    await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(subs));
  } catch (e) {
    console.warn("Failed to save local iCal subs:", e);
  }
}

export async function loadLocalEvents(): Promise<EvWithMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EvWithMeta[];

    // Backward-compat: ensure `source` exists for older stored events
    return parsed.map((e) => ({ ...e, source: e.source ?? "local" }));
  } catch (e) {
    console.warn("Failed to load local events:", e);
    return [];
  }
}

export async function saveLocalEvents(allEvents: EvWithMeta[]) {
  try {
    const localOnly = allEvents.filter((e) => e.source === "local");
    await AsyncStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(localOnly));
  } catch (e) {
    console.warn("Failed to save local events:", e);
  }
}

export async function loadIcalMeta(): Promise<Record<string, ICalEventMeta>> {
  try {
    const raw = await AsyncStorage.getItem(ICAL_EVENT_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load iCal event meta:", e);
    return {};
  }
}

export async function saveIcalMeta(meta: Record<string, ICalEventMeta>) {
  try {
    await AsyncStorage.setItem(ICAL_EVENT_META_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn("Failed to save iCal event meta:", e);
  }
}
