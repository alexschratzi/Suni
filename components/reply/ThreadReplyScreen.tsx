import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Linking,
  TouchableOpacity,
  Alert,
  GestureResponderEvent,
} from "react-native";
import { Text, Surface, useTheme, Menu } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
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
import {
  createAttachmentUrl,
  pickAttachment,
  uploadAttachment,
} from "@/src/lib/chatAttachments";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";

type SortOrder = "newest" | "oldest" | "popular" | "unpopular";

type Props = {
  roomId?: string;
  messageId?: string;
  messageText?: string;
  messageUser?: string;
  messageUserId?: string;
  messageAttachmentPath?: string;
  messageAttachmentName?: string;
};

const REPLY_PAGE_SIZE = 40;

export default function ThreadReplyScreen({
  roomId,
  messageId,
  messageText,
  messageUser,
  messageUserId,
  messageAttachmentPath,
  messageAttachmentName,
}: Props) {
  const theme = useTheme();
  const navigation = useNavigation();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestTimestampRef = useRef<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [userMenuUser, setUserMenuUser] = useState<{ id: string; name: string } | null>(
    null
  );
  const [userMenuIsFriend, setUserMenuIsFriend] = useState<boolean | null>(null);
  const friendStatusCache = React.useRef<Record<string, boolean>>({});
  const [voteStats, setVoteStats] = useState<
    Record<string, { score: number; myVote: number }>
  >({});
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>(
    {}
  );

  const isUuid = (value: string | undefined) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );

  const pairFor = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

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

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Antworten" });
  }, [navigation]);

  useEffect(() => {
    if (!roomId || !messageId) return;
    if (!isUuid(messageId)) {
      setReplies([]);
      return;
    }

    let cancelled = false;

    const mapRows = (rows: any[]) =>
      (rows || [])
        .map((row: any) => ({
          id: row?.[COLUMNS.roomReplies.id],
          sender: row?.[COLUMNS.roomReplies.senderId],
          username: row?.[COLUMNS.roomReplies.username],
          text: row?.[COLUMNS.roomReplies.text] ?? "",
          timestamp: row?.[COLUMNS.roomReplies.createdAt],
          attachmentPath: row?.[COLUMNS.roomReplies.attachmentPath] ?? null,
          attachmentName: row?.[COLUMNS.roomReplies.attachmentName] ?? null,
          attachmentMime: row?.[COLUMNS.roomReplies.attachmentMime] ?? null,
          attachmentSize: row?.[COLUMNS.roomReplies.attachmentSize] ?? null,
        }))
        .filter((entry: any) => entry?.id);

    const filterBlocked = (rows: any[]) =>
      rows.filter((row) => {
        const sender = row?.sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      });

    const updateOldest = (rows: any[]) => {
      let oldest: string | null = null;
      rows.forEach((row) => {
        const ts = row?.[COLUMNS.roomReplies.createdAt];
        if (!ts) return;
        if (!oldest || new Date(ts).getTime() < new Date(oldest).getTime()) {
          oldest = ts;
        }
      });
      if (oldest) {
        oldestTimestampRef.current = oldest;
      }
    };

    setReplies([]);
    setVoteStats({});
    setHasMore(true);
    setLoadingMore(false);
    oldestTimestampRef.current = null;

    const loadLatestPage = async () => {
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
        .eq(COLUMNS.roomReplies.roomMessageId, messageId)
        .order(COLUMNS.roomReplies.createdAt, { ascending: false })
        .limit(REPLY_PAGE_SIZE);

      if (error) {
        console.error("Room replies load error:", error.message);
        if (!cancelled) setReplies([]);
        return;
      }

      if (cancelled) return;
      const rows = data || [];
      updateOldest(rows);
      setHasMore(rows.length === REPLY_PAGE_SIZE);
      const mapped = mapRows(rows).reverse();
      const filtered = filterBlocked(mapped);
      setReplies(filtered);
      if (!cancelled) {
        await loadReplyVotes(filtered.map((item) => item.id));
      }
    };

    loadLatestPage();

    const channel = supabase
      .channel(`room-replies-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: TABLES.roomReplies,
          filter: `${COLUMNS.roomReplies.roomMessageId}=eq.${messageId}`,
        },
        async (payload) => {
          if (cancelled) return;
          const mapped = mapRows([payload.new]).filter(Boolean);
          if (mapped.length === 0) return;
          const filtered = filterBlocked(mapped);
          if (filtered.length === 0) return;
          setReplies((prev) => {
            const existing = new Set(prev.map((entry) => entry.id));
            const next = filtered.filter((entry) => !existing.has(entry.id));
            return next.length ? [...prev, ...next] : prev;
          });
          await loadReplyVotes(mapped.map((entry) => entry.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [blocked, messageId, roomId]);

  const loadOlderReplies = useCallback(async () => {
    if (!messageId || loadingMore || !hasMore) return;
    const before = oldestTimestampRef.current;
    if (!before) return;

    setLoadingMore(true);
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
      .eq(COLUMNS.roomReplies.roomMessageId, messageId)
      .lt(COLUMNS.roomReplies.createdAt, before)
      .order(COLUMNS.roomReplies.createdAt, { ascending: false })
      .limit(REPLY_PAGE_SIZE);

    if (error) {
      console.error("Room replies load more error:", error.message);
      setLoadingMore(false);
      return;
    }

    const rows = data || [];
    if (rows.length < REPLY_PAGE_SIZE) {
      setHasMore(false);
    }

    let oldest: string | null = null;
    rows.forEach((row: any) => {
      const ts = row?.[COLUMNS.roomReplies.createdAt];
      if (!ts) return;
      if (!oldest || new Date(ts).getTime() < new Date(oldest).getTime()) {
        oldest = ts;
      }
    });
    if (oldest) oldestTimestampRef.current = oldest;

    const mapped = rows
      .map((row: any) => ({
        id: row?.[COLUMNS.roomReplies.id],
        sender: row?.[COLUMNS.roomReplies.senderId],
        username: row?.[COLUMNS.roomReplies.username],
        text: row?.[COLUMNS.roomReplies.text] ?? "",
        timestamp: row?.[COLUMNS.roomReplies.createdAt],
        attachmentPath: row?.[COLUMNS.roomReplies.attachmentPath] ?? null,
        attachmentName: row?.[COLUMNS.roomReplies.attachmentName] ?? null,
        attachmentMime: row?.[COLUMNS.roomReplies.attachmentMime] ?? null,
        attachmentSize: row?.[COLUMNS.roomReplies.attachmentSize] ?? null,
      }))
      .filter((entry: any) => entry?.id)
      .reverse()
      .filter((row) => {
        const sender = row?.sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      });

    if (mapped.length > 0) {
      setReplies((prev) => {
        const existing = new Set(prev.map((entry) => entry.id));
        const next = mapped.filter((entry) => !existing.has(entry.id));
        return next.length ? [...next, ...prev] : prev;
      });
      await loadReplyVotes(mapped.map((entry) => entry.id));
    }

    setLoadingMore(false);
  }, [blocked, hasMore, loadingMore, messageId, userId]);

  useEffect(() => {
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
  }, [avatarUrls, replies]);

  const loadReplyVotes = async (replyIds: string[]) => {
    if (!userId || replyIds.length === 0) {
      if (replyIds.length === 0) {
        setVoteStats({});
      }
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

    setVoteStats((prev) => ({ ...prev, ...next }));
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

  const closeUserMenu = React.useCallback(() => {
    setUserMenuVisible(false);
  }, []);

  const loadFriendStatus = React.useCallback(
    async (targetUid: string) => {
      if (!userId) return false;
      if (targetUid in friendStatusCache.current) {
        return friendStatusCache.current[targetUid];
      }
      const [a, b] = pairFor(userId, targetUid);
      const { data, error } = await supabase
        .from(TABLES.friendships)
        .select(COLUMNS.friendships.userId)
        .eq(COLUMNS.friendships.userId, a)
        .eq(COLUMNS.friendships.friendId, b)
        .maybeSingle();

      if (error) {
        console.error("Friendship check failed:", error.message);
        return false;
      }
      const isFriend = !!data;
      friendStatusCache.current[targetUid] = isFriend;
      return isFriend;
    },
    [userId]
  );

  const openUserMenu = React.useCallback(
    (event: GestureResponderEvent, targetUid?: string, targetName?: string) => {
      if (!targetUid || !userId || targetUid === userId) return;
      const { pageX, pageY } = event.nativeEvent;
      setUserMenuAnchor({ x: pageX, y: pageY });
      setUserMenuUser({ id: targetUid, name: targetName || "???" });
      const cached = friendStatusCache.current[targetUid];
      setUserMenuIsFriend(typeof cached === "boolean" ? cached : null);
      setUserMenuVisible(true);
      loadFriendStatus(targetUid).then((isFriend) => {
        setUserMenuIsFriend(isFriend);
      });
    },
    [loadFriendStatus, userId]
  );

  const handleSortSelect = React.useCallback(
    (next: SortOrder) => {
      setSortOrder(next);
      closeSortMenu();
    },
    [closeSortMenu]
  );

  const openDirectChat = async (targetUid: string, targetName: string) => {
    if (!userId) return;
    try {
      const columns = [COLUMNS.dmThreads.id, COLUMNS.dmThreads.userIds].join(",");
      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(columns)
        .contains(COLUMNS.dmThreads.userIds, [userId, targetUid])
        .limit(1);

      if (error) throw error;

      let threadId = Array.isArray(data) && data[0]
        ? data[0]?.[COLUMNS.dmThreads.id]
        : null;

      if (!threadId) {
        const { data: created, error: createErr } = await supabase
          .from(TABLES.dmThreads)
          .insert({
            [COLUMNS.dmThreads.userIds]: [userId, targetUid],
            [COLUMNS.dmThreads.lastMessage]: "",
            [COLUMNS.dmThreads.lastTimestamp]: null,
            [COLUMNS.dmThreads.hiddenBy]: [],
          })
          .select(COLUMNS.dmThreads.id)
          .single();

        if (createErr) throw createErr;
        threadId = (created as any)?.[COLUMNS.dmThreads.id];
      }

      if (!threadId) {
        throw new Error("Missing dm thread id");
      }

      router.push({
        pathname: "/(app)/(stack)/reply",
        params: {
          dmId: threadId,
          otherUid: targetUid,
          otherName: targetName,
        },
      });
    } catch (err) {
      console.error("Open direct chat failed:", err);
      Alert.alert("Chat oeffnen", "Konnte Chat nicht oeffnen.");
    }
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!userId) return;
    if (targetUid === userId) {
      Alert.alert(t("friends.snacks.self", "Du kannst dir selbst keine Anfrage senden."));
      return;
    }

    try {
      const [blockedByOther, blockedByMe, existingFriend, outgoingReq, incomingReq] =
        await Promise.all([
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, targetUid)
            .eq(COLUMNS.blocks.blockedId, userId)
            .maybeSingle(),
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, userId)
            .eq(COLUMNS.blocks.blockedId, targetUid)
            .maybeSingle(),
          (() => {
            const [a, b] = pairFor(userId, targetUid);
            return supabase
              .from(TABLES.friendships)
              .select(COLUMNS.friendships.userId)
              .eq(COLUMNS.friendships.userId, a)
              .eq(COLUMNS.friendships.friendId, b)
              .maybeSingle();
          })(),
          supabase
            .from(TABLES.friendRequests)
            .select("id")
            .eq(COLUMNS.friendRequests.fromUser, userId)
            .eq(COLUMNS.friendRequests.toUser, targetUid)
            .maybeSingle(),
          supabase
            .from(TABLES.friendRequests)
            .select("id")
            .eq(COLUMNS.friendRequests.fromUser, targetUid)
            .eq(COLUMNS.friendRequests.toUser, userId)
            .maybeSingle(),
        ]);

      if (blockedByOther.data) {
        Alert.alert(
          t("friends.snacks.blockedByOther", "Dieser Nutzer hat dich blockiert.")
        );
        return;
      }
      if (blockedByMe.data) {
        Alert.alert(t("friends.snacks.youBlocked", "Du hast diesen Nutzer blockiert."));
        return;
      }
      if (existingFriend.data) {
        Alert.alert(t("friends.snacks.alreadyFriends", "Ihr seid bereits befreundet."));
        return;
      }
      if (outgoingReq.data) {
        Alert.alert(t("friends.snacks.pendingSent", "Anfrage bereits gesendet."));
        return;
      }
      if (incomingReq.data) {
        Alert.alert(
          t("friends.snacks.pendingReceived", "Es gibt bereits eine Anfrage.")
        );
        return;
      }

      const { error } = await supabase.from(TABLES.friendRequests).insert({
        [COLUMNS.friendRequests.fromUser]: userId,
        [COLUMNS.friendRequests.toUser]: targetUid,
      });
      if (error) throw error;

      Alert.alert(t("friends.snacks.sent", "Anfrage gesendet."));
    } catch (err) {
      console.error("Friend request failed:", err);
      Alert.alert(t("friends.errors.send", "Anfrage konnte nicht gesendet werden."));
    }
  };

  const blockUser = async (targetUid: string) => {
    if (!userId) return;
    try {
      const { data: existingBlock } = await supabase
        .from(TABLES.blocks)
        .select("id")
        .eq(COLUMNS.blocks.blockerId, userId)
        .eq(COLUMNS.blocks.blockedId, targetUid)
        .maybeSingle();

      if (existingBlock) {
        Alert.alert(t("friends.snacks.blocked", "Nutzer ist bereits blockiert."));
        return;
      }

      const { error: blockErr } = await supabase.from(TABLES.blocks).insert({
        [COLUMNS.blocks.blockerId]: userId,
        [COLUMNS.blocks.blockedId]: targetUid,
      });
      if (blockErr) throw blockErr;

      const [a, b] = pairFor(userId, targetUid);
      await Promise.all([
        supabase
          .from(TABLES.friendships)
          .delete()
          .eq(COLUMNS.friendships.userId, a)
          .eq(COLUMNS.friendships.friendId, b),
        supabase
          .from(TABLES.friendRequests)
          .delete()
          .eq(COLUMNS.friendRequests.fromUser, userId)
          .eq(COLUMNS.friendRequests.toUser, targetUid),
        supabase
          .from(TABLES.friendRequests)
          .delete()
          .eq(COLUMNS.friendRequests.fromUser, targetUid)
          .eq(COLUMNS.friendRequests.toUser, userId),
      ]);

      Alert.alert(t("friends.snacks.blocked", "Nutzer blockiert."));
    } catch (err) {
      console.error("Block failed:", err);
      Alert.alert(t("friends.errors.block", "Blockieren fehlgeschlagen."));
    }
  };

  const reportUser = () => {
    Alert.alert("Melden", "Danke, wir pruefen das.");
  };

  const handleReport = () => {
    closeUserMenu();
    reportUser();
  };

  const handleFriendRequest = async () => {
    const target = userMenuUser;
    closeUserMenu();
    if (!target) return;
    await sendFriendRequest(target.id);
  };

  const handleOpenChat = async () => {
    const target = userMenuUser;
    closeUserMenu();
    if (!target) return;
    await openDirectChat(target.id, target.name);
  };

  const handleBlock = () => {
    const target = userMenuUser;
    closeUserMenu();
    if (!target) return;
    Alert.alert(
      "Blockieren",
      `Moechtest du ${target.name} blockieren?`,
      [
        { text: t("common.cancel", "Abbrechen"), style: "cancel" },
        {
          text: "Blockieren",
          style: "destructive",
          onPress: () => {
            blockUser(target.id);
          },
        },
      ]
    );
  };

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

  const sendReply = async () => {
    const messageTextValue = input.trim();
    if ((!messageTextValue && !attachment) || !username || !userId) return;
    if (!roomId || !messageId) return;
    if (!isUuid(messageId)) return;

    try {
      const now = new Date().toISOString();
      let uploaded = null;

      if (attachment) {
        uploaded = await uploadAttachment(attachment, `rooms/${roomId}/replies/${messageId}`);
      }

      const { data, error } = await supabase
        .from(TABLES.roomReplies)
        .insert({
          [COLUMNS.roomReplies.roomMessageId]: messageId,
          [COLUMNS.roomReplies.senderId]: userId,
          [COLUMNS.roomReplies.username]: username,
          [COLUMNS.roomReplies.text]: messageTextValue,
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
    } catch (err) {
      console.error("Send reply failed:", err);
    }
  };

  const sortedReplies = React.useMemo(() => {
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
  }, [replies, sortOrder, voteStats]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface
          style={[
            styles.originalCard,
            { backgroundColor: theme.colors.elevation.level1 },
          ]}
        >
          {messageUserId ? (
            <TouchableOpacity
              onPress={(event) =>
                openUserMenu(event, messageUserId, String(messageUser ?? ""))
              }
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {String(messageUser ?? "")}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {String(messageUser ?? "")}
            </Text>
          )}
          {!!String(messageText ?? "").trim() && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {String(messageText ?? "")}
            </Text>
          )}
          {!!messageAttachmentPath && (
            <TouchableOpacity
              style={styles.attachmentRow}
              onPress={() => openAttachment(messageAttachmentPath)}
              activeOpacity={0.7}
            >
              <Ionicons name="attach" size={16} color={theme.colors.primary} />
              <Text
                numberOfLines={1}
                style={[styles.attachmentText, { color: theme.colors.onSurface }]}
              >
                {messageAttachmentName || "file"}
              </Text>
            </TouchableOpacity>
          )}
        </Surface>

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

        {userMenuVisible && userMenuAnchor && (
          <Menu
            visible={userMenuVisible}
            onDismiss={closeUserMenu}
            anchor={userMenuAnchor}
          >
            <Menu.Item onPress={handleReport} title="Melden" />
            {userMenuIsFriend === null ? (
              <Menu.Item title="Lade..." disabled />
            ) : userMenuIsFriend ? (
              <Menu.Item onPress={handleOpenChat} title="Chat oeffnen" />
            ) : (
              <Menu.Item onPress={handleFriendRequest} title="Freundschaftsanfrage senden" />
            )}
            <Menu.Item onPress={handleBlock} title="Blockieren" />
          </Menu>
        )}

        <ReplyMessageList
          items={sortedReplies}
          isDirect={false}
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
          onUserPress={openUserMenu}
          onLoadMore={loadOlderReplies}
          loadingMore={loadingMore}
          hasMore={hasMore}
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
