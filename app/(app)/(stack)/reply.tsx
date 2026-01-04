// app/(app)/(stack)/reply.tsx
import { useEffect, useState } from "react";
import React from "react";
import { FlatList, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Text, TextInput, Button, Surface, useTheme, IconButton } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";

export default function ReplyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { room, messageId, messageText, messageUser, dmId } = useLocalSearchParams();
  const userId = useSupabaseUserId();

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
      const ids = (data || []).map(
        (row: any) => row?.[COLUMNS.blocks.blockedId]
      );
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
    if (dmId) {
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
          .eq(COLUMNS.dmMessages.threadId, String(dmId))
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
        .channel(`dm-replies-${dmId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLES.dmMessages,
            filter: `${COLUMNS.dmMessages.threadId}=eq.${String(dmId)}`,
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
    if (room && messageId) {
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
          .eq(COLUMNS.roomReplies.roomMessageId, String(messageId))
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
        .channel(`room-replies-${messageId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: TABLES.roomReplies,
            filter: `${COLUMNS.roomReplies.roomMessageId}=eq.${String(messageId)}`,
          },
          loadRoomReplies
        )
        .subscribe();

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
      };
    }
  }, [room, messageId, dmId, blocked]);

  // Send message
  const sendReply = async () => {
    if (!input.trim() || !username || !userId) return;

    try {
      const messageText = input.trim();
      const now = new Date().toISOString();
      // === DM ===
      if (dmId) {
        const { data: thread, error: threadErr } = await supabase
          .from(TABLES.dmThreads)
          .select(COLUMNS.dmThreads.userIds)
          .eq(COLUMNS.dmThreads.id, String(dmId))
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

        const { error } = await supabase.from(TABLES.dmMessages).insert({
          [COLUMNS.dmMessages.threadId]: String(dmId),
          [COLUMNS.dmMessages.senderId]: userId,
          [COLUMNS.dmMessages.username]: username,
          [COLUMNS.dmMessages.text]: messageText,
          [COLUMNS.dmMessages.createdAt]: now,
        });
        if (error) throw error;

        await supabase
          .from(TABLES.dmThreads)
          .update({
            [COLUMNS.dmThreads.lastMessage]: messageText,
            [COLUMNS.dmThreads.lastTimestamp]: now,
          })
          .eq(COLUMNS.dmThreads.id, String(dmId));

        setReplies((prev) => [
          ...prev,
          {
            id: `local-${now}-${userId}`,
            sender: userId,
            username,
            text: messageText,
            timestamp: now,
          },
        ]);
        setInput("");
        return;
      }

      // === Group thread ===
      if (room && messageId) {
        const { error } = await supabase.from(TABLES.roomReplies).insert({
          [COLUMNS.roomReplies.roomMessageId]: String(messageId),
          [COLUMNS.roomReplies.senderId]: userId,
          [COLUMNS.roomReplies.username]: username,
          [COLUMNS.roomReplies.text]: messageText,
          [COLUMNS.roomReplies.createdAt]: now,
        });
        if (error) throw error;

        setReplies((prev) => [
          ...prev,
          {
            id: `local-${now}-${userId}`,
            sender: userId,
            username,
            text: messageText,
            timestamp: now,
          },
        ]);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      <Surface style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
        {/* Header */}
        <Surface style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="titleMedium">Antworten</Text>
        </Surface>

        {/* Original message (only group chats) */}
        {!dmId && (
          <Surface
            style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 15,
              backgroundColor: theme.colors.elevation.level1,
            }}
          >
            <Text variant="labelSmall">{String(messageUser ?? "")}</Text>
            <Text variant="bodyMedium">{String(messageText ?? "")}</Text>
          </Surface>
        )}

        {/* Replies */}
        <FlatList
          data={replies}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const dateValue = toDate(item.timestamp);
            const date = dateValue
              ? dateValue.toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Gerade eben";

            return (
              <Surface style={{ paddingVertical: 8, borderBottomWidth: 0.5 }}>
                <Text variant="labelSmall">
                  {item.username || "???"} • {date}
                </Text>
                <Text variant="bodyMedium">{item.text}</Text>
              </Surface>
            );
          }}
        />

        {/* Input */}
        <Surface style={{ flexDirection: "row", marginTop: 10 }}>
          <TextInput
            mode="outlined"
            label="Antwort"
            value={input}
            onChangeText={setInput}
            multiline
            style={{ flex: 1, marginRight: 10, height: inputHeight }}
            onContentSizeChange={(e) =>
              setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
            }
          />
          <Button mode="contained" onPress={sendReply}>
            Senden
          </Button>
        </Surface>
      </Surface>
    </KeyboardAvoidingView>
  );
}
