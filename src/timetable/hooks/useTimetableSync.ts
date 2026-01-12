import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import type {
  EvWithMeta,
  ICalEventMeta,
  ICalSubscription,
  EntryDisplayType,
} from "@/types/timetable";
import { subscribeICalChanged } from "@/src/utils/calendarSyncEvents";
import { getCalendarById, getICalSubscriptions } from "@/src/server/calendar";

import { fetchIcalEventsForSubscription } from "@/src/timetable/utils/ics";
import { mapDtoToEvent } from "@/src/timetable/utils/mapping";
import { makeIcalMetaKey, makeTitleAbbr } from "@/src/timetable/utils/date";
import {
  loadIcalMeta,
  loadLocalEvents,
  saveLocalEvents,
  saveLocalICalSubscriptions,
} from "@/src/timetable/utils/storage";

type Params = {
  userId: string;
};

function normalizeDisplayType(v: any): EntryDisplayType {
  return v === "none" || v === "course" || v === "event" ? v : "none";
}

function normalizeDisplayTypeOrNull(v: any): EntryDisplayType | null {
  if (v === null || v === undefined) return null;
  return v === "none" || v === "course" || v === "event" ? v : null;
}

/**
 * Merge local-only extended fields that are not represented in the server DTO,
 * so they don't get wiped on refresh.
 */
function mergeLocalExtras(serverEv: EvWithMeta, localEv?: EvWithMeta): EvWithMeta {
  if (!localEv) return serverEv;

  return {
    ...serverEv,

    // keep any richer fields that server doesn't store
    course: localEv.course ?? serverEv.course,
    party: localEv.party ?? serverEv.party,

    // optional: keep hidden flag if you use it for local events
    hidden: localEv.hidden ?? serverEv.hidden,

    // optional: if you want to preserve fullTitle/titleAbbr customization
    fullTitle: localEv.fullTitle ?? serverEv.fullTitle,
    titleAbbr: localEv.titleAbbr ?? serverEv.titleAbbr,
    isTitleAbbrCustom: localEv.isTitleAbbrCustom ?? serverEv.isTitleAbbrCustom,
    note: localEv.note ?? serverEv.note,

    // keep displayType if you ever had mismatches
    displayType: normalizeDisplayType(localEv.displayType ?? serverEv.displayType),
  };
}

export function useTimetableSync({ userId }: Params) {
  const [events, setEvents] = useState<EvWithMeta[]>([]);
  const [icalMeta, setIcalMeta] = useState<Record<string, ICalEventMeta>>({});

  const refresh = useCallback(async () => {
    try {
      // ✅ local cache (needed to preserve course/party fields)
      const localCachedEvents = await loadLocalEvents();
      const localById = new Map(localCachedEvents.map((e) => [e.id, e]));

      // iCal meta
      const storedMeta = await loadIcalMeta();
      setIcalMeta(storedMeta);

      // subs
      const serverSubs = await getICalSubscriptions(userId as any);
      const normalizedSubs: ICalSubscription[] = serverSubs.map((s: any) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
        defaultDisplayType: normalizeDisplayTypeOrNull(s.default_display_type),
      }));
      await saveLocalICalSubscriptions(normalizedSubs);

      // ✅ server local events
      const serverCalendar = await getCalendarById(1 as any);
      const serverEntriesForUser = (serverCalendar.entries as any[]).filter(
        (e) => e.user_id === userId,
      );

      const serverLocalEventsRaw: EvWithMeta[] = serverEntriesForUser.map(mapDtoToEvent);

      // ✅ IMPORTANT: merge local-only extras back in
      const serverLocalEvents: EvWithMeta[] = serverLocalEventsRaw.map((ev) =>
        mergeLocalExtras(ev, localById.get(ev.id)),
      );

      // update local cache with merged view
      await saveLocalEvents(serverLocalEvents);

      // ✅ iCal events
      let allIcalEvents: EvWithMeta[] = [];

      for (const sub of normalizedSubs) {
        const rawEvents = await fetchIcalEventsForSubscription(sub);

        const mapped: EvWithMeta[] = rawEvents.map((raw) => {
          const metaKey = makeIcalMetaKey(sub.id, raw.uid);
          const meta = storedMeta[metaKey];

          const fullTitle = raw.summary || sub.name;
          const baseAbbr = makeTitleAbbr(fullTitle);

          const color = meta?.color ?? sub.color ?? "#4dabf7";
          const titleAbbr = meta?.titleAbbr ?? baseAbbr;

          const displayType = normalizeDisplayType(
            meta?.displayType ?? sub.defaultDisplayType ?? "none",
          );

          return {
            id: metaKey,
            title: titleAbbr,
            start: { dateTime: raw.start },
            end: { dateTime: raw.end },
            color,
            fullTitle,
            titleAbbr,
            note: meta?.note ?? "",
            isTitleAbbrCustom: meta?.isTitleAbbrCustom ?? false,
            source: "ical",
            displayType,
            hidden: meta?.hidden ?? false,

            // ✅ allow iCal course/party edits to show up
            course: meta?.course,
            party: meta?.party,

            icalSubscriptionId: sub.id,
            icalEventUid: raw.uid,
            metaKey,
          };
        });

        allIcalEvents = allIcalEvents.concat(mapped);
      }

      setEvents([...allIcalEvents, ...serverLocalEvents]);
    } catch (e) {
      console.warn("Failed to sync on timetable focus:", e);
      const storedLocalEvents = await loadLocalEvents();
      setEvents(storedLocalEvents);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const unsubscribe = subscribeICalChanged(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  return {
    events,
    setEvents,
    icalMeta,
    setIcalMeta,
    refresh,
  };
}
