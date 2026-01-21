import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView as RNScrollView, StyleSheet, View } from "react-native";
import { Surface, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import "dayjs/locale/de";

import { NewsEntry } from "@/components/news/NewsEntry";
import { saveCalendarEntry } from "@/src/server/calendar";
import { putNavEvent } from "@/src/timetable/utils/eventNavCache";

dayjs.locale("de");

type NewsAttachedEvent = {
  title: string;
  startIso: string;
  endIso: string;
  location?: string;
};

type NewsItem = {
  id: string;
  profileName: string;
  source: string;
  profileImage: any;
  image: any;
  text: string;

  // optional (from your earlier requirement)
  publishedAt?: string;

  // ✅ NEW
  attachedEvent?: NewsAttachedEvent;
};

const USER_ID = "1234";

// ✅ Event: ÖH Semester Opening on 28.01.2026 (Europe/Vienna local time)
const OH_EVENT_START = dayjs("2026-01-28T18:00:00"); // <-- change time here if you want
const OH_EVENT_END = OH_EVENT_START.add(3, "hour");

const NEWS: NewsItem[] = [
  {
    id: "2",
    profileName: "FH-Salzburg",
    source: "Instagram",
    profileImage: require("@/assets/example_profiles/2.png"),
    image: require("@/assets/example_news/2.png"),
    text:
      "Semesterstart heißt auch: Netzwerken! 🤝\n\n" +
      "Komm vorbei und lerne neue Leute kennen – wir freuen uns auf dich!",
    // keep if you already use it elsewhere
    publishedAt: dayjs().subtract(2, "hour").toISOString(),

    // ✅ NEW: attached event
    attachedEvent: {
      title: "ÖH Semester Opening",
      startIso: OH_EVENT_START.toISOString(),
      endIso: OH_EVENT_END.toISOString(),
      location: "FH Salzburg, Campus Urstein",

    },
  },
  {
    id: "1",
    profileName: "Uni Salzburg",
    source: "Website",
    profileImage: require("@/assets/example_profiles/1.png"),
    image: require("@/assets/example_news/1.png"),
    text: "Willkommen im neuen Semester! 🎓\n\nAlle Infos zu Fristen und Terminen findest du im Portal.",
    publishedAt: dayjs().subtract(1, "day").toISOString(),
  },
  {
    id: "3",
    profileName: "ÖH Salzburg",
    source: "Instagram",
    profileImage: require("@/assets/example_profiles/3.png"),
    image: require("@/assets/example_news/3.png"),
    text: "Wir sind für euch da! 💬\n\nSchreib uns bei Fragen jederzeit.",
    publishedAt: dayjs().subtract(5, "day").toISOString(),
  },
];

export default function NewsScreen() {
  const theme = useTheme();
  const router = useRouter();

  // store “added to calendar” state per newsId
  const [addedByNewsId, setAddedByNewsId] = useState<Record<string, { calendarEventId: string }>>({});
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    // you mentioned: when pulling at top, refresh & update “vor x …”
    setRefreshing(true);
    // no fetch here in dummy setup; just trigger rerender
    requestAnimationFrame(() => setRefreshing(false));
  }, []);

  const handleAddToCalendar = useCallback(
    async (news: NewsItem) => {
      const ev = news.attachedEvent;
      if (!ev) return;

      // Already added -> jump directly
      const existing = addedByNewsId[news.id];
      if (existing?.calendarEventId) {
        router.push({
          pathname: "/(app)/(stack)/event-overview",
          params: { id: existing.calendarEventId },
        });
        return;
      }

      try {
        const saved = await saveCalendarEntry({
          id: "", // let server generate
          user_id: USER_ID,
          title: ev.title,
          title_short: ev.title.slice(0, 10),
          date: new Date(ev.startIso) as any,
          end_date: new Date(ev.endIso) as any,
          note: `Aus News-Eintrag: ${news.profileName}`,
          color: "#69db7c", // ✅ default green for Event
          display_type: "event",
        } as any);

        // prime nav cache so event-overview can render instantly
        putNavEvent({
          id: saved.id,
          title: saved.title_short || saved.title,
          fullTitle: saved.title,
          titleAbbr: saved.title_short || saved.title,
          isTitleAbbrCustom: !!saved.title_short,
          start: { dateTime: new Date(saved.date as any).toISOString() },
          end: {
            dateTime: saved.end_date
              ? new Date(saved.end_date as any).toISOString()
              : dayjs(new Date(saved.date as any)).add(1, "hour").toISOString(),
          },
          color: saved.color ?? "#69db7c",
          note: saved.note ?? "",
          source: "local",
          displayType: "event",
        });

        setAddedByNewsId((prev) => ({ ...prev, [news.id]: { calendarEventId: saved.id } }));
      } catch (e) {
        console.warn("Failed to add attached news event to calendar:", e);
      }
    },
    [addedByNewsId, router],
  );

  const handleShowEvent = useCallback(
    (newsId: string) => {
      const id = addedByNewsId[newsId]?.calendarEventId;
      if (!id) return;

      router.push({
        pathname: "/(app)/(stack)/event-overview",
        params: { id },
      });
    },
    [addedByNewsId, router],
  );

  const rendered = useMemo(() => {
    return NEWS.map((n) => {
      const added = !!addedByNewsId[n.id]?.calendarEventId;

      return (
        <View key={n.id} style={styles.cardWrap}>
          <NewsEntry
            {...n}
            attachedEvent={n.attachedEvent}
            eventAdded={added}
            onPressAddToCalendar={() => handleAddToCalendar(n)}
            onPressShowEvent={() => handleShowEvent(n.id)}
          />
        </View>
      );
    });
  }, [addedByNewsId, handleAddToCalendar, handleShowEvent]);

  return (
    <Surface style={[styles.root, { backgroundColor: theme.colors.background }]} mode="flat" elevation={0}>
      <RNScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {rendered}
      </RNScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  cardWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
});
