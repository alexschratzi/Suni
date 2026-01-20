// app/(app)/(stack)/(tabs)/news.tsx
import React from "react";
import {
  ScrollView as RNScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Surface, useTheme } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { NewsEntry } from "@/components/news/NewsEntry";

type NewsItem = {
  id: string;
  profileName: string;
  source: string;
  profileImage: any;
  image: any;
  text: string;
  publishedAt: number; // epoch ms
};

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
      // e.g. ~40 seconds ago
      publishedAt: now - 3 * 60 * 60 * 1000,
    },
  ];
}

export default function NewsScreen() {
  const theme = useTheme();
  const scrollRef = React.useRef<RNScrollView | null>(null);

  const { scrollToTop } = useLocalSearchParams<{ scrollToTop?: string }>();

  const [news] = React.useState<NewsItem[]>(() => buildInitialNews());

  // This value is only used to force re-render so relative time updates
  const [nowTick, setNowTick] = React.useState<number>(() => Date.now());

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);

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
        {news.map((item) => (
          <NewsEntry
            key={item.id}
            profileName={item.profileName}
            source={item.source}
            profileImage={item.profileImage}
            imageSource={item.image}
            text={item.text}
            publishedAt={item.publishedAt}
            now={nowTick}
          />
        ))}
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
