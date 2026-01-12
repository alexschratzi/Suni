// app/(app)/(stack)/reply.tsx
import { useEffect, useState } from "react";
import React from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Text, Surface, useTheme, IconButton, Menu, Avatar } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import InputBar from "@/components/chat/InputBar";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { createAvatarUrl } from "@/src/lib/avatars";
import {
  createAttachmentUrl,
  pickAttachment,
  uploadAttachment,
} from "@/src/lib/chatAttachments";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";
import { initials } from "@/utils/utils";

type SortOrder = "newest" | "oldest" | "popular" | "unpopular";

export default function ReplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const {
    room,
    messageId,
    messageText,
    messageUser,
    dmId,
    messageAttachmentPath,
    messageAttachmentName,
  } = useLocalSearchParams();
  const userId = useSupabaseUserId();
  const toSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const isUuid = (value: string | undefined) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  const roomValue = toSingle(room);
  const messageIdValue = toSingle(messageId);
  const dmIdValue = toSingle(dmId);
  const messageAttachmentPathValue = toSingle(messageAttachmentPath);
  const messageAttachmentNameValue = toSingle(messageAttachmentName);
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";
  const headerTitle = dmIdValue ? "Chat" : "Antworten";

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [voteStats, setVoteStats] = useState<
    Record<string, { score: number; myVote: number }>
  >({});
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    if (!userId) {
      setUsername("");
      setBlocked([]);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(COLUMNS.profiles.username)
        .eq(COLUMNS.profiles.id, userId)
        .maybeSingle();

      if (error) {
        console.error("Reply profile load error:", error.message);
        return;
      }
      if (cancelled) return;
      setUsername((data as any)?.[COLUMNS.profiles.username] ?? "");
    };

    const loadBlocked = async () => {
      const { data, error } = await supabase
        .from(TABLES.blocks)
        .select(COLUMNS.blocks.blockedId)
        .eq(COLUMNS.blocks.blockerId, userId);

      if (error) {
        console.error("Reply blocked load error:", error.message);
        return;
      }
      if (cancelled) return;
      const ids = (data || []).map((row: any) => row?.[COLUMNS.blocks.blockedId]);
      setBlocked(ids.filter(Boolean));
    };

    const loadAll = async () => {
      await Promise.all([loadProfile(), loadBlocked()]);
    };

    loadAll();

    const channel = supabase
      .channel(`reply-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: TABLES.profiles,
          filter: `${COLUMNS.profiles.id}=eq.${userId}`,
        },
        loadProfile
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.blocks,
          filter: `${COLUMNS.blocks.blockerId}=eq.${userId}`,
        },
        loadBlocked
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Load replies (DM or group thread)
  useEffect(() => {
    // === DM THREAD ===
    if (dmIdValue) {
      let cancelled = false;

      const loadDmReplies = async () => {
        const { data, error } = await supabase
          .from(TABLES.dmMessages)
          .select(
            [
              COLUMNS.dmMessages.id,
              COLUMNS.dmMessages.senderId,
              COLUMNS.dmMessages.username,
              COLUMNS.dmMessages.text,
              COLUMNS.dmMessages.createdAt,
              COLUMNS.dmMessages.attachmentPath,
              COLUMNS.dmMessages.attachmentName,
              COLUMNS.dmMessages.attachmentMime,
              COLUMNS.dmMessages.attachmentSize,
            ].join(",")
          )
          .eq(COLUMNS.dmMessages.threadId, dmIdValue)
          .order(COLUMNS.dmMessages.createdAt, { ascending: true });

        if (error) {
          console.error("DM replies load error:", error.message);
          if (!cancelled) setReplies([]);
          return;
        }

        if (cancelled) return;
        const all =
          (data || []).map((row: any) => ({
            id: row?.[COLUMNS.dmMessages.id],
            sender: row?.[COLUMNS.dmMessages.senderId],
            username: row?.[COLUMNS.dmMessages.username],
            text: row?.[COLUMNS.dmMessages.text] ?? "",
            timestamp: row?.[COLUMNS.dmMessages.createdAt],
            attachmentPath: row?.[COLUMNS.dmMessages.attachmentPath] ?? null,
            attachmentName: row?.[COLUMNS.dmMessages.attachmentName] ?? null,
            attachmentMime: row?.[COLUMNS.dmMessages.attachmentMime] ?? null,
            attachmentSize: row?.[COLUMNS.dmMessages.attachmentSize] ?? null,
          })) || [];
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
        setVoteStats({});
      };

      loadDmReplies();

      const channel = supabase
        .channel(`dm-replies-${dmIdValue}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLES.dmMessages,
            filter: `${COLUMNS.dmMessages.threadId}=eq.${dmIdValue}`,
          },
          loadDmReplies
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }

    // === GROUP CHAT THREAD ===
    if (roomValue && messageIdValue) {
      if (!isUuid(messageIdValue)) {
        setReplies([]);
        return;
      }

      let cancelled = false;

      const loadRoomReplies = async () => {
        const { data, error } = await supabase
          .from(TABLES.roomReplies)
          .select(
            [
              COLUMNS.roomReplies.id,
              COLUMNS.roomReplies.senderId,
              COLUMNS.roomReplies.username,
              COLUMNS.roomReplies.text,
              COLUMNS.roomReplies.createdAt,
              COLUMNS.roomReplies.attachmentPath,
              COLUMNS.roomReplies.attachmentName,
              COLUMNS.roomReplies.attachmentMime,
              COLUMNS.roomReplies.attachmentSize,
            ].join(",")
          )
          .eq(COLUMNS.roomReplies.roomMessageId, messageIdValue)
          .order(COLUMNS.roomReplies.createdAt, { ascending: true });

        if (error) {
          console.error("Room replies load error:", error.message);
          if (!cancelled) setReplies([]);
          return;
        }

        if (cancelled) return;
        const all =
          (data || []).map((row: any) => ({
            id: row?.[COLUMNS.roomReplies.id],
            sender: row?.[COLUMNS.roomReplies.senderId],
            username: row?.[COLUMNS.roomReplies.username],
            text: row?.[COLUMNS.roomReplies.text] ?? "",
            timestamp: row?.[COLUMNS.roomReplies.createdAt],
            attachmentPath: row?.[COLUMNS.roomReplies.attachmentPath] ?? null,
            attachmentName: row?.[COLUMNS.roomReplies.attachmentName] ?? null,
            attachmentMime: row?.[COLUMNS.roomReplies.attachmentMime] ?? null,
            attachmentSize: row?.[COLUMNS.roomReplies.attachmentSize] ?? null,
          })) || [];
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
        if (!cancelled) {
          await loadReplyVotes(filtered.map((item) => item.id));
        }
      };

      loadRoomReplies();

      const channel = supabase
        .channel(`room-replies-${messageIdValue}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLES.roomReplies,
            filter: `${COLUMNS.roomReplies.roomMessageId}=eq.${messageIdValue}`,
          },
          loadRoomReplies
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }
  }, [roomValue, messageIdValue, dmIdValue, blocked]);

  useEffect(() => {
    if (!dmIdValue || !userId) return;
    const now = new Date().toISOString();
    supabase
      .from(TABLES.dmReads)
      .upsert(
        {
          [COLUMNS.dmReads.threadId]: dmIdValue,
          [COLUMNS.dmReads.userId]: userId,
          [COLUMNS.dmReads.lastReadAt]: now,
        },
        { onConflict: `${COLUMNS.dmReads.threadId},${COLUMNS.dmReads.userId}` }
      )
      .then(({ error }) => {
        if (error) {
          console.error("DM read update error:", error.message);
        }
      });
  }, [dmIdValue, replies.length, userId]);

  useEffect(() => {
    const senderIds = Array.from(
      new Set(replies.map((reply) => reply.sender).filter(Boolean))
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
        console.error("Reply avatar load error:", error.message);
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
  }, [replies, avatarUrls]);

  const loadReplyVotes = async (replyIds: string[]) => {
    if (!userId || replyIds.length === 0) {
      setVoteStats({});
      return;
    }

    const { data, error } = await supabase
      .from(TABLES.roomReplyVotes)
      .select(
        [
          COLUMNS.roomReplyVotes.replyId,
          COLUMNS.roomReplyVotes.userId,
          COLUMNS.roomReplyVotes.value,
        ].join(",")
      )
      .in(COLUMNS.roomReplyVotes.replyId, replyIds);

    if (error) {
      console.error("Reply votes load error:", error.message);
      return;
    }

    const next: Record<string, { score: number; myVote: number }> = {};
    replyIds.forEach((id) => {
      next[id] = { score: 0, myVote: 0 };
    });

    (data || []).forEach((row: any) => {
      const replyId = row?.[COLUMNS.roomReplyVotes.replyId];
      if (!replyId) return;
      const value = Number(row?.[COLUMNS.roomReplyVotes.value]) || 0;
      if (!next[replyId]) next[replyId] = { score: 0, myVote: 0 };
      next[replyId].score += value;
      if (row?.[COLUMNS.roomReplyVotes.userId] === userId) {
        next[replyId].myVote = value;
      }
    });

    setVoteStats(next);
  };

  const handleVote = async (replyId: string, value: 1 | -1) => {
    if (!userId) return;
    const current = voteStats[replyId]?.myVote ?? 0;

    if (current === value) {
      const { error } = await supabase
        .from(TABLES.roomReplyVotes)
        .delete()
        .eq(COLUMNS.roomReplyVotes.replyId, replyId)
        .eq(COLUMNS.roomReplyVotes.userId, userId);

      if (error) {
        console.error("Vote remove failed:", error.message);
        return;
      }

      setVoteStats((prev) => ({
        ...prev,
        [replyId]: {
          score: (prev[replyId]?.score ?? 0) - value,
          myVote: 0,
        },
      }));
      return;
    }

    const { error } = await supabase
      .from(TABLES.roomReplyVotes)
      .upsert(
        {
          [COLUMNS.roomReplyVotes.replyId]: replyId,
          [COLUMNS.roomReplyVotes.userId]: userId,
          [COLUMNS.roomReplyVotes.value]: value,
        },
        {
          onConflict: `${COLUMNS.roomReplyVotes.replyId},${COLUMNS.roomReplyVotes.userId}`,
        }
      );

    if (error) {
      console.error("Vote update failed:", error.message);
      return;
    }

    setVoteStats((prev) => {
      const prevScore = prev[replyId]?.score ?? 0;
      const nextScore = prevScore - current + value;
      return {
        ...prev,
        [replyId]: { score: nextScore, myVote: value },
      };
    });
  };

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

  const handlePickAttachment = async () => {
    const next = await pickAttachment();
    if (next) setAttachment(next);
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  const openAttachment = async (path?: string | null) => {
    if (!path) return;
    try {
      const url = await createAttachmentUrl(path);
      if (!url) {
        console.warn("Attachment URL unavailable");
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error("Attachment open failed:", err);
    }
  };

  // Send message
  const sendReply = async () => {
    const messageText = input.trim();
    if ((!messageText && !attachment) || !username || !userId) return;

    try {
      const isDirect = !!dmIdValue;
      const isRoomReply = !!roomValue && !!messageIdValue;
      if (!isDirect && !isRoomReply) return;

      const now = new Date().toISOString();
      let uploaded = null;

      if (attachment) {
        const prefix = isDirect
          ? `dm/${dmIdValue}`
          : `rooms/${roomValue}/replies/${messageIdValue}`;
        uploaded = await uploadAttachment(attachment, prefix);
      }

      // === DM ===
      if (dmIdValue) {
        const { data: thread, error: threadErr } = await supabase
          .from(TABLES.dmThreads)
          .select(COLUMNS.dmThreads.userIds)
          .eq(COLUMNS.dmThreads.id, dmIdValue)
          .maybeSingle();

        if (threadErr) throw threadErr;

        const userIds = (thread as any)?.[COLUMNS.dmThreads.userIds];

        let otherUid: string | undefined;
        if (Array.isArray(userIds)) {
          otherUid = userIds.find((id: string) => id !== userId);
        }

        if (otherUid) {
          const [myBlock, otherBlock] = await Promise.all([
            supabase
              .from(TABLES.blocks)
              .select("id")
              .eq(COLUMNS.blocks.blockerId, userId)
              .eq(COLUMNS.blocks.blockedId, otherUid)
              .maybeSingle(),
            supabase
              .from(TABLES.blocks)
              .select("id")
              .eq(COLUMNS.blocks.blockerId, otherUid)
              .eq(COLUMNS.blocks.blockedId, userId)
              .maybeSingle(),
          ]);

          if (myBlock.data) {
            Alert.alert("Blockiert", "Du hast diesen Nutzer blockiert.");
            return;
          }
          if (otherBlock.data) {
            Alert.alert("Blockiert", "Dieser Nutzer hat dich blockiert.");
            return;
          }
        }

        const { data, error } = await supabase
          .from(TABLES.dmMessages)
          .insert({
            [COLUMNS.dmMessages.threadId]: dmIdValue,
            [COLUMNS.dmMessages.senderId]: userId,
            [COLUMNS.dmMessages.username]: username,
            [COLUMNS.dmMessages.text]: messageText,
            [COLUMNS.dmMessages.createdAt]: now,
            [COLUMNS.dmMessages.attachmentPath]: uploaded?.path,
            [COLUMNS.dmMessages.attachmentName]: uploaded?.name,
            [COLUMNS.dmMessages.attachmentMime]: uploaded?.mimeType,
            [COLUMNS.dmMessages.attachmentSize]: uploaded?.size,
          })
          .select(
            [
              COLUMNS.dmMessages.id,
              COLUMNS.dmMessages.senderId,
              COLUMNS.dmMessages.username,
              COLUMNS.dmMessages.text,
              COLUMNS.dmMessages.createdAt,
              COLUMNS.dmMessages.attachmentPath,
              COLUMNS.dmMessages.attachmentName,
              COLUMNS.dmMessages.attachmentMime,
              COLUMNS.dmMessages.attachmentSize,
            ].join(",")
          )
          .single();
        if (error) throw error;

        await supabase
          .from(TABLES.dmThreads)
          .update({
            [COLUMNS.dmThreads.lastMessage]: messageText || uploaded?.name || "",
            [COLUMNS.dmThreads.lastTimestamp]: now,
          })
          .eq(COLUMNS.dmThreads.id, dmIdValue);

        if (data) {
          const entry = {
            id: (data as any)?.[COLUMNS.dmMessages.id],
            sender: (data as any)?.[COLUMNS.dmMessages.senderId],
            username: (data as any)?.[COLUMNS.dmMessages.username],
            text: (data as any)?.[COLUMNS.dmMessages.text] ?? "",
            timestamp: (data as any)?.[COLUMNS.dmMessages.createdAt],
            attachmentPath: (data as any)?.[COLUMNS.dmMessages.attachmentPath] ?? null,
            attachmentName: (data as any)?.[COLUMNS.dmMessages.attachmentName] ?? null,
            attachmentMime: (data as any)?.[COLUMNS.dmMessages.attachmentMime] ?? null,
            attachmentSize: (data as any)?.[COLUMNS.dmMessages.attachmentSize] ?? null,
          };
          setReplies((prev) => {
            if (prev.some((item) => item.id === entry.id)) return prev;
            return [...prev, entry];
          });
        }
        setInput("");
        setInputHeight(40);
        setAttachment(null);
        return;
      }

      // === Group thread ===
      if (roomValue && messageIdValue) {
        if (!isUuid(messageIdValue)) return;
        const { data, error } = await supabase
          .from(TABLES.roomReplies)
          .insert({
            [COLUMNS.roomReplies.roomMessageId]: messageIdValue,
            [COLUMNS.roomReplies.senderId]: userId,
            [COLUMNS.roomReplies.username]: username,
            [COLUMNS.roomReplies.text]: messageText,
            [COLUMNS.roomReplies.createdAt]: now,
            [COLUMNS.roomReplies.attachmentPath]: uploaded?.path,
            [COLUMNS.roomReplies.attachmentName]: uploaded?.name,
            [COLUMNS.roomReplies.attachmentMime]: uploaded?.mimeType,
            [COLUMNS.roomReplies.attachmentSize]: uploaded?.size,
          })
          .select(
            [
              COLUMNS.roomReplies.id,
              COLUMNS.roomReplies.senderId,
              COLUMNS.roomReplies.username,
              COLUMNS.roomReplies.text,
              COLUMNS.roomReplies.createdAt,
              COLUMNS.roomReplies.attachmentPath,
              COLUMNS.roomReplies.attachmentName,
              COLUMNS.roomReplies.attachmentMime,
              COLUMNS.roomReplies.attachmentSize,
            ].join(",")
          )
          .single();
        if (error) throw error;

        if (data) {
          const entry = {
            id: (data as any)?.[COLUMNS.roomReplies.id],
            sender: (data as any)?.[COLUMNS.roomReplies.senderId],
            username: (data as any)?.[COLUMNS.roomReplies.username],
            text: (data as any)?.[COLUMNS.roomReplies.text] ?? "",
            timestamp: (data as any)?.[COLUMNS.roomReplies.createdAt],
            attachmentPath: (data as any)?.[COLUMNS.roomReplies.attachmentPath] ?? null,
            attachmentName: (data as any)?.[COLUMNS.roomReplies.attachmentName] ?? null,
            attachmentMime: (data as any)?.[COLUMNS.roomReplies.attachmentMime] ?? null,
            attachmentSize: (data as any)?.[COLUMNS.roomReplies.attachmentSize] ?? null,
          };
          setReplies((prev) => {
            if (prev.some((item) => item.id === entry.id)) return prev;
            return [...prev, entry];
          });
        }
        setInput("");
        setInputHeight(40);
        setAttachment(null);
      }
    } catch (err) {
      console.error("Send reply failed:", err);
    }
  };

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

  const formatTime = (value: any) => {
    const dateValue = toDate(value);
    if (!dateValue) return t("chat.justNow");
    return dateValue.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const sortedReplies = React.useMemo(() => {
    if (dmIdValue) return replies;
    const list = [...replies];

    if (sortOrder === "oldest") return list;

    const getTime = (value: any) => {
      const dateValue = toDate(value);
      return dateValue ? dateValue.getTime() : 0;
    };

    if (sortOrder === "newest") {
      return list.sort((a, b) => getTime(b.timestamp) - getTime(a.timestamp));
    }

    return list.sort((a, b) => {
      const scoreA = voteStats[a.id]?.score ?? 0;
      const scoreB = voteStats[b.id]?.score ?? 0;
      if (scoreA !== scoreB) {
        return sortOrder === "popular" ? scoreB - scoreA : scoreA - scoreB;
      }
      return getTime(b.timestamp) - getTime(a.timestamp);
    });
  }, [dmIdValue, replies, sortOrder, voteStats]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleMedium">{headerTitle}</Text>
        </View>

        {!dmIdValue && (
          <Surface
            style={[
              styles.originalCard,
              { backgroundColor: theme.colors.elevation.level1 },
            ]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {String(messageUser ?? "")}
            </Text>
            {!!String(messageText ?? "").trim() && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {String(messageText ?? "")}
              </Text>
            )}
            {!!messageAttachmentPathValue && (
              <TouchableOpacity
                style={styles.attachmentRow}
                onPress={() => openAttachment(messageAttachmentPathValue)}
                activeOpacity={0.7}
              >
                <Ionicons name="attach" size={16} color={theme.colors.primary} />
                <Text
                  numberOfLines={1}
                  style={[styles.attachmentText, { color: theme.colors.onSurface }]}
                >
                  {messageAttachmentNameValue || "file"}
                </Text>
              </TouchableOpacity>
            )}
          </Surface>
        )}

        {!dmIdValue && (
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
                  <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
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
        )}

        <FlatList
          data={sortedReplies}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 12,
          }}
          renderItem={({ item }) => {
            const isDirect = !!dmIdValue;
            const avatarUrl = item.sender ? avatarUrls[item.sender] : null;

            if (!isDirect) {
              const timeLabel = formatTimestamp(item.timestamp);
              const hasText = !!item.text;
              const hasAttachment = !!item.attachmentPath;
              const vote = voteStats[item.id] ?? { score: 0, myVote: 0 };
              const upActive = vote.myVote === 1;
              const downActive = vote.myVote === -1;
              return (
                <View style={styles.threadRow}>
                  <View style={styles.voteColumn}>
                    <TouchableOpacity
                      onPress={() => handleVote(item.id, 1)}
                      style={styles.voteButton}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={
                          upActive
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant
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
                          downActive
                            ? theme.colors.error
                            : theme.colors.onSurfaceVariant
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  <Surface
                    style={[
                      styles.threadCard,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                      },
                    ]}
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
                            label={initials(item.username || "??")}
                            color={theme.colors.onPrimary}
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                        )}
                        <Text
                          style={[
                            styles.metaUser,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                          numberOfLines={1}
                        >
                          {item.username || "???"}
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
                        style={styles.attachmentRow}
                        onPress={() => openAttachment(item.attachmentPath)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="attach" size={16} color={theme.colors.primary} />
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
                </View>
              );
            }

            const isMine = !!userId && item.sender === userId;
            const timeLabel = formatTime(item.timestamp);
            const hasText = !!item.text;
            const hasAttachment = !!item.attachmentPath;

            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.rowMine : styles.rowOther,
                ]}
              >
                {!isMine &&
                  (avatarUrl ? (
                    <Avatar.Image
                      size={28}
                      source={{ uri: avatarUrl }}
                      style={[styles.dmAvatar, { backgroundColor: theme.colors.surface }]}
                    />
                  ) : (
                    <Avatar.Text
                      size={28}
                      label={initials(item.username || "??")}
                      color={theme.colors.onPrimary}
                      style={[styles.dmAvatar, { backgroundColor: theme.colors.primary }]}
                    />
                  ))}
                <Surface
                  style={[
                    styles.bubble,
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                    {
                      backgroundColor: isMine
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  {!isMine && (
                    <Text
                      style={[
                        styles.sender,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {item.username || "???"}
                    </Text>
                  )}
                  {hasText && (
                    <Text
                      style={[
                        styles.msgText,
                        {
                          color: isMine
                            ? theme.colors.onPrimary
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {item.text}
                    </Text>
                  )}
                  {hasAttachment && (
                    <TouchableOpacity
                      style={styles.attachmentRow}
                      onPress={() => openAttachment(item.attachmentPath)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="attach"
                        size={16}
                        color={isMine ? theme.colors.onPrimary : theme.colors.primary}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.attachmentText,
                          {
                            color: isMine
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                          },
                        ]}
                      >
                        {item.attachmentName || "file"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text
                    style={[
                      styles.time,
                      {
                        color: isMine
                          ? theme.colors.onPrimary
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {timeLabel}
                  </Text>
                </Surface>
              </View>
            );
          }}
        />

        <InputBar
          input={input}
          setInput={setInput}
          inputHeight={inputHeight}
          setInputHeight={setInputHeight}
          sendMessage={sendReply}
          placeholder={t("chat.inputPlaceholder")}
          accentColor={theme.colors.primary}
          uploadAttachment={handlePickAttachment}
          attachment={attachment}
          clearAttachment={clearAttachment}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  originalCard: {
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  sortRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
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
    marginBottom: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  threadRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  voteColumn: {
    width: 34,
    alignItems: "center",
    marginRight: 6,
    paddingTop: 6,
  },
  voteButton: {
    paddingVertical: 2,
  },
  voteScore: {
    fontSize: 12,
    fontWeight: "600",
    marginVertical: 2,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  threadCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  metaUser: {
    fontSize: 12,
    marginLeft: 6,
    flexShrink: 1,
  },
  metaTime: {
    fontSize: 12,
  },
  dmAvatar: {
    marginRight: 8,
  },
  bubble: {
    maxWidth: "82%",
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1,
  },
  bubbleMine: {
    borderTopRightRadius: 6,
  },
  bubbleOther: {
    borderTopLeftRadius: 6,
  },
  sender: {
    fontSize: 12,
    marginBottom: 4,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 20,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  attachmentText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  time: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: "flex-end",
    textAlign: "right",
    minWidth: 44,
  },
});
