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
} from "react-native";
import { Text, Surface, useTheme, IconButton } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import InputBar from "@/components/chat/InputBar";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";

export default function ReplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { room, messageId, messageText, messageUser, dmId } = useLocalSearchParams();
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
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);

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
            text: row?.[COLUMNS.dmMessages.text],
            timestamp: row?.[COLUMNS.dmMessages.createdAt],
          })) || [];
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
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
            text: row?.[COLUMNS.roomReplies.text],
            timestamp: row?.[COLUMNS.roomReplies.createdAt],
          })) || [];
        const filtered = all.filter((r) => {
          const sender = (r as any).sender as string | undefined;
          if (!sender) return true;
          return !blocked.includes(sender);
        });
        setReplies(filtered);
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

  // Send message
  const sendReply = async () => {
    if (!input.trim() || !username || !userId) return;

    try {
      const messageText = input.trim();
      const now = new Date().toISOString();
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
          })
          .select(
            [
              COLUMNS.dmMessages.id,
              COLUMNS.dmMessages.senderId,
              COLUMNS.dmMessages.username,
              COLUMNS.dmMessages.text,
              COLUMNS.dmMessages.createdAt,
            ].join(",")
          )
          .single();
        if (error) throw error;

        await supabase
          .from(TABLES.dmThreads)
          .update({
            [COLUMNS.dmThreads.lastMessage]: messageText,
            [COLUMNS.dmThreads.lastTimestamp]: now,
          })
          .eq(COLUMNS.dmThreads.id, dmIdValue);

        if (data) {
          const entry = {
            id: (data as any)?.[COLUMNS.dmMessages.id],
            sender: (data as any)?.[COLUMNS.dmMessages.senderId],
            username: (data as any)?.[COLUMNS.dmMessages.username],
            text: (data as any)?.[COLUMNS.dmMessages.text],
            timestamp: (data as any)?.[COLUMNS.dmMessages.createdAt],
          };
          setReplies((prev) => {
            if (prev.some((item) => item.id === entry.id)) return prev;
            return [...prev, entry];
          });
        }
        setInput("");
        setInputHeight(40);
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
          })
          .select(
            [
              COLUMNS.roomReplies.id,
              COLUMNS.roomReplies.senderId,
              COLUMNS.roomReplies.username,
              COLUMNS.roomReplies.text,
              COLUMNS.roomReplies.createdAt,
            ].join(",")
          )
          .single();
        if (error) throw error;

        if (data) {
          const entry = {
            id: (data as any)?.[COLUMNS.roomReplies.id],
            sender: (data as any)?.[COLUMNS.roomReplies.senderId],
            username: (data as any)?.[COLUMNS.roomReplies.username],
            text: (data as any)?.[COLUMNS.roomReplies.text],
            timestamp: (data as any)?.[COLUMNS.roomReplies.createdAt],
          };
          setReplies((prev) => {
            if (prev.some((item) => item.id === entry.id)) return prev;
            return [...prev, entry];
          });
        }
        setInput("");
        setInputHeight(40);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleMedium">Antworten</Text>
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
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {String(messageText ?? "")}
            </Text>
          </Surface>
        )}

        <FlatList
          data={replies}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingBottom: 12,
          }}
          renderItem={({ item }) => {
            const isDirect = !!dmIdValue;

            if (!isDirect) {
              const timeLabel = formatTimestamp(item.timestamp);
              const meta = `${item.username || "???"} - ${timeLabel}`;
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
                    <Text
                      style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                      numberOfLines={1}
                    >
                      {meta}
                    </Text>
                    <Text style={[styles.msgText, { color: theme.colors.onSurface }]}>
                      {item.text}
                    </Text>
                  </Surface>
                </View>
              );
            }

            const isMine = !!userId && item.sender === userId;
            const timeLabel = formatTime(item.timestamp);

            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.rowMine : styles.rowOther,
                ]}
              >
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
  messageRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  threadRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  threadCard: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    fontSize: 12,
    marginBottom: 6,
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
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
  time: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: "flex-end",
  },
});
