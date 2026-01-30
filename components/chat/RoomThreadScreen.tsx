import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";

import RoomMessages from "./RoomMessages";
import type { RoomKey } from "./RoomsList";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { getMemoryProfiles } from "@/src/lib/profileCache";
import { pickAttachment, uploadAttachment } from "@/src/lib/chatAttachments";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";
import {
  getRoomMessagesCache,
  loadRoomMessagesCache,
  saveRoomMessagesCache,
} from "@/src/lib/roomThreadCache";

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

type Props = {
  room: RoomKey;
  roomTitle?: string;
  initialAccentColor?: string;
  initialUsername?: string;
};

const ROOM_PAGE_SIZE = 40;

export default function RoomThreadScreen({
  room,
  roomTitle,
  initialAccentColor,
  initialUsername,
}: Props) {
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();

  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";
  const fallbackTitle =
    room === "salzburg"
      ? t("chat.rooms.salzburg.title")
      : room === "oesterreich"
      ? t("chat.rooms.oesterreich.title")
      : room === "wirtschaft"
      ? t("chat.rooms.wirtschaft.title")
      : String(room);
  const headerTitle = roomTitle || fallbackTitle;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [chatColor, setChatColor] = useState<string | null>(
    initialAccentColor?.trim() ? initialAccentColor : null
  );
  const networkLoadedRef = useRef(false);
  const oldestTimestampRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [headerTitle, navigation]);

  useEffect(() => {
    if (!userId) {
      setUsername("");
      setChatColor(null);
      setBlocked([]);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      const cached = getMemoryProfiles([userId])[userId];
      if (cached?.username) {
        setUsername(cached.username ?? "");
      }

      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(`${COLUMNS.profiles.username},${COLUMNS.profiles.settings}`)
        .eq(COLUMNS.profiles.id, userId)
        .maybeSingle();

      if (error) {
        console.error("Chat profile load error:", error.message);
        return;
      }
      if (cancelled) return;

      const settings = (data as any)?.[COLUMNS.profiles.settings] || {};
      setUsername((data as any)?.[COLUMNS.profiles.username] ?? "");
      setChatColor(
        typeof settings.chatThemeColor === "string" ? settings.chatThemeColor : null
      );
    };

    const loadBlocked = async () => {
      const { data, error } = await supabase
        .from(TABLES.blocks)
        .select(COLUMNS.blocks.blockedId)
        .eq(COLUMNS.blocks.blockerId, userId);

      if (error) {
        console.error("Chat blocked load error:", error.message);
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
      .channel(`room-thread-user-${userId}`)
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

  useEffect(() => {
    if (!room) return;

    setLoadingMsgs(true);
    setHasMore(true);
    setLoadingMore(false);
    oldestTimestampRef.current = null;
    setMessages([]);
    let cancelled = false;
    networkLoadedRef.current = false;

    const cached = getRoomMessagesCache(room);
    if (cached?.length) {
      setMessages(cached);
      const oldestCached = cached[cached.length - 1]?.timestamp;
      if (oldestCached) {
        oldestTimestampRef.current = oldestCached;
      }
    }

    loadRoomMessagesCache(room).then((stored) => {
      if (cancelled || networkLoadedRef.current) return;
      if (stored?.length) {
        setMessages((prev) => {
          if (prev.length) return prev;
          const oldestStored = stored[stored.length - 1]?.timestamp;
          if (oldestStored) {
            oldestTimestampRef.current = oldestStored;
          }
          return stored;
        });
      }
    });

    const mapRows = (rows: any[]) =>
      (rows || [])
        .map((row: any) => ({
          id: row?.[COLUMNS.roomMessages.id],
          sender: row?.[COLUMNS.roomMessages.senderId],
          username: row?.[COLUMNS.roomMessages.username],
          text: row?.[COLUMNS.roomMessages.text] ?? "",
          timestamp: row?.[COLUMNS.roomMessages.createdAt],
          attachmentPath: row?.[COLUMNS.roomMessages.attachmentPath] ?? null,
          attachmentName: row?.[COLUMNS.roomMessages.attachmentName] ?? null,
          attachmentMime: row?.[COLUMNS.roomMessages.attachmentMime] ?? null,
          attachmentSize: row?.[COLUMNS.roomMessages.attachmentSize] ?? null,
        }))
        .filter((entry: any) => entry?.id);

    const updateOldest = (rows: any[]) => {
      let oldest: string | null = null;
      rows.forEach((row) => {
        const ts = row?.[COLUMNS.roomMessages.createdAt];
        if (!ts) return;
        if (!oldest || new Date(ts).getTime() < new Date(oldest).getTime()) {
          oldest = ts;
        }
      });
      if (oldest) {
        oldestTimestampRef.current = oldest;
      }
    };

    const loadLatestPage = async () => {
      const { data, error } = await supabase
        .from(TABLES.roomMessages)
        .select(
          [
            COLUMNS.roomMessages.id,
            COLUMNS.roomMessages.senderId,
            COLUMNS.roomMessages.username,
            COLUMNS.roomMessages.text,
            COLUMNS.roomMessages.createdAt,
            COLUMNS.roomMessages.attachmentPath,
            COLUMNS.roomMessages.attachmentName,
            COLUMNS.roomMessages.attachmentMime,
            COLUMNS.roomMessages.attachmentSize,
          ].join(",")
        )
        .eq(COLUMNS.roomMessages.roomKey, room)
        .order(COLUMNS.roomMessages.createdAt, { ascending: false })
        .limit(ROOM_PAGE_SIZE);

      if (error) {
        console.error("Room load error:", error.message);
        if (!cancelled) {
          setLoadingMsgs(false);
        }
        return;
      }

      if (cancelled) return;
      const rows = data || [];
      updateOldest(rows);
      setHasMore(rows.length === ROOM_PAGE_SIZE);
      const msgs = mapRows(rows);
      networkLoadedRef.current = true;
      setMessages((prev) => {
        const incomingIds = new Set(msgs.map((entry) => entry.id));
        const merged = [...msgs, ...prev.filter((entry) => !incomingIds.has(entry.id))];
        saveRoomMessagesCache(room, merged);
        return merged;
      });
      setLoadingMsgs(false);
    };

    loadLatestPage();

    const channel = supabase
      .channel(`room-${room}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: TABLES.roomMessages,
          filter: `${COLUMNS.roomMessages.roomKey}=eq.${room}`,
        },
        (payload) => {
          if (cancelled) return;
          const mapped = mapRows([payload.new]).filter(Boolean);
          if (mapped.length === 0) return;
          setMessages((prev) => {
            const existing = new Set(prev.map((entry) => entry.id));
            const next = mapped.filter((entry) => !existing.has(entry.id));
            if (!next.length) return prev;
            const merged = [...next, ...prev];
            saveRoomMessagesCache(room, merged);
            return merged;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [room]);

  const loadOlderMessages = useCallback(async () => {
    if (!room || loadingMore || !hasMore) return;
    const before = oldestTimestampRef.current;
    if (!before) return;

    setLoadingMore(true);
    const { data, error } = await supabase
      .from(TABLES.roomMessages)
      .select(
        [
          COLUMNS.roomMessages.id,
          COLUMNS.roomMessages.senderId,
          COLUMNS.roomMessages.username,
          COLUMNS.roomMessages.text,
          COLUMNS.roomMessages.createdAt,
          COLUMNS.roomMessages.attachmentPath,
          COLUMNS.roomMessages.attachmentName,
          COLUMNS.roomMessages.attachmentMime,
          COLUMNS.roomMessages.attachmentSize,
        ].join(",")
      )
      .eq(COLUMNS.roomMessages.roomKey, room)
      .lt(COLUMNS.roomMessages.createdAt, before)
      .order(COLUMNS.roomMessages.createdAt, { ascending: false })
      .limit(ROOM_PAGE_SIZE);

    if (error) {
      console.error("Room load more error:", error.message);
      setLoadingMore(false);
      return;
    }

    const rows = data || [];
    if (rows.length < ROOM_PAGE_SIZE) {
      setHasMore(false);
    }

    let oldest: string | null = null;
    rows.forEach((row: any) => {
      const ts = row?.[COLUMNS.roomMessages.createdAt];
      if (!ts) return;
      if (!oldest || new Date(ts).getTime() < new Date(oldest).getTime()) {
        oldest = ts;
      }
    });
    if (oldest) oldestTimestampRef.current = oldest;

    const mapped = rows
      .map((row: any) => ({
        id: row?.[COLUMNS.roomMessages.id],
        sender: row?.[COLUMNS.roomMessages.senderId],
        username: row?.[COLUMNS.roomMessages.username],
        text: row?.[COLUMNS.roomMessages.text] ?? "",
        timestamp: row?.[COLUMNS.roomMessages.createdAt],
        attachmentPath: row?.[COLUMNS.roomMessages.attachmentPath] ?? null,
        attachmentName: row?.[COLUMNS.roomMessages.attachmentName] ?? null,
        attachmentMime: row?.[COLUMNS.roomMessages.attachmentMime] ?? null,
        attachmentSize: row?.[COLUMNS.roomMessages.attachmentSize] ?? null,
      }))
      .filter((entry: any) => entry?.id);

    if (mapped.length > 0) {
      setMessages((prev) => {
        const existing = new Set(prev.map((entry) => entry.id));
        const next = mapped.filter((entry) => !existing.has(entry.id));
        if (!next.length) return prev;
        const merged = [...prev, ...next];
        saveRoomMessagesCache(room, merged);
        return merged;
      });
    }

    setLoadingMore(false);
  }, [hasMore, loadingMore, room]);

  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const sender = (m as any).sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      }),
    [blocked, messages]
  );

  const handlePickAttachment = async () => {
    const next = await pickAttachment();
    if (next) setAttachment(next);
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  const sendMessage = async () => {
    const messageText = input.trim();
    if ((!messageText && !attachment) || !room || !username || !userId) return;

    try {
      const now = new Date().toISOString();
      let uploaded = null;

      if (attachment) {
        uploaded = await uploadAttachment(attachment, `rooms/${room}`);
      }

      const payload: Record<string, any> = {
        [COLUMNS.roomMessages.roomKey]: room,
        [COLUMNS.roomMessages.senderId]: userId,
        [COLUMNS.roomMessages.username]: username,
        [COLUMNS.roomMessages.text]: messageText,
        [COLUMNS.roomMessages.createdAt]: now,
      };

      if (uploaded) {
        payload[COLUMNS.roomMessages.attachmentPath] = uploaded.path;
        payload[COLUMNS.roomMessages.attachmentName] = uploaded.name;
        payload[COLUMNS.roomMessages.attachmentMime] = uploaded.mimeType;
        payload[COLUMNS.roomMessages.attachmentSize] = uploaded.size;
      }

      const { data, error } = await supabase
        .from(TABLES.roomMessages)
        .insert(payload)
        .select(
          [
            COLUMNS.roomMessages.id,
            COLUMNS.roomMessages.senderId,
            COLUMNS.roomMessages.username,
            COLUMNS.roomMessages.text,
            COLUMNS.roomMessages.createdAt,
            COLUMNS.roomMessages.attachmentPath,
            COLUMNS.roomMessages.attachmentName,
            COLUMNS.roomMessages.attachmentMime,
            COLUMNS.roomMessages.attachmentSize,
          ].join(",")
        )
        .single();
      if (error) throw error;

      if (data) {
        const entry = {
          id: (data as any)?.[COLUMNS.roomMessages.id],
          sender: (data as any)?.[COLUMNS.roomMessages.senderId],
          username: (data as any)?.[COLUMNS.roomMessages.username],
          text: (data as any)?.[COLUMNS.roomMessages.text] ?? "",
          timestamp: (data as any)?.[COLUMNS.roomMessages.createdAt],
          attachmentPath: (data as any)?.[COLUMNS.roomMessages.attachmentPath] ?? null,
          attachmentName: (data as any)?.[COLUMNS.roomMessages.attachmentName] ?? null,
          attachmentMime: (data as any)?.[COLUMNS.roomMessages.attachmentMime] ?? null,
          attachmentSize: (data as any)?.[COLUMNS.roomMessages.attachmentSize] ?? null,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === entry.id)) return prev;
          const next = [entry, ...prev];
          saveRoomMessagesCache(room, next);
          return next;
        });
      }

      setInput("");
      setInputHeight(40);
      setAttachment(null);
    } catch (err) {
      console.error("Room message send failed:", err);
    }
  };

  return (
    <RoomMessages
      room={room}
      locale={locale}
      messages={visibleMessages}
      loading={loadingMsgs}
      input={input}
      setInput={setInput}
      inputHeight={inputHeight}
      setInputHeight={setInputHeight}
      sendMessage={sendMessage}
      t={t}
      theme={theme}
      accentColor={chatColor || theme.colors.primary}
      router={router}
      uploadAttachment={handlePickAttachment}
      attachment={attachment}
      clearAttachment={clearAttachment}
      showHeader={false}
      onLoadMore={loadOlderMessages}
      loadingMore={loadingMore}
      hasMore={hasMore}
    />
  );
}
