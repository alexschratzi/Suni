// app/(app)/(stack)/reply.tsx
import { useEffect, useState } from "react";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Text, Surface, useTheme, IconButton, Menu } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import InputBar from "@/components/chat/InputBar";
import ReplyMessageList from "@/components/reply/ReplyMessageList";
import { styles } from "@/components/reply/replyStyles";
import {
  formatDateLabel,
  formatTime,
  formatTimestamp,
  isSameDay,
  toDate,
} from "@/components/reply/replyUtils";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createAttachmentUrl,
  pickAttachment,
  uploadAttachment,
} from "@/src/lib/chatAttachments";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";

type SortOrder = "newest" | "oldest" | "popular" | "unpopular";

export default function ReplyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const {
    room,
    messageId,
    messageText,
    messageUser,
    dmId,
    otherUid,
    otherName,
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
  const otherUidValue = toSingle(otherUid);
  const otherNameValue = toSingle(otherName);
  const messageAttachmentPathValue = toSingle(messageAttachmentPath);
  const messageAttachmentNameValue = toSingle(messageAttachmentName);
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [dmPartnerName, setDmPartnerName] = useState(otherNameValue || "");
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
  const headerTitle = dmIdValue
    ? dmPartnerName || t("chat.directTitle", "Chat")
    : "Antworten";

  useEffect(() => {
    if (!userId) {
      setUsername("");
      setBlocked([]);
      return;
    }

    let cancelled = false;

    const loadProfile = async (force = false) => {
      const cached = getMemoryProfiles([userId])[userId];
      if (cached?.username) {
        setUsername(cached.username ?? "");
      }

      const profiles = await fetchProfilesWithCache([userId], { force });
      if (cancelled) return;
      const entry = profiles[userId];
      if (entry) {
        setUsername(entry.username ?? "");
      }
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
        () => loadProfile(true)
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

  useEffect(() => {
    if (!dmIdValue) {
      setDmPartnerName("");
      return;
    }

    if (otherNameValue) {
      setDmPartnerName(otherNameValue);
    }

    let cancelled = false;

    const loadFromProfile = async (uid: string) => {
      const cached = getMemoryProfiles([uid])[uid];
      if (cached?.username) {
        setDmPartnerName(cached.username ?? "");
      }
      const profiles = await fetchProfilesWithCache([uid]);
      if (cancelled) return;
      const entry = profiles[uid];
      if (entry?.username) {
        setDmPartnerName(entry.username ?? "");
      }
    };

    const loadFromThread = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(COLUMNS.dmThreads.userIds)
        .eq(COLUMNS.dmThreads.id, dmIdValue)
        .maybeSingle();

      if (error) {
        console.error("DM thread load error:", error.message);
        return;
      }

      const userIds = (data as any)?.[COLUMNS.dmThreads.userIds];
      const otherId = Array.isArray(userIds)
        ? userIds.find((id: string) => id !== userId)
        : null;

      if (!otherId) {
        if (!cancelled) setDmPartnerName("");
        return;
      }

      await loadFromProfile(otherId);
    };

    if (otherUidValue) {
      loadFromProfile(otherUidValue);
      return;
    }

    if (otherNameValue) {
      return;
    }

    loadFromThread();

    return () => {
      cancelled = true;
    };
  }, [dmIdValue, otherNameValue, otherUidValue, userId]);

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
    if (dmIdValue) return;
    const senderIds = Array.from(
      new Set(replies.map((reply) => reply.sender).filter(Boolean))
    ) as string[];
    const missing = senderIds.filter((id) => !(id in avatarUrls));
    if (missing.length === 0) return;

    const cached = getMemoryProfiles(missing);
    if (Object.keys(cached).length > 0) {
      const mapped = Object.fromEntries(
        Object.entries(cached).map(([id, entry]) => [id, entry.avatarUrl ?? null])
      );
      setAvatarUrls((prev) => ({ ...prev, ...mapped }));
    }

    let cancelled = false;

    const loadAvatars = async () => {
      const profiles = await fetchProfilesWithCache(missing);
      if (cancelled) return;
      const mapped = Object.fromEntries(
        Object.entries(profiles).map(([id, entry]) => [id, entry.avatarUrl ?? null])
      );
      setAvatarUrls((prev) => ({
        ...prev,
        ...mapped,
      }));
    };

    loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [replies, avatarUrls, dmIdValue]);

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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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

        <ReplyMessageList
          items={sortedReplies}
          isDirect={!!dmIdValue}
          userId={userId}
          avatarUrls={avatarUrls}
          voteStats={voteStats}
          handleVote={handleVote}
          openAttachment={openAttachment}
          formatTime={(value) => formatTime(value, locale, t)}
          formatTimestamp={(value) => formatTimestamp(value, locale, t)}
          formatDateLabel={(value) => formatDateLabel(value, locale, t)}
          isSameDay={isSameDay}
          theme={theme}
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
