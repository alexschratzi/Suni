import React from "react";
import { FlatList, View, TouchableOpacity, GestureResponderEvent } from "react-native";
import { Text, Surface, Avatar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

import { initials } from "@/utils/utils";
import { styles } from "./replyStyles";

type ReplyItem = {
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

type Props = {
  items: ReplyItem[];
  isDirect: boolean;
  userId: string | null;
  avatarUrls: Record<string, string | null>;
  voteStats: VoteStats;
  handleVote: (replyId: string, value: 1 | -1) => void;
  openAttachment: (path?: string | null) => void;
  formatTime: (value: any) => string;
  formatTimestamp: (value: any) => string;
  formatDateLabel: (value: any) => string;
  isSameDay: (a: any, b: any) => boolean;
  theme: any;
  onUserPress?: (
    event: GestureResponderEvent,
    userId?: string,
    username?: string
  ) => void;
  autoScrollEnabled?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
};

export default function ReplyMessageList({
  items,
  isDirect,
  userId,
  avatarUrls,
  voteStats,
  handleVote,
  openAttachment,
  formatTime,
  formatTimestamp,
  formatDateLabel,
  isSameDay,
  theme,
  onUserPress,
  autoScrollEnabled = true,
  onLoadMore,
  loadingMore = false,
  hasMore = false,
}: Props) {
  const listRef = React.useRef<FlatList<ReplyItem> | null>(null);
  const hasAutoScrolledRef = React.useRef(false);
  const isNearBottomRef = React.useRef(true);
  const lastItemCountRef = React.useRef(0);
  const hasUserScrolledRef = React.useRef(false);
  const loadMoreTriggeredRef = React.useRef(false);

  const scrollToBottom = React.useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  React.useEffect(() => {
    if (!isDirect || !autoScrollEnabled) return;
    if (items.length === 0) return;
    const prevCount = lastItemCountRef.current;
    lastItemCountRef.current = items.length;

    if (!hasAutoScrolledRef.current) {
      scrollToBottom(false);
      hasAutoScrolledRef.current = true;
      return;
    }

    const appended = items.length > prevCount;
    if (appended && isNearBottomRef.current) {
      scrollToBottom(true);
    }
  }, [isDirect, items.length, scrollToBottom]);

  const handleContentSizeChange = React.useCallback(() => {
    if (!isDirect || !autoScrollEnabled) return;
    if (hasAutoScrolledRef.current || items.length === 0) return;
    scrollToBottom(false);
    hasAutoScrolledRef.current = true;
  }, [autoScrollEnabled, isDirect, items.length, scrollToBottom]);

  const handleScrollBeginDrag = React.useCallback(() => {
    hasUserScrolledRef.current = true;
  }, []);

  const handleScroll = React.useCallback(
    (event: any) => {
      const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent || {};
      const offsetY = contentOffset?.y ?? 0;
      const visibleHeight = layoutMeasurement?.height ?? 0;
      const contentHeight = contentSize?.height ?? 0;

      if (isDirect && autoScrollEnabled) {
        const distanceFromBottom = contentHeight - (offsetY + visibleHeight);
        isNearBottomRef.current = distanceFromBottom < 80;
      }

      if (
        onLoadMore &&
        hasMore &&
        !loadingMore &&
        hasUserScrolledRef.current
      ) {
        if (offsetY < 60) {
          if (!loadMoreTriggeredRef.current) {
            loadMoreTriggeredRef.current = true;
            onLoadMore();
          }
        } else if (offsetY > 140) {
          loadMoreTriggeredRef.current = false;
        }
      }
    },
    [autoScrollEnabled, hasMore, isDirect, loadingMore, onLoadMore]
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={isDirect ? styles.dmListContent : styles.threadListContent}
      onContentSizeChange={isDirect ? handleContentSizeChange : undefined}
      onScroll={handleScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      scrollEventThrottle={16}
      renderItem={({ item, index }) => {
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
                    {onUserPress && item.sender ? (
                      <TouchableOpacity
                        onPress={(event) =>
                          onUserPress(event, item.sender, item.username)
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
                          {item.username || "???"}
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
                        {item.username || "???"}
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
                    style={styles.attachmentRow}
                    onPress={() => openAttachment(item.attachmentPath)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="attach" size={16} color={theme.colors.primary} />
                    <Text
                      numberOfLines={1}
                      style={[styles.attachmentText, { color: theme.colors.onSurface }]}
                    >
                      {item.attachmentName || "file"}
                    </Text>
                  </TouchableOpacity>
                )}
              </Surface>
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
            </View>
          );
        }

        const isMine = !!userId && item.sender === userId;
        const timeLabel = formatTime(item.timestamp);
        const hasText = !!item.text;
        const hasAttachment = !!item.attachmentPath;
        const nextItem = items[index + 1];
        const prevItem = items[index - 1];
        const showDate = !prevItem || !isSameDay(prevItem.timestamp, item.timestamp);
        const dateLabel = formatDateLabel(item.timestamp);
        const showTail = !nextItem || nextItem.sender !== item.sender;
        const bubbleColor = isMine ? theme.colors.primary : theme.colors.surfaceVariant;
        const textColor = isMine ? theme.colors.onPrimary : theme.colors.onSurface;
        const timeColor = isMine ? theme.colors.onPrimary : theme.colors.onSurfaceVariant;
        const rowSpacing = showTail ? 8 : 2;

        return (
          <View>
            {showDate && !!dateLabel && (
              <View
                style={[
                  styles.dateSeparator,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  style={[
                    styles.dateSeparatorText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {dateLabel}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.messageRow,
                isMine ? styles.rowMine : styles.rowOther,
                { marginBottom: rowSpacing },
              ]}
            >
              <View style={styles.bubbleWrap}>
                <Surface
                  style={[
                    styles.bubble,
                    styles.bubbleShadow,
                    isMine ? styles.bubbleMine : styles.bubbleOther,
                    !showTail &&
                      (isMine ? styles.bubbleNoTailMine : styles.bubbleNoTailOther),
                    { backgroundColor: bubbleColor },
                  ]}
                >
                  {hasText && (
                    <Text style={[styles.dmText, { color: textColor }]}>
                      {item.text}
                    </Text>
                  )}
                  {hasAttachment && (
                    <TouchableOpacity
                      style={styles.attachmentRow}
                      onPress={() => openAttachment(item.attachmentPath)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="attach" size={16} color={textColor} />
                      <Text
                        numberOfLines={1}
                        style={[styles.attachmentText, { color: textColor }]}
                      >
                        {item.attachmentName || "file"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: timeColor }]}>
                      {timeLabel}
                    </Text>
                  </View>
                </Surface>
                {showTail && (
                  <View
                    style={[
                      styles.bubbleTail,
                      isMine ? styles.bubbleTailMine : styles.bubbleTailOther,
                      { backgroundColor: bubbleColor },
                    ]}
                  />
                )}
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}
