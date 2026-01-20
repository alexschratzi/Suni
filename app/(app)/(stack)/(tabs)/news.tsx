// app/(app)/(stack)/(tabs)/news.tsx
import React from "react";
import { ScrollView as RNScrollView, StyleSheet } from "react-native";
import { Surface, useTheme } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { NewsEntry } from "@/components/news/NewsEntry";

const NEWS = [
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
  },
];

export default function NewsScreen() {
  const theme = useTheme();
  const scrollRef = React.useRef<RNScrollView | null>(null);

  const { scrollToTop } = useLocalSearchParams<{ scrollToTop?: string }>();

  React.useEffect(() => {
    if (!scrollToTop) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollToTop]);

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <RNScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 20 }}>
        {NEWS.map((item) => (
          <NewsEntry
            key={item.id}
            profileName={item.profileName}
            source={item.source}
            profileImage={item.profileImage}
            imageSource={item.image}
            text={item.text}
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
