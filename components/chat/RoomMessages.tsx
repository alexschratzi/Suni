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
  Alert,
  GestureResponderEvent,
} from "react-native";
import { ActivityIndicator, Text, Menu, Surface, Avatar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import InputBar from "./InputBar";
import { createAttachmentUrl } from "@/src/lib/chatAttachments";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import { getOrCreateDmThread } from "@/src/lib/dmThreads";
import {
  blockUser as blockFriend,
  pairFor,
  sendFriendRequest as sendFriendRequestHelper,
} from "@/src/lib/friends";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";
import { initials } from "@/utils/utils";

import type { RoomKey } from "./RoomsList";

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

type VoteStats = Record<string, { score: number; myVote: number }>;

const voteCache: Record<string, VoteStats> = {};
const avatarCache: Record<string, Record<string, string | null>> = {};

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
  onBack?: () => void;
  t: (key: string) => string;
  theme: any;
  router: Router;
  accentColor: string;
  uploadAttachment?: () => void;
  attachment?: AttachmentDraft | null;
  clearAttachment?: () => void;
  showHeader?: boolean;
  roomTitle?: string;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
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
    showHeader = true,
    roomTitle,
    onLoadMore,
    loadingMore = false,
    hasMore = false,
  } = props;
  const userId = useSupabaseUserId();
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("newest");
  const [sortMenuVisible, setSortMenuVisible] = React.useState(false);
  const [userMenuVisible, setUserMenuVisible] = React.useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<{ x: number; y: number } | null>(
    null
  );
  const [userMenuUser, setUserMenuUser] = React.useState<{ id: string; name: string } | null>(
    null
  );
  const [userMenuIsFriend, setUserMenuIsFriend] = React.useState<boolean | null>(
    null
  );
  const friendStatusCache = React.useRef<Record<string, boolean>>({});
  const hasUserScrolledRef = React.useRef(false);
  const [voteStats, setVoteStats] = React.useState<VoteStats>(
    () => voteCache[room] ?? {}
  );
  const [avatarUrls, setAvatarUrls] = React.useState<Record<string, string | null>>(
    () => avatarCache[room] ?? {}
  );

  const resolvedRoomTitle =
    roomTitle ||
    (room === "salzburg"
      ? t("chat.rooms.salzburg.title")
      : room === "oesterreich"
      ? t("chat.rooms.oesterreich.title")
      : room === "wirtschaft"
      ? t("chat.rooms.wirtschaft.title")
      : String(room));

  React.useEffect(() => {
    setVoteStats(voteCache[room] ?? {});
    setAvatarUrls(avatarCache[room] ?? {});
  }, [room]);

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
        messageUserId: message.sender ?? "",
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

  const handleScrollBeginDrag = React.useCallback(() => {
    hasUserScrolledRef.current = true;
  }, []);

  const handleEndReached = React.useCallback(() => {
    if (!onLoadMore || !hasMore || loadingMore || !hasUserScrolledRef.current) {
      return;
    }
    onLoadMore();
  }, [hasMore, loadingMore, onLoadMore]);

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

  const sendFriendRequest = async (targetUid: string) => {
    if (!userId) return;
    if (targetUid === userId) {
      Alert.alert(t("friends.snacks.self"));
      return;
    }

    try {
      const status = await sendFriendRequestHelper(userId, targetUid);
      if (status === "blockedByOther") {
        Alert.alert(
          t("friends.snacks.blockedByOther")
        );
        return;
      }
      if (status === "blockedByMe") {
        Alert.alert(t("friends.snacks.youBlocked"));
        return;
      }
      if (status === "alreadyFriends") {
        Alert.alert(t("friends.snacks.alreadyFriends"));
        return;
      }
      if (status === "pendingSent") {
        Alert.alert(t("friends.snacks.pendingSent"));
        return;
      }
      if (status === "pendingReceived") {
        Alert.alert(t("friends.snacks.pendingReceived"));
        return;
      }

      Alert.alert(t("friends.snacks.sent"));
    } catch (err) {
      console.error("Friend request failed:", err);
      Alert.alert(t("friends.errors.send"));
    }
  };

  const openDirectChat = async (targetUid: string, targetName: string) => {
    if (!userId) return;
    try {
      const threadId = await getOrCreateDmThread(userId, targetUid);

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
      Alert.alert(t("chat.menu.openChat"), t("chat.alerts.openChatFailed"));
    }
  };

  const blockUser = async (targetUid: string) => {
    if (!userId) return;
    try {
      const status = await blockFriend(userId, targetUid);
      if (status === "alreadyBlocked") {
        Alert.alert(t("friends.snacks.blocked"));
        return;
      }

      Alert.alert(t("friends.snacks.blocked"));
    } catch (err) {
      console.error("Block failed:", err);
      Alert.alert(t("friends.errors.block"));
    }
  };

  const reportUser = () => {
    Alert.alert(t("chat.menu.report"), t("chat.alerts.reportThanks"));
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
      t("chat.alerts.blockTitle"),
      t("chat.alerts.blockConfirm", { name: target.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.menu.block"),
          style: "destructive",
          onPress: () => {
            blockUser(target.id);
          },
        },
      ]
    );
  };

  React.useEffect(() => {
    let cancelled = false;
    const messageIds = messages.map((msg) => msg.id).filter(Boolean);

    const loadVotes = async () => {
      if (!userId || messageIds.length === 0) {
        if (messageIds.length === 0) {
          setVoteStats({});
          voteCache[room] = {};
        }
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
      voteCache[room] = next;
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

    const cached = getMemoryProfiles(missing);
    if (Object.keys(cached).length > 0) {
      const mapped = Object.fromEntries(
        Object.entries(cached).map(([id, entry]) => [id, entry.avatarUrl ?? null])
      );
      setAvatarUrls((prev) => {
        const next = { ...prev, ...mapped };
        avatarCache[room] = next;
        return next;
      });
    }

    const loadAvatars = async () => {
      const profiles = await fetchProfilesWithCache(missing);
      if (cancelled) return;
      const mapped = Object.fromEntries(
        Object.entries(profiles).map(([id, entry]) => [id, entry.avatarUrl ?? null])
      );
      setAvatarUrls((prev) => {
        const next = { ...prev, ...mapped };
        avatarCache[room] = next;
        return next;
      });
    };

    loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [messages, avatarUrls]);

  const showLoadingHeader = loading && messages.length > 0;
  const showEmptyLoading = loading && messages.length === 0;

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
      {showHeader && (
        <View
          style={[
            styles.roomHeader,
            { borderBottomColor: theme.colors.outlineVariant },
          ]}
        >
          <View style={styles.roomHeaderLeft}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color={accentColor} />
              </TouchableOpacity>
            )}
            <Text style={[styles.roomTitle, { color: theme.colors.onSurface }]}>
              {resolvedRoomTitle}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: theme.colors.onSurfaceVariant }]}>
          {t("chat.sort.label")}
        </Text>
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
                {sortLabel}
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
          <Menu.Item onPress={handleReport} title={t("chat.menu.report")} />
          {userMenuIsFriend === null ? (
            <Menu.Item title={t("common.loading")} disabled />
          ) : userMenuIsFriend ? (
            <Menu.Item onPress={handleOpenChat} title={t("chat.menu.openChat")} />
          ) : (
            <Menu.Item onPress={handleFriendRequest} title={t("chat.menu.sendRequest")} />
          )}
          <Menu.Item onPress={handleBlock} title={t("chat.menu.block")} />
        </Menu>
      )}

      <FlatList
        data={sortedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 24,
        }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          showLoadingHeader ? (
            <View style={styles.listHeaderLoading}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          showEmptyLoading ? (
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
          ) : null
        }
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
              <Surface
                style={[
                  styles.threadWrap,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                    borderLeftColor: accentColor,
                  },
                ]}
                mode="elevated"
              >
                <TouchableOpacity
                  onPress={() => openThread(item)}
                  activeOpacity={0.7}
                  style={styles.messageTap}
                >
                  <View style={styles.threadCard}>
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
                        {item.sender ? (
                          <TouchableOpacity
                            onPress={(event) =>
                              openUserMenu(event, item.sender, nameLabel)
                            }
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <Text
                              style={[
                                styles.metaUser,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                              numberOfLines={1}
                            >
                              {nameLabel}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text
                            style={[
                              styles.metaUser,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                            numberOfLines={1}
                          >
                            {nameLabel}
                          </Text>
                        )}
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
                  </View>
                </TouchableOpacity>
                <View
                  style={[
                    styles.voteColumn,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
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
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  sortAnchor: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "700",
  },
  messageRow: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  messageTap: {
    flex: 1,
  },
  threadWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  voteColumn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  voteButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  voteScore: {
    fontSize: 11,
    fontWeight: "700",
    marginVertical: 2,
  },
  threadCard: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metaUser: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  metaTime: {
    fontSize: 10,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 19,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  attachmentText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
  },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
  listHeaderLoading: { alignItems: "center", paddingVertical: 8 },
});
