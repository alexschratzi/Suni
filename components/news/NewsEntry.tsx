// components/news/NewsEntry.tsx
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

export type NewsEntryProps = {
  profileName: string;
  source: string;
  profileImage: any;
  imageSource: any;
  text: string;
};

const MAX_WIDE = 21 / 9; // crop super-wide panoramas
const MAX_TALL = 9 / 21; // crop super-tall portraits

function clampAspectRatio(ar: number) {
  if (!Number.isFinite(ar) || ar <= 0) return 1;
  if (ar > MAX_WIDE) return MAX_WIDE;
  if (ar < MAX_TALL) return MAX_TALL;
  return ar;
}

export function NewsEntry({
  profileName,
  source,
  profileImage,
  imageSource,
  text,
}: NewsEntryProps) {
  const theme = useTheme();

  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);

  // ✅ measured width of the image container
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const toggleExpanded = () => setExpanded((v) => !v);
  const toggleLiked = () => setLiked((v) => !v);
  const toggleFollowing = () => setFollowing((v) => !v);

  const onShare = useCallback(async () => {
    try {
      await Share.share({ message: text });
    } catch {}
  }, [text]);

  const likeIcon = useMemo(
    () => (liked ? "heart" : "heart-outline"),
    [liked]
  );

  // ✅ natural aspect ratio from local asset + clamp to 21:9 extremes
  const aspectRatio = useMemo(() => {
    const src = Image.resolveAssetSource(imageSource);
    const w = src?.width ?? 0;
    const h = src?.height ?? 0;
    const natural = w > 0 && h > 0 ? w / h : 1;
    return clampAspectRatio(natural);
  }, [imageSource]);

  // ✅ compute explicit height from measured width
  const imageHeight = useMemo(() => {
    if (!containerWidth) return 200; // fallback before layout
    return Math.round(containerWidth / aspectRatio);
  }, [containerWidth, aspectRatio]);

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
      name={
        (following
          ? "checkmark-outline"
          : "person-add-outline") as any
      }
      size={size}
      color={color}
    />
  )}
  compact
>
  {following ? "Gefolgt" : "Folgen"}
</Button>


      </View>

      {/* ─────────── Image (explicit width + height) ─────────── */}
      <View
        style={[styles.imageClip, { backgroundColor: theme.colors.surfaceVariant }]}
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          // avoid state spam
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

      {/* ─────────── Text ─────────── */}
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

        {/* ─────────── Bottom Actions ─────────── */}
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
              <Ionicons
                name={"share-social-outline" as any}
                size={size}
                color={color}
              />
            )}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 16,
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

  // IMPORTANT: this is the width reference we measure
  imageClip: {
    width: "100%",
    overflow: "hidden",
  },

  content: {
    paddingTop: 12,
  },
  moreLess: {
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
});
