// src/timetable/utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EvWithMeta, ICalEventMeta, ICalSubscription } from "@/types/timetable";

const ICAL_ASYNC_KEY = "ical_subscriptions_v1";
const LOCAL_EVENTS_KEY = "timetable_local_events_v1";
const ICAL_EVENT_META_KEY = "ical_event_meta_v1";

function normalizeDisplayType(v: any): "none" | "course" | "event" {
  return v === "course" || v === "event" || v === "none" ? v : "none";
}

function normalizeSubDefaultDisplayType(v: any): "none" | "course" | "event" | null {
  if (v === null || v === undefined) return null;
  return v === "course" || v === "event" || v === "none" ? v : null;
}

export async function saveLocalICalSubscriptions(subs: ICalSubscription[]) {
  try {
    const normalized = subs.map((s) => ({
      ...s,
      defaultDisplayType: normalizeSubDefaultDisplayType((s as any).defaultDisplayType),
    }));
    await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn("Failed to save local iCal subs:", e);
  }
}

export async function loadLocalEvents(): Promise<EvWithMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EvWithMeta[];

    // Backward-compat: ensure `source` and `displayType` exist for older stored events
    return parsed.map((e: any) => ({
      ...e,
      source: e.source ?? "local",
      displayType: normalizeDisplayType(e.displayType),
    }));
  } catch (e) {
    console.warn("Failed to load local events:", e);
    return [];
  }
}

export async function saveLocalEvents(allEvents: EvWithMeta[]) {
  try {
    const localOnly = allEvents
      .filter((e) => e.source === "local")
      .map((e: any) => ({
        ...e,
        displayType: normalizeDisplayType(e.displayType),
      }));

    await AsyncStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(localOnly));
  } catch (e) {
    console.warn("Failed to save local events:", e);
  }
}

export async function loadIcalMeta(): Promise<Record<string, ICalEventMeta>> {
  try {
    const raw = await AsyncStorage.getItem(ICAL_EVENT_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ICalEventMeta>;

    // Backward-compat: normalize any stored displayType values if present
    const out: Record<string, ICalEventMeta> = {};
    for (const k of Object.keys(parsed)) {
      const m: any = parsed[k];
      out[k] = {
        ...m,
        displayType: m.displayType ? normalizeDisplayType(m.displayType) : undefined,
      };
    }
    return out;
  } catch (e) {
    console.warn("Failed to load iCal event meta:", e);
    return {};
  }
}

export async function saveIcalMeta(meta: Record<string, ICalEventMeta>) {
  try {
    // Normalize displayType before writing
    const normalized: Record<string, ICalEventMeta> = {};
    for (const k of Object.keys(meta)) {
      const m: any = meta[k];
      normalized[k] = {
        ...m,
        displayType: m.displayType ? normalizeDisplayType(m.displayType) : undefined,
      };
    }

    await AsyncStorage.setItem(ICAL_EVENT_META_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.warn("Failed to save iCal event meta:", e);
  }
}
