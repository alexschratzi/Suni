import React from "react";
import { FlatList, View, TouchableOpacity } from "react-native";
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
}: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={isDirect ? styles.dmListContent : styles.threadListContent}
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
                    <Text style={[styles.msgText, { color: textColor }]}>
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
                  <Text style={[styles.timeInline, { color: timeColor }]}>
                    {timeLabel}
                  </Text>
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
