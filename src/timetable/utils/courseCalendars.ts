// src/timetable/utils/courseCalendars.ts
import { getICalSubscriptions, updateICal, deleteICalSubscription } from "@/src/server/calendar";
import { notifyICalChanged } from "@/src/utils/calendarSyncEvents";
import { lockCourseIcalSubscriptionId, unlockCourseIcalSubscriptionId } from "@/src/timetable/utils/storage";

/**
 * TODO: replace with real auth.
 * Must match your screens right now.
 */
const DEFAULT_USER_ID = "1234";

/**
 * Adds an iCal subscription that is considered "course-managed" (locked in UI).
 * Returns the created/updated subscription id.
 */
export async function addCourseCalender(universityName: string, icalUrl: string): Promise<string> {
  const userId = DEFAULT_USER_ID;

  const name = String(universityName || "").trim() || "Course Calendar";
  const url = String(icalUrl || "").trim();
  if (!url) throw new Error("IcalURL must not be empty.");

  // Create/update server/mock record
  await updateICal({
    userId,
    name,
    url,
    color: "#9E9E9E", // neutral grey base; UI will additionally grey-out locked items
    defaultDisplayType: "course",
  });

  // Resolve ID by refetching
  const subs = (await getICalSubscriptions(userId)) as any[];
  const match = subs.find((s) => String(s.url || "").trim().toLowerCase() === url.toLowerCase());

  if (!match?.id) {
    throw new Error("Subscription was created but id could not be resolved.");
  }

  const id = String(match.id);
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
