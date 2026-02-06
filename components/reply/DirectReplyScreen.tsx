import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Linking,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useTheme, Menu, IconButton } from "react-native-paper";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import InputBar from "@/components/chat/InputBar";
import ReplyMessageList from "@/components/reply/ReplyMessageList";
import { styles } from "@/components/reply/replyStyles";
import {
  formatDateLabel,
  formatTime,
  formatTimestamp,
  isSameDay,
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

type Props = {
  dmId: string;
  otherUid?: string;
  otherName?: string;
};

const DM_PAGE_SIZE = 40;

export default function DirectReplyScreen({ dmId, otherUid, otherName }: Props) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";
  const isFocused = useIsFocused();

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [dmPartnerName, setDmPartnerName] = useState(otherName || "");
  const [dmPartnerId, setDmPartnerId] = useState<string | null>(
    otherUid || null
  );
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [muted, setMuted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const searchInputRef = useRef<TextInput | null>(null);
  const oldestTimestampRef = useRef<string | null>(null);

  const headerTitle = dmPartnerName || t("chat.directTitle");
  const muteKey = dmId ? `dm.muted.${dmId}` : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
      headerRight: () => (
        <IconButton
          icon="dots-vertical"
          size={22}
          onPress={(event) => {
            const { pageX, pageY } = event.nativeEvent;
            setMenuAnchor({ x: pageX, y: pageY });
            setMenuVisible(true);
          }}
          iconColor={theme.colors.onSurface}
        />
      ),
    });
  }, [headerTitle, navigation, theme.colors.onSurface]);

  const openSearch = () => {
    setSearchVisible(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    setSearchQuery("");
    setSearchVisible(false);
  };

  useEffect(() => {
    if (!muteKey) {
      setMuted(false);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(muteKey)
      .then((value) => {
        if (!cancelled) setMuted(value === "1");
      })
      .catch((err) => console.warn("Mute load failed:", err));
    return () => {
      cancelled = true;
    };
  }, [muteKey]);

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
    if (!dmId) {
      setDmPartnerName("");
      return;
    }

    if (otherName) {
      setDmPartnerName(otherName);
    }
    if (otherUid) {
      setDmPartnerId(otherUid);
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
        .eq(COLUMNS.dmThreads.id, dmId)
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

      if (!cancelled) {
        setDmPartnerId(otherId);
      }
      await loadFromProfile(otherId);
    };

    if (otherUid) {
      loadFromProfile(otherUid);
      return;
    }

    if (otherName) {
      return;
    }

    loadFromThread();

    return () => {
      cancelled = true;
    };
  }, [dmId, otherName, otherUid, userId]);

  useEffect(() => {
    if (!dmId) return;
    let cancelled = false;

    const mapRows = (rows: any[]) =>
      (rows || [])
        .map((row: any) => ({
          id: row?.[COLUMNS.dmMessages.id],
          sender: row?.[COLUMNS.dmMessages.senderId],
          username: row?.[COLUMNS.dmMessages.username],
          text: row?.[COLUMNS.dmMessages.text] ?? "",
          timestamp: row?.[COLUMNS.dmMessages.createdAt],
          attachmentPath: row?.[COLUMNS.dmMessages.attachmentPath] ?? null,
          attachmentName: row?.[COLUMNS.dmMessages.attachmentName] ?? null,
          attachmentMime: row?.[COLUMNS.dmMessages.attachmentMime] ?? null,
          attachmentSize: row?.[COLUMNS.dmMessages.attachmentSize] ?? null,
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
        const ts = row?.[COLUMNS.dmMessages.createdAt];
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
    setHasMore(true);
    setLoadingMore(false);
    oldestTimestampRef.current = null;

    const loadLatestPage = async () => {
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
        .eq(COLUMNS.dmMessages.threadId, dmId)
        .order(COLUMNS.dmMessages.createdAt, { ascending: false })
        .limit(DM_PAGE_SIZE);

      if (error) {
        console.error("DM replies load error:", error.message);
        if (!cancelled) setReplies([]);
        return;
      }

      if (cancelled) return;
      const rows = data || [];
      updateOldest(rows);
      setHasMore(rows.length === DM_PAGE_SIZE);
      const mapped = mapRows(rows).reverse();
      const filtered = filterBlocked(mapped);
      setReplies(filtered);
    };

    loadLatestPage();

    const channel = supabase
      .channel(`dm-replies-${dmId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: TABLES.dmMessages,
          filter: `${COLUMNS.dmMessages.threadId}=eq.${dmId}`,
        },
        (payload) => {
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
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [blocked, dmId]);

  const loadOlderReplies = useCallback(async () => {
    if (!dmId || loadingMore || !hasMore) return;
    const before = oldestTimestampRef.current;
    if (!before) return;

    setLoadingMore(true);
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
      .eq(COLUMNS.dmMessages.threadId, dmId)
      .lt(COLUMNS.dmMessages.createdAt, before)
      .order(COLUMNS.dmMessages.createdAt, { ascending: false })
      .limit(DM_PAGE_SIZE);

    if (error) {
      console.error("DM replies load more error:", error.message);
      setLoadingMore(false);
      return;
    }

    const rows = data || [];
    if (rows.length < DM_PAGE_SIZE) {
      setHasMore(false);
    }

    let oldest: string | null = null;
    rows.forEach((row: any) => {
      const ts = row?.[COLUMNS.dmMessages.createdAt];
      if (!ts) return;
      if (!oldest || new Date(ts).getTime() < new Date(oldest).getTime()) {
        oldest = ts;
      }
    });
    if (oldest) oldestTimestampRef.current = oldest;

    const mapped = rows
      .map((row: any) => ({
        id: row?.[COLUMNS.dmMessages.id],
        sender: row?.[COLUMNS.dmMessages.senderId],
        username: row?.[COLUMNS.dmMessages.username],
        text: row?.[COLUMNS.dmMessages.text] ?? "",
        timestamp: row?.[COLUMNS.dmMessages.createdAt],
        attachmentPath: row?.[COLUMNS.dmMessages.attachmentPath] ?? null,
        attachmentName: row?.[COLUMNS.dmMessages.attachmentName] ?? null,
        attachmentMime: row?.[COLUMNS.dmMessages.attachmentMime] ?? null,
        attachmentSize: row?.[COLUMNS.dmMessages.attachmentSize] ?? null,
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
    }

    setLoadingMore(false);
  }, [blocked, dmId, hasMore, loadingMore]);

  useEffect(() => {
    if (!dmId || !userId || !isFocused || !isAtBottom) return;
    const now = new Date().toISOString();
    supabase
      .from(TABLES.dmReads)
      .upsert(
        {
          [COLUMNS.dmReads.threadId]: dmId,
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
  }, [dmId, isAtBottom, isFocused, replies.length, userId]);

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

  const pairFor = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

  const toggleMute = async () => {
    if (!muteKey) return;
    const next = !muted;
    setMuted(next);
    try {
      await AsyncStorage.setItem(muteKey, next ? "1" : "0");
    } catch (err) {
      console.warn("Mute save failed:", err);
    }
  };

  const hideChatForMe = async () => {
    if (!userId || !dmId) return;
    try {
      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(COLUMNS.dmThreads.hiddenBy)
        .eq(COLUMNS.dmThreads.id, dmId)
        .maybeSingle();

      if (error) throw error;

      const current = Array.isArray(data?.[COLUMNS.dmThreads.hiddenBy])
        ? (data?.[COLUMNS.dmThreads.hiddenBy] as string[])
        : [];
      const next = Array.from(new Set([...current, userId]));

      const { error: updateError } = await supabase
        .from(TABLES.dmThreads)
        .update({ [COLUMNS.dmThreads.hiddenBy]: next })
        .eq(COLUMNS.dmThreads.id, dmId);
      if (updateError) throw updateError;

      navigation.goBack();
    } catch (err) {
      console.error("Chat delete failed:", err);
      Alert.alert(t("chat.alerts.deleteChatTitle"), t("chat.alerts.deleteChatFailed"));
    }
  };

  const blockUser = async (otherUidValue: string) => {
    if (!userId) return;
    try {
      const { data: existingBlock } = await supabase
        .from(TABLES.blocks)
        .select(COLUMNS.blocks.blockedId)
        .eq(COLUMNS.blocks.blockerId, userId)
        .eq(COLUMNS.blocks.blockedId, otherUidValue)
        .maybeSingle();

      if (existingBlock) {
        Alert.alert(t("chat.alerts.blockTitle"), t("chat.alerts.blockAlready"));
        return;
      }

      const { error: blockErr } = await supabase.from(TABLES.blocks).insert({
        [COLUMNS.blocks.blockerId]: userId,
        [COLUMNS.blocks.blockedId]: otherUidValue,
      });
      if (blockErr) throw blockErr;

      const [a, b] = pairFor(userId, otherUidValue);
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
          .eq(COLUMNS.friendRequests.toUser, otherUidValue),
        supabase
          .from(TABLES.friendRequests)
          .delete()
          .eq(COLUMNS.friendRequests.fromUser, otherUidValue)
          .eq(COLUMNS.friendRequests.toUser, userId),
      ]);

      setBlocked((prev) =>
        prev.includes(otherUidValue) ? prev : [...prev, otherUidValue]
      );
      Alert.alert(t("chat.alerts.blockTitle"), t("friends.snacks.blocked"));
    } catch (err) {
      console.error("Block failed:", err);
      Alert.alert(t("chat.alerts.blockTitle"), t("friends.errors.block"));
    }
  };

  const handleBlock = () => {
    const targetId = dmPartnerId;
    const name = dmPartnerName || "Nutzer";
    if (!targetId) {
      Alert.alert(t("chat.alerts.blockTitle"), t("chat.alerts.blockUnavailable"));
      return;
    }
    if (blocked.includes(targetId)) {
      Alert.alert(t("chat.alerts.blockTitle"), t("chat.alerts.blockAlready"));
      return;
    }
    Alert.alert(t("chat.alerts.blockTitle"), t("chat.alerts.blockConfirm", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.menu.block"),
        style: "destructive",
        onPress: () => blockUser(targetId),
      },
    ]);
  };

  const handleDeleteChat = () => {
    Alert.alert(t("chat.alerts.deleteChatTitle"), t("chat.alerts.deleteChatConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: hideChatForMe },
    ]);
  };

  const filteredReplies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return replies;
    return replies.filter((item) => {
      const text = String(item.text || "").toLowerCase();
      const name = String(item.attachmentName || "").toLowerCase();
      return text.includes(q) || name.includes(q);
    });
  }, [replies, searchQuery]);

  const sendReply = async () => {
    const messageText = input.trim();
    if ((!messageText && !attachment) || !username || !userId) return;
    if (!dmId) return;

    try {
      const now = new Date().toISOString();
      let uploaded = null;

      if (attachment) {
        uploaded = await uploadAttachment(attachment, `dm/${dmId}`);
      }

      const { data: thread, error: threadErr } = await supabase
        .from(TABLES.dmThreads)
        .select(COLUMNS.dmThreads.userIds)
        .eq(COLUMNS.dmThreads.id, dmId)
        .maybeSingle();

      if (threadErr) throw threadErr;

      const userIds = (thread as any)?.[COLUMNS.dmThreads.userIds];

      let otherUidValue: string | undefined;
      if (Array.isArray(userIds)) {
        otherUidValue = userIds.find((id: string) => id !== userId);
      }

      if (otherUidValue) {
        const [myBlock, otherBlock] = await Promise.all([
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, userId)
            .eq(COLUMNS.blocks.blockedId, otherUidValue)
            .maybeSingle(),
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, otherUidValue)
            .eq(COLUMNS.blocks.blockedId, userId)
            .maybeSingle(),
        ]);

        if (myBlock.data) {
          Alert.alert(t("chat.alerts.blockedTitle"), t("friends.snacks.youBlocked"));
          return;
        }
        if (otherBlock.data) {
          Alert.alert(
            t("chat.alerts.blockedTitle"),
            t("friends.snacks.blockedByOther")
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from(TABLES.dmMessages)
        .insert({
          [COLUMNS.dmMessages.threadId]: dmId,
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
        .eq(COLUMNS.dmThreads.id, dmId);

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
    } catch (err) {
      console.error("Send reply failed:", err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {menuVisible && menuAnchor && (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={menuAnchor}
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                openSearch();
              }}
              title={t("chat.menu.searchMessages")}
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                toggleMute();
              }}
              title={muted ? t("chat.menu.unmute") : t("chat.menu.mute")}
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleDeleteChat();
              }}
              title={t("chat.menu.deleteChat")}
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleBlock();
              }}
              title={t("chat.menu.block")}
              disabled={!dmPartnerId || blocked.includes(dmPartnerId)}
            />
          </Menu>
        )}
        {searchVisible && (
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <TextInput
                ref={searchInputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("chat.searchMessagesPlaceholder")}
                placeholderTextColor={theme.colors.onSurfaceVariant}
                style={[styles.searchInput, { color: theme.colors.onSurface }]}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={closeSearch} style={styles.searchClose}>
                <Ionicons
                  name="close"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <ReplyMessageList
          items={filteredReplies}
          isDirect
          userId={userId}
          resetKey={dmId}
          avatarUrls={{}}
          voteStats={{}}
          handleVote={() => {}}
          openAttachment={openAttachment}
          formatTime={(value) => formatTime(value, locale, t)}
          formatTimestamp={(value) => formatTimestamp(value, locale, t)}
          formatDateLabel={(value) => formatDateLabel(value, locale, t)}
          isSameDay={isSameDay}
          theme={theme}
          onNearBottomChange={setIsAtBottom}
          autoScrollEnabled={!searchQuery.trim()}
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
