import React, { useEffect, useLayoutEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Alert, View, Linking } from "react-native";
import { useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

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

export default function DirectReplyScreen({ dmId, otherUid, otherName }: Props) {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();
  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [replies, setReplies] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [dmPartnerName, setDmPartnerName] = useState(otherName || "");
  const [inputHeight, setInputHeight] = useState(40);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);

  const headerTitle = dmPartnerName || t("chat.directTitle", "Chat");

  useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [headerTitle, navigation]);

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
        .eq(COLUMNS.dmMessages.threadId, dmId)
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
          filter: `${COLUMNS.dmMessages.threadId}=eq.${dmId}`,
        },
        loadDmReplies
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [blocked, dmId]);

  useEffect(() => {
    if (!dmId || !userId) return;
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
  }, [dmId, replies.length, userId]);

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
        <ReplyMessageList
          items={replies}
          isDirect
          userId={userId}
          avatarUrls={{}}
          voteStats={{}}
          handleVote={() => {}}
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
