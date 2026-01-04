// src/timetable/hooks/useTimetableSync.ts
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import type { EvWithMeta, ICalEventMeta, ICalSubscription } from "@/types/timetable";
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

export function useTimetableSync({ userId }: Params) {
  const [events, setEvents] = useState<EvWithMeta[]>([]);
  const [icalMeta, setIcalMeta] = useState<Record<string, ICalEventMeta>>({});

  const refresh = useCallback(async () => {
    try {
      const storedMeta = await loadIcalMeta();
      setIcalMeta(storedMeta);

      const serverSubs = await getICalSubscriptions(userId as any);
      const normalizedSubs: ICalSubscription[] = serverSubs.map((s: any) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
      }));

      await saveLocalICalSubscriptions(normalizedSubs);

      const serverCalendar = await getCalendarById(1 as any);
      const serverEntriesForUser = (serverCalendar.entries as any[]).filter((e) => e.user_id === userId);
      const serverLocalEvents: EvWithMeta[] = serverEntriesForUser.map(mapDtoToEvent);

      await saveLocalEvents(serverLocalEvents);

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
