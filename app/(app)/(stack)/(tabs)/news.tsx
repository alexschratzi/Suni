import React from "react";
import {
  ScrollView as RNScrollView,
  StyleSheet,
  RefreshControl,
  View,
} from "react-native";
import { Surface, useTheme } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  publishedAt: number; // epoch ms

  // ✅ NEW (optional)
  attachedEvent?: NewsAttachedEvent;
};

const USER_ID = "1234";

// ÖH Semester Opening on 28.01.2026
const OH_EVENT_START = dayjs("2026-01-28T18:00:00");
const OH_EVENT_END = OH_EVENT_START.add(3, "hour");

// Helper: create stable demo publish dates
function buildInitialNews(): NewsItem[] {
  const now = Date.now();
  return [
    {
      id: "2",
      profileName: "FH-Salzburg",
      source: "Instagram",
      profileImage: require("@/assets/example_profiles/2.png"),
      image: require("@/assets/example_news/2.png"),
      text:
        "Semesterstart heißt auch: Netzwerken! 🤝 Diese Woche finden mehrere Einführungsveranstaltungen, " +
        "Info-Sessions und Get-togethers statt. Nutzt die Gelegenheit, Lehrende und Mitstudierende kennenzulernen. " +
        "Alle Termine findet ihr wie immer im offiziellen Kalender.",
      publishedAt: now - 20 * 1000,

      // ✅ NEW attached event
      attachedEvent: {
        title: "ÖH Semester Opening",
        startIso: OH_EVENT_START.toISOString(),
        endIso: OH_EVENT_END.toISOString(),
        location: "FH Salzburg, Campus Urstein",
      },
    },
    {
      id: "3",
      profileName: "ORF Salzburg",
      source: "orf.at",
      profileImage: require("@/assets/example_profiles/3.png"),
      image: require("@/assets/example_news/3.png"),
      text:
        "Mehr Studierende, mehr Verkehr: 🚦 Mit dem Start des Sommersemesters rechnet die Stadt Salzburg " +
        "wieder mit erhöhtem Verkehrsaufkommen rund um die Hochschulen. Öffentliche Verkehrsmittel werden empfohlen, " +
        "zusätzliche Busse sind zu Stoßzeiten eingeplant.",
      publishedAt: now - 12 * 60 * 1000,
    },
    {
      id: "1",
      profileName: "ÖH",
      source: "Facebook",
      profileImage: require("@/assets/example_profiles/1.png"),
      image: require("@/assets/example_news/1.png"),
      text:
        "Willkommen zurück an der Uni! 🎓 Die ersten Vorlesungen starten, die Bibliothek füllt sich wieder " +
        "und der Campus erwacht aus dem Winterschlaf. Checkt früh eure Kursanmeldungen und Stundenpläne – " +
        "gerade in der ersten Woche gibt es oft noch Raum- und Zeitänderungen.",
      publishedAt: now - 3 * 60 * 60 * 1000,
    },
  ];
}

export default function NewsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const scrollRef = React.useRef<RNScrollView | null>(null);

  // ✅ keeps your old “jump to top” behavior
  const { scrollToTop } = useLocalSearchParams<{ scrollToTop?: string }>();

  const [news] = React.useState<NewsItem[]>(() => buildInitialNews());

  // Force re-render so relative time updates
  const [nowTick, setNowTick] = React.useState<number>(() => Date.now());

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);

  // “Added to calendar” state per news id
  const [addedByNewsId, setAddedByNewsId] = React.useState<Record<string, { calendarEventId: string }>>(
    {},
  );

  React.useEffect(() => {
    if (!scrollToTop) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollToTop]);

  // Auto-update relative time every 30s
  React.useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    // In a real app: fetch latest news here.
    // For now: just update "now" to refresh relative time display.
    setNowTick(Date.now());

    // small delay so the UI shows the refresh
    await new Promise((r) => setTimeout(r, 300));
    setRefreshing(false);
  }, []);

  const handleAddToCalendar = React.useCallback(
    async (item: NewsItem) => {
      const ev = item.attachedEvent;
      if (!ev) return;

      const existing = addedByNewsId[item.id];
      if (existing?.calendarEventId) {
        router.push({
          pathname: "/(app)/(stack)/event-overview",
          params: { id: existing.calendarEventId },
        });
        return;
      }

      try {
        const saved = await saveCalendarEntry({
          id: "",
          user_id: USER_ID,
          title: ev.title,
          title_short: ev.title.slice(0, 10),
          date: new Date(ev.startIso) as any,
          end_date: new Date(ev.endIso) as any,
          note: `Aus News-Eintrag: ${item.profileName}${ev.location ? `\nOrt: ${ev.location}` : ""}`,
          color: "#69db7c",
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

        setAddedByNewsId((prev) => ({ ...prev, [item.id]: { calendarEventId: saved.id } }));
      } catch (e) {
        console.warn("Failed to add attached news event to calendar:", e);
      }
    },
    [addedByNewsId, router],
  );

  const handleShowEvent = React.useCallback(
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

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <RNScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {news.map((item) => {
          const eventAdded = !!addedByNewsId[item.id]?.calendarEventId;

          return (
            <View key={item.id} style={{ marginBottom: 16 }}>
              <NewsEntry
                profileName={item.profileName}
                source={item.source}
                profileImage={item.profileImage}
                imageSource={item.image}
                text={item.text}
                publishedAt={item.publishedAt}
                now={nowTick}
                // ✅ event attachment
                attachedEvent={item.attachedEvent}
                eventAdded={eventAdded}
                onPressAddToCalendar={() => handleAddToCalendar(item)}
                onPressShowEvent={() => handleShowEvent(item.id)}
              />
            </View>
          );
        })}
      </RNScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
});
