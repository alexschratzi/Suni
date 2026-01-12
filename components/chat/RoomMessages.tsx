/**
 * RoomMessages.tsx
 * Shows messages for a public thread and the input bar.
 */

import React from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { ActivityIndicator, Text, Menu, Surface, Avatar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import InputBar from "./InputBar";
import { createAttachmentUrl } from "@/src/lib/chatAttachments";
import { createAvatarUrl } from "@/src/lib/avatars";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";
import { initials } from "@/utils/utils";

type RoomKey = "salzburg" | "oesterreich" | "wirtschaft";

type Message = {
  id: string;
  sender?: string;
  username?: string;
  text: string;
  timestamp?: any;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
};

type Props = {
  room: RoomKey;
  locale: string;
  messages: Message[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  inputHeight: number;
  setInputHeight: (h: number) => void;
  sendMessage: () => void;
  onBack: () => void;
  t: (key: string) => string;
  theme: any;
  router: Router;
  accentColor: string;
  uploadAttachment?: () => void;
  attachment?: AttachmentDraft | null;
  clearAttachment?: () => void;
};

type SortOrder = "newest" | "oldest" | "popular" | "unpopular";

export default function RoomMessages(props: Props) {
  const {
    room,
    locale,
    messages,
    loading,
    input,
    setInput,
    inputHeight,
    setInputHeight,
    sendMessage,
    onBack,
    t,
    theme,
    router,
    accentColor,
    uploadAttachment,
    attachment,
    clearAttachment,
  } = props;
  const userId = useSupabaseUserId();
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("newest");
  const [sortMenuVisible, setSortMenuVisible] = React.useState(false);
  const [voteStats, setVoteStats] = React.useState<
    Record<string, { score: number; myVote: number }>
  >({});
  const [avatarUrls, setAvatarUrls] = React.useState<Record<string, string | null>>(
    {}
  );

  const roomTitle =
    room === "salzburg"
      ? t("chat.rooms.salzburg.title")
      : room === "oesterreich"
      ? t("chat.rooms.oesterreich.title")
      : t("chat.rooms.wirtschaft.title");

  const toDate = (value: any) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.toDate === "function") return value.toDate();
    return null;
  };

  const formatTimestamp = (value: any) => {
    const dateValue = toDate(value);
    if (!dateValue) return t("chat.justNow");
    return dateValue.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openThread = (message: Message) => {
    router.push({
      pathname: "/(app)/(stack)/reply",
      params: {
        room,
        messageId: message.id,
        messageText: message.text,
        messageUser: message.username ?? "???",
        messageAttachmentPath: message.attachmentPath ?? "",
        messageAttachmentName: message.attachmentName ?? "",
      },
    });
  };

  const openAttachment = async (message: Message) => {
    if (!message.attachmentPath) return;
    try {
      const url = await createAttachmentUrl(message.attachmentPath);
      if (!url) {
        console.warn("Attachment URL unavailable");
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error("Attachment open failed:", err);
    }
  };

  const sortedMessages = React.useMemo(() => {
    if (sortOrder === "newest") return messages;
    const list = [...messages];

    if (sortOrder === "oldest") return list.reverse();

    const getTime = (value: any) => {
      const dateValue = toDate(value);
      return dateValue ? dateValue.getTime() : 0;
    };

    if (sortOrder === "popular") {
      return list.sort((a, b) => {
        const scoreA = voteStats[a.id]?.score ?? 0;
        const scoreB = voteStats[b.id]?.score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return getTime(b.timestamp) - getTime(a.timestamp);
      });
    }

    return list.sort((a, b) => {
      const scoreA = voteStats[a.id]?.score ?? 0;
      const scoreB = voteStats[b.id]?.score ?? 0;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return getTime(b.timestamp) - getTime(a.timestamp);
    });
  }, [messages, sortOrder, voteStats]);

  const sortLabel =
    sortOrder === "popular"
      ? t("chat.sort.popular")
      : sortOrder === "unpopular"
      ? t("chat.sort.unpopular")
      : sortOrder === "oldest"
      ? t("chat.sort.oldest")
      : t("chat.sort.newest");

  const openSortMenu = React.useCallback(() => {
    if (sortMenuVisible) {
      setSortMenuVisible(false);
      setTimeout(() => setSortMenuVisible(true), 0);
      return;
    }
    setSortMenuVisible(true);
  }, [sortMenuVisible]);

  const closeSortMenu = React.useCallback(() => {
    setSortMenuVisible(false);
  }, []);

  const handleSortSelect = React.useCallback(
    (next: SortOrder) => {
      setSortOrder(next);
      closeSortMenu();
    },
    [closeSortMenu]
  );

  React.useEffect(() => {
    let cancelled = false;
    const messageIds = messages.map((msg) => msg.id).filter(Boolean);

    const loadVotes = async () => {
      if (!userId || messageIds.length === 0) {
        setVoteStats({});
        return;
      }

      const { data, error } = await supabase
        .from(TABLES.roomMessageVotes)
        .select(
          [
            COLUMNS.roomMessageVotes.messageId,
            COLUMNS.roomMessageVotes.userId,
            COLUMNS.roomMessageVotes.value,
          ].join(",")
        )
        .in(COLUMNS.roomMessageVotes.messageId, messageIds);

      if (error) {
        console.error("Room message votes load error:", error.message);
        return;
      }
      if (cancelled) return;

      const next: Record<string, { score: number; myVote: number }> = {};
      messageIds.forEach((id) => {
        next[id] = { score: 0, myVote: 0 };
      });

      (data || []).forEach((row: any) => {
        const messageId = row?.[COLUMNS.roomMessageVotes.messageId];
        if (!messageId) return;
        const value = Number(row?.[COLUMNS.roomMessageVotes.value]) || 0;
        if (!next[messageId]) next[messageId] = { score: 0, myVote: 0 };
        next[messageId].score += value;
        if (row?.[COLUMNS.roomMessageVotes.userId] === userId) {
          next[messageId].myVote = value;
        }
      });

      setVoteStats(next);
    };

    loadVotes();

    return () => {
      cancelled = true;
    };
  }, [messages, userId]);

  React.useEffect(() => {
    const senderIds = Array.from(
      new Set(messages.map((msg) => msg.sender).filter(Boolean))
    ) as string[];
    const missing = senderIds.filter((id) => !(id in avatarUrls));
    if (missing.length === 0) return;

    let cancelled = false;

    const loadAvatars = async () => {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(`${COLUMNS.profiles.id},${COLUMNS.profiles.avatarPath}`)
        .in(COLUMNS.profiles.id, missing);

      if (error) {
        console.error("Room avatar load error:", error.message);
        return;
      }

      const base = Object.fromEntries(missing.map((id) => [id, null]));
      const entries = await Promise.all(
        (data || []).map(async (row: any) => {
          const id = row?.[COLUMNS.profiles.id];
          if (!id) return null;
          const path = row?.[COLUMNS.profiles.avatarPath] ?? null;
          const url = await createAvatarUrl(path);
          return [id, url] as const;
        })
      );
      const resolved = entries.filter(Boolean) as Array<readonly [string, string | null]>;

      if (cancelled) return;
      setAvatarUrls((prev) => ({
        ...prev,
        ...base,
        ...Object.fromEntries(resolved),
      }));
    };

    loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [messages, avatarUrls]);

  const handleVote = async (messageId: string, value: 1 | -1) => {
    if (!userId) return;
    const current = voteStats[messageId]?.myVote ?? 0;

    if (current === value) {
      const { error } = await supabase
        .from(TABLES.roomMessageVotes)
        .delete()
        .eq(COLUMNS.roomMessageVotes.messageId, messageId)
        .eq(COLUMNS.roomMessageVotes.userId, userId);

      if (error) {
        console.error("Room message vote remove failed:", error.message);
        return;
      }

      setVoteStats((prev) => ({
        ...prev,
        [messageId]: {
          score: (prev[messageId]?.score ?? 0) - value,
          myVote: 0,
        },
      }));
      return;
    }

    const { error } = await supabase
      .from(TABLES.roomMessageVotes)
      .upsert(
        {
          [COLUMNS.roomMessageVotes.messageId]: messageId,
          [COLUMNS.roomMessageVotes.userId]: userId,
          [COLUMNS.roomMessageVotes.value]: value,
        },
        {
          onConflict: `${COLUMNS.roomMessageVotes.messageId},${COLUMNS.roomMessageVotes.userId}`,
        }
      );

    if (error) {
      console.error("Room message vote update failed:", error.message);
      return;
    }

    setVoteStats((prev) => {
      const prevScore = prev[messageId]?.score ?? 0;
      const nextScore = prevScore - current + value;
      return {
        ...prev,
        [messageId]: { score: nextScore, myVote: value },
      };
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View
        style={[
          styles.roomHeader,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      >
        <View style={styles.roomHeaderLeft}>
          <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={accentColor} />
          </TouchableOpacity>
          <Text style={[styles.roomTitle, { color: theme.colors.onSurface }]}>
            {roomTitle}
          </Text>
        </View>
      </View>

      <View style={styles.sortRow}>
        <Menu
          visible={sortMenuVisible}
          onDismiss={closeSortMenu}
          anchor={
            <TouchableOpacity
              onPress={openSortMenu}
              style={[
                styles.sortAnchor,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="swap-vertical" size={16} color={accentColor} />
              <Text style={[styles.sortText, { color: theme.colors.onSurface }]}>
                {t("chat.sort.label")}: {sortLabel}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          }
        >
        <Menu.Item
          onPress={() => handleSortSelect("newest")}
          title={t("chat.sort.newest")}
        />
        <Menu.Item
          onPress={() => handleSortSelect("oldest")}
          title={t("chat.sort.oldest")}
        />
        <Menu.Item
          onPress={() => handleSortSelect("popular")}
          title={t("chat.sort.popular")}
        />
        <Menu.Item
          onPress={() => handleSortSelect("unpopular")}
          title={t("chat.sort.unpopular")}
        />
      </Menu>
    </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text
            style={{
              marginTop: 8,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {t("chat.loadingMessages")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 12,
          }}
          renderItem={({ item }) => {
            const timeLabel = formatTimestamp(item.timestamp);
            const nameLabel = item.username || "???";
            const hasText = !!item.text;
            const hasAttachment = !!item.attachmentPath;
            const vote = voteStats[item.id] ?? { score: 0, myVote: 0 };
            const upActive = vote.myVote === 1;
            const downActive = vote.myVote === -1;
            const avatarUrl = item.sender ? avatarUrls[item.sender] : null;

            return (
              <View style={styles.messageRow}>
                <View style={styles.voteColumn}>
                  <TouchableOpacity
                    onPress={() => handleVote(item.id, 1)}
                    style={styles.voteButton}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={
                        upActive ? theme.colors.primary : theme.colors.onSurfaceVariant
                      }
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.voteScore,
                      {
                        color: upActive
                          ? theme.colors.primary
                          : downActive
                          ? theme.colors.error
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {vote.score}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleVote(item.id, -1)}
                    style={styles.voteButton}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={
                        downActive ? theme.colors.error : theme.colors.onSurfaceVariant
                      }
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  onPress={() => openThread(item)}
                  activeOpacity={0.7}
                  style={styles.messageTap}
                >
                  <Surface
                    style={[
                      styles.threadCard,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                        borderLeftColor: accentColor,
                      },
                    ]}
                    mode="elevated"
                  >
                    <View style={styles.metaRow}>
                      <View style={styles.metaLeft}>
                        {avatarUrl ? (
                          <Avatar.Image
                            size={22}
                            source={{ uri: avatarUrl }}
                            style={{ backgroundColor: theme.colors.surfaceVariant }}
                          />
                        ) : (
                          <Avatar.Text
                            size={22}
                            label={initials(nameLabel)}
                            color={theme.colors.onPrimary}
                            style={{ backgroundColor: accentColor }}
                          />
                        )}
                        <Text
                          style={[
                            styles.metaUser,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                          numberOfLines={1}
                        >
                          {nameLabel}
                        </Text>
                      </View>
                      <Text
                        style={[styles.metaTime, { color: theme.colors.onSurfaceVariant }]}
                        numberOfLines={1}
                      >
                        {timeLabel}
                      </Text>
                    </View>
                    {hasText && (
                      <Text style={[styles.msgText, { color: theme.colors.onSurface }]}>
                        {item.text}
                      </Text>
                    )}
                    {hasAttachment && (
                      <TouchableOpacity
                        onPress={() => openAttachment(item)}
                        activeOpacity={0.7}
                        style={styles.attachmentRow}
                      >
                        <Ionicons name="attach" size={16} color={accentColor} />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.attachmentText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {item.attachmentName || "file"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Surface>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <InputBar
        input={input}
        setInput={setInput}
        inputHeight={inputHeight}
        setInputHeight={setInputHeight}
        sendMessage={sendMessage}
        placeholder={t("chat.inputPlaceholder")}
        accentColor={accentColor}
        uploadAttachment={uploadAttachment}
        attachment={attachment}
        clearAttachment={clearAttachment}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roomHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  roomTitle: { fontSize: 18, fontWeight: "600", marginLeft: 6 },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sortRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sortAnchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  sortText: {
    fontSize: 13,
    fontWeight: "600",
  },
  messageRow: {
    marginBottom: 12,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  messageTap: {
    flex: 1,
  },
  voteColumn: {
    width: 34,
    alignItems: "center",
    marginRight: 6,
    paddingTop: 8,
  },
  voteButton: {
    paddingVertical: 2,
  },
  voteScore: {
    fontSize: 12,
    fontWeight: "600",
    marginVertical: 2,
  },
  threadCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaUser: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    flexShrink: 1,
  },
  metaTime: {
    fontSize: 12,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 20,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  attachmentText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
});
