import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";
import { FontAwesome } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/de";

dayjs.locale("de");

type AttachedEvent = {
  title: string;
  startIso: string;
  endIso: string;
  location?: string;
};

type Props = {
  id: string;
  profileName: string;
  source: string;
  profileImage: any;
  image: any;
  text: string;

  publishedAt?: string;

  attachedEvent?: AttachedEvent;
  eventAdded?: boolean;
  onPressAddToCalendar?: () => void;
  onPressShowEvent?: () => void;
};

function formatRelativeTime(iso?: string): string | null {
  if (!iso) return null;
  const d = dayjs(iso);
  if (!d.isValid()) return null;

  const now = dayjs();
  const seconds = Math.max(0, now.diff(d, "second"));
  if (seconds < 60) return `vor ${seconds} Sekunden`;

  const minutes = now.diff(d, "minute");
  if (minutes < 60) return `vor ${minutes} Minuten`;

  const hours = now.diff(d, "hour");
  if (hours < 24) return `vor ${hours} Stunden`;

  const days = now.diff(d, "day");
  if (days < 7) return `vor ${days} Tagen`;

  const weeks = now.diff(d, "week");
  if (weeks < 5) return `vor ${weeks} Wochen`;

  const months = now.diff(d, "month");
  if (months < 12) return `vor ${months} Monaten`;

  const years = now.diff(d, "year");
  return `vor ${years} Jahren`;
}

export function NewsEntry(props: Props) {
  const theme = useTheme();
  const {
    profileName,
    source,
    profileImage,
    image,
    text,
    publishedAt,
    attachedEvent,
    eventAdded,
    onPressAddToCalendar,
    onPressShowEvent,
  } = props;

  const relTime = useMemo(() => formatRelativeTime(publishedAt), [publishedAt]);

  const eventDateLine = useMemo(() => {
    if (!attachedEvent?.startIso) return "";
    const d = dayjs(attachedEvent.startIso);
    return `${d.format("dd, DD.MM.YYYY")} • ${d.format("HH:mm")}`;
  }, [attachedEvent?.startIso]);

  // 🎨 requested colors
  const addBtnBg = "#ffa94d"; // orange
  const showBtnBg = "#b2f2bb"; // light green

  const iconColor = "#1f2937"; // dark icon

  const iconName: React.ComponentProps<typeof FontAwesome>["name"] = eventAdded
    ? "calendar-check-o"
    : "calendar-plus-o";

  const onPress = eventAdded ? onPressShowEvent : onPressAddToCalendar;
  const bg = eventAdded ? showBtnBg : addBtnBg;

  return (
    <Surface mode="flat" elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={profileImage} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: "700" }}>
              {profileName}
            </Text>
            <Text variant="labelSmall" style={{ opacity: 0.75 }}>
              {source}
            </Text>
          </View>
        </View>
      </View>

      {/* Image */}
      <Image source={image} style={styles.hero} />

      {/* Attached event bar */}
      {attachedEvent ? (
        <View
          style={[
            styles.eventBar,
            {
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text variant="labelLarge" style={{ fontWeight: "800" }} numberOfLines={1}>
              {attachedEvent.title}
            </Text>
            <Text variant="labelSmall" style={{ opacity: 0.8 }}>
              {eventDateLine}
            </Text>
          </View>

          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: bg },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={eventAdded ? "Show event" : "Add to calendar"}
            hitSlop={8}
          >
            <FontAwesome name={iconName} size={18} color={iconColor} />
          </Pressable>
        </View>
      ) : null}

      {/* Text */}
      <View style={styles.body}>
        <Text variant="bodyMedium" style={{ lineHeight: 20 }}>
          {text}
        </Text>

        {relTime ? (
          <View style={styles.publishedWrap}>
            <Text variant="labelSmall" style={{ opacity: 0.6 }}>
              {relTime}
            </Text>
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  hero: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  eventBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    height: 36,
    width: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  publishedWrap: {
    marginTop: 10,
    alignItems: "flex-end",
  },
});
