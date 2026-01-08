// src/timetable/utils/eventNavCache.ts
import type { EvWithMeta } from "@/types/timetable";

/**
 * Simple in-memory cache for passing fully-loaded event data
 * between screens without waiting for async sync on the target screen.
 *
 * - Not persisted
 * - Cleared when JS runtime reloads
 * - Enough to prevent flicker on navigation
 */
const _cache = new Map<string, EvWithMeta>();

export function putNavEvent(ev: EvWithMeta) {
  if (!ev?.id) return;
  _cache.set(ev.id, ev);
}

export function getNavEvent(id: string): EvWithMeta | null {
  return _cache.get(id) ?? null;
}

export function clearNavEvent(id: string) {
  _cache.delete(id);
}

export function clearAllNavEvents() {
  _cache.clear();
}
