// src/timetable/utils/courseCalendars.ts
import {
  getICalSubscriptions,
  updateICal,
  deleteICalSubscription,
} from "@/src/server/calendar";
import { notifyICalChanged } from "@/src/utils/calendarSyncEvents";
import {
  lockCourseIcalSubscriptionId,
  unlockCourseIcalSubscriptionId,
} from "@/src/timetable/utils/storage";
import type { EntryDisplayTypeDTO, ICalSubscriptionDTO } from "@/src/dto/calendarDTO";

import { DEFAULT_COLORS } from "@/src/timetable/utils/defaultColors";

/**
 * TODO: replace with real auth.
 * Must match your screens right now.
 */
const DEFAULT_USER_ID = "1234";

function normalizeForExactCompare(s: string): string {
  // You said: "dont do sanitize url if the strings match it is enough"
  // -> We'll only trim, so accidental whitespace does not create duplicates.
  return String(s ?? "").trim();
}

async function findSubscriptionByUrl(
  userId: string,
  url: string,
): Promise<ICalSubscriptionDTO | null> {
  const target = normalizeForExactCompare(url);
  if (!target) return null;

  const subs = await getICalSubscriptions(userId);
  const match = subs.find((s) => normalizeForExactCompare(String(s.url ?? "")) === target);
  return match ?? null;
}

/**
 * Adds an iCal subscription that is considered "course-managed" (locked in UI).
 * If the URL already exists (exact string match after trim), returns the existing id.
 *
 * ✅ Change: course calendars should use the default COURSE color (blue), not grey.
 */
export async function addCourseCalender(
  universityName: string,
  icalUrl: string,
  type: EntryDisplayTypeDTO,
): Promise<string> {
  const userId = DEFAULT_USER_ID;

  const name = String(universityName || "").trim() || "Course Calendar";
  const url = normalizeForExactCompare(icalUrl);
  if (!url) throw new Error("IcalURL must not be empty.");

  // default color for course calendars
  const defaultCourseColor = DEFAULT_COLORS.course;

  // 1) If already exists -> update metadata + lock + return id
  const existing = await findSubscriptionByUrl(userId, url);
  if (existing?.id) {
    await updateICal({
      userId,
      name,
      url,
      color: defaultCourseColor, // ✅ was "#9E9E9E"
      defaultDisplayType: "course",
    });

    const id = String(existing.id);
    await lockCourseIcalSubscriptionId(id);
    notifyICalChanged();
    return id;
  }

  // 2) Else create
  await updateICal({
    userId,
    name,
    url,
    color: defaultCourseColor, // ✅ was "#9E9E9E"
    defaultDisplayType: "course",
  });

  // 3) Resolve by exact URL match
  const created = await findSubscriptionByUrl(userId, url);
  if (!created?.id) {
    throw new Error("Subscription was created but id could not be resolved.");
  }

  const id = String(created.id);
  await lockCourseIcalSubscriptionId(id);

  notifyICalChanged();
  return id;
}

/**
 * Removes an iCal subscription by id and un-locks it locally.
 */
export async function removeCourseCalender(id: string): Promise<void> {
  const userId = DEFAULT_USER_ID;

  const sid = String(id);
  await deleteICalSubscription(userId, sid);
  await unlockCourseIcalSubscriptionId(sid);

  notifyICalChanged();
}

/**
 * Removes an iCal subscription by URL (exact string match after trim).
 * No-op if not found.
 */
export async function removeCourseCalenderByUrl(icalUrl: string): Promise<void> {
  const userId = DEFAULT_USER_ID;

  const url = normalizeForExactCompare(icalUrl);
  if (!url) return;

  const match = await findSubscriptionByUrl(userId, url);
  if (!match?.id) return;

  const sid = String(match.id);
  await deleteICalSubscription(userId, sid);
  await unlockCourseIcalSubscriptionId(sid);

  notifyICalChanged();
}

/**
 * Optional helper: get ID by URL (exact string match after trim).
 */
export async function getCourseCalendarIdByUrl(icalUrl: string): Promise<string | null> {
  const userId = DEFAULT_USER_ID;

  const url = normalizeForExactCompare(icalUrl);
  if (!url) return null;

  const match = await findSubscriptionByUrl(userId, url);
  return match?.id ? String(match.id) : null;
}
