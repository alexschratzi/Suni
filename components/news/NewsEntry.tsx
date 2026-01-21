import React, { useCallback, useMemo, useState } from "react";
import { Image, Pressable, Share, StyleSheet, View } from "react-native";
import {
  Card,
  Text,
  useTheme,
  Button,
  IconButton,
  Avatar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/de";

dayjs.locale("de");

export type AttachedEvent = {
  title: string;
  startIso: string;
  endIso: string;
  location?: string;
};

export type NewsEntryProps = {
  profileName: string;
  source: string;
  profileImage: any;
  imageSource: any;
  text: string;

  // baseline
  publishedAt: number; // epoch ms
  now: number; // epoch ms

  // ✅ NEW optional attachment
  attachedEvent?: AttachedEvent;
  eventAdded?: boolean;
  onPressAddToCalendar?: () => void;
  onPressShowEvent?: () => void;
};

const MAX_WIDE = 21 / 9; // crop super-wide panoramas
const MAX_TALL = 9 / 21; // crop super-tall portraits

function clampAspectRatio(ar: number) {
  if (!Number.isFinite(ar) || ar <= 0) return 1;
  if (ar > MAX_WIDE) return MAX_WIDE;
  if (ar < MAX_TALL) return MAX_TALL;
  return ar;
}

function formatRelativeGerman(nowMs: number, publishedMs: number): string {
  const diffMs = Math.max(0, nowMs - publishedMs);
  const sec = Math.floor(diffMs / 1000);

  if (sec < 60) return `vor ${sec} Sekunde${sec === 1 ? "" : "n"}`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Minute${min === 1 ? "" : "n"}`;

  const hour = Math.floor(min / 60);
  if (hour < 24) return `vor ${hour} Stunde${hour === 1 ? "" : "n"}`;

  const day = Math.floor(hour / 24);
  if (day < 7) return `vor ${day} Tag${day === 1 ? "" : "en"}`;

  const week = Math.floor(day / 7);
  if (week < 4) return `vor ${week} Woche${week === 1 ? "" : "n"}`;

  const month = Math.floor(day / 30);
  if (month < 12) return `vor ${month} Monat${month === 1 ? "" : "en"}`;

  const year = Math.floor(day / 365);
  return `vor ${year} Jahr${year === 1 ? "" : "en"}`;
}

export function NewsEntry({
  profileName,
  source,
  profileImage,
  imageSource,
  text,
  publishedAt,
  now,
  attachedEvent,
  eventAdded,
  onPressAddToCalendar,
  onPressShowEvent,
}: NewsEntryProps) {
  const theme = useTheme();

  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);

  const [containerWidth, setContainerWidth] = useState<number>(0);

  const toggleExpanded = () => setExpanded((v) => !v);
  const toggleLiked = () => setLiked((v) => !v);
  const toggleFollowing = () => setFollowing((v) => !v);

  const onShare = useCallback(async () => {
    try {
      await Share.share({ message: text });
    } catch {}
  }, [text]);

  const likeIcon = useMemo(() => (liked ? "heart" : "heart-outline"), [liked]);

  const aspectRatio = useMemo(() => {
    const src = Image.resolveAssetSource(imageSource);
    const w = src?.width ?? 0;
    const h = src?.height ?? 0;
    const natural = w > 0 && h > 0 ? w / h : 1;
    return clampAspectRatio(natural);
  }, [imageSource]);

  const imageHeight = useMemo(() => {
    if (!containerWidth) return 200;
    return Math.round(containerWidth / aspectRatio);
  }, [containerWidth, aspectRatio]);

  const relativeTime = useMemo(() => formatRelativeGerman(now, publishedAt), [now, publishedAt]);

  const eventDateLine = useMemo(() => {
    if (!attachedEvent?.startIso) return "";
    const d = dayjs(attachedEvent.startIso);
    return `${d.format("dd, DD.MM.YYYY")} • ${d.format("HH:mm")}`;
  }, [attachedEvent?.startIso]);

  const eventAction = useCallback(() => {
    if (!attachedEvent) return;
    if (eventAdded) onPressShowEvent?.();
    else onPressAddToCalendar?.();
  }, [attachedEvent, eventAdded, onPressAddToCalendar, onPressShowEvent]);

  return (
    <Card style={styles.card} mode="elevated">
      {/* ─────────── Top Bar ─────────── */}
      <View style={styles.topBar}>
        <View style={styles.profileLeft}>
          <Avatar.Image size={40} source={profileImage} />
          <View style={styles.profileTextWrap}>
            <Text
              variant="titleSmall"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.profileName}
            >
              {profileName}
            </Text>

            <Text
              variant="labelSmall"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {source}
            </Text>
          </View>
        </View>

        <Button
          mode={following ? "outlined" : "contained"}
          onPress={toggleFollowing}
          icon={({ size, color }) => (
            <Ionicons
              name={(following ? "checkmark-outline" : "person-add-outline") as any}
              size={size}
              color={color}
            />
          )}
          compact
        >
          {following ? "Gefolgt" : "Folgen"}
        </Button>
      </View>

      {/* ─────────── Image ─────────── */}
      <View
        style={[styles.imageClip, { backgroundColor: theme.colors.surfaceVariant }]}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w && w !== containerWidth) setContainerWidth(w);
        }}
      >
        <Image
          source={imageSource}
          resizeMode="cover"
          style={{
            width: containerWidth || "100%",
            height: imageHeight,
          }}
        />
      </View>

      {/* ─────────── ✅ Attached Event Bar (between image and text) ─────────── */}
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

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {eventDateLine}
              {attachedEvent.location ? ` • ${attachedEvent.location}` : ""}
            </Text>
          </View>

          <Button
            mode={eventAdded ? "contained" : "contained-tonal"}
            onPress={eventAction}
            icon={({ size, color }) => (
              <Ionicons
                name={(eventAdded ? "calendar" : "calendar-outline") as any}
                size={size}
                color={color}
              />
            )}
            compact
          >
            {eventAdded ? "Show event" : "Add to calendar"}
          </Button>
        </View>
      ) : null}

      {/* ─────────── Text + Bottom Row ─────────── */}
      <Card.Content style={styles.content}>
        <Pressable onPress={toggleExpanded}>
          <Text variant="bodyMedium" numberOfLines={expanded ? undefined : 4}>
            {text}
          </Text>

          <Text
            variant="labelSmall"
            style={[styles.moreLess, { color: theme.colors.primary }]}
          >
            {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
          </Text>
        </Pressable>

        {/* Bottom actions + time */}
        <View style={styles.bottomRow}>
          <View style={styles.actionsRow}>
            <IconButton
              onPress={toggleLiked}
              icon={({ size, color }) => (
                <Ionicons name={likeIcon as any} size={size} color={color} />
              )}
              iconColor={liked ? theme.colors.primary : theme.colors.onSurface}
            />

            <IconButton
              onPress={onShare}
              icon={({ size, color }) => (
                <Ionicons name={"share-social-outline" as any} size={size} color={color} />
              )}
            />
          </View>

          <Text
            variant="labelSmall"
            style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}
          >
            {relativeTime}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    overflow: "hidden",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  profileTextWrap: {
    marginLeft: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  profileName: {
    fontWeight: "600",
  },

  imageClip: {
    width: "100%",
    overflow: "hidden",
  },

  // ✅ Event bar styling
  eventBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  content: {
    paddingTop: 12,
  },
  moreLess: {
    marginTop: 6,
  },

  bottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  timeText: {
    marginBottom: 10, // aligns visually with icon buttons
  },
});
