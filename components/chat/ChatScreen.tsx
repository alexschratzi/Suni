import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import {
  pickAttachment,
  uploadAttachment,
} from "@/src/lib/chatAttachments";
import type { AttachmentDraft } from "@/src/lib/chatAttachments";

import ChatHeader from "./ChatHeader";
import RoomsList, { RoomItem, RoomKey } from "./RoomsList";
import DirectList, { Direct } from "./DirectList";
import RoomMessages from "./RoomMessages";

type TabKey = "rooms" | "direct";

type UserProfile = {
  username?: string;
  avatarPath?: string | null;
  avatarUrl?: string | null;
};

type RawDirect = {
  id: string;
  otherUid: string;
  last?: string;
  lastTimestamp?: string | null;
  hidden?: boolean;
};

export default function ChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const userId = useSupabaseUserId();

  const locale = i18n.language?.startsWith("de") ? "de-DE" : "en-US";

  const [tab, setTab] = useState<TabKey>("rooms");
  const [search, setSearch] = useState("");

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState<RoomKey | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [chatColor, setChatColor] = useState<string | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(40);
  const [attachment, setAttachment] = useState<AttachmentDraft | null>(null);

  const [rawDirects, setRawDirects] = useState<RawDirect[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) {
      setUsername("");
      setPendingCount(0);
      setBlocked([]);
      setChatColor(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
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

    const loadPending = async () => {
      const { count, error } = await supabase
        .from(TABLES.friendRequests)
        .select(COLUMNS.friendRequests.fromUser, { count: "exact", head: true })
        .eq(COLUMNS.friendRequests.toUser, userId);

      if (error) {
        console.error("Chat pending load error:", error.message);
        return;
      }
      if (cancelled) return;
      setPendingCount(count ?? 0);
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
      await Promise.all([loadProfile(), loadPending(), loadBlocked()]);
    };

    loadAll();

    const channel = supabase
      .channel(`chat-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendRequests,
          filter: `${COLUMNS.friendRequests.toUser}=eq.${userId}`,
        },
        loadPending
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
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!room) return;

    setLoadingMsgs(true);
    let cancelled = false;

    const loadMessages = async () => {
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
        .order(COLUMNS.roomMessages.createdAt, { ascending: false });

      if (error) {
        console.error("Room load error:", error.message);
        if (!cancelled) {
          setMessages([]);
          setLoadingMsgs(false);
        }
        return;
      }

      if (cancelled) return;
      const msgs =
        (data || []).map((row: any) => ({
          id: row?.[COLUMNS.roomMessages.id],
          sender: row?.[COLUMNS.roomMessages.senderId],
          username: row?.[COLUMNS.roomMessages.username],
          text: row?.[COLUMNS.roomMessages.text] ?? "",
          timestamp: row?.[COLUMNS.roomMessages.createdAt],
          attachmentPath: row?.[COLUMNS.roomMessages.attachmentPath] ?? null,
          attachmentName: row?.[COLUMNS.roomMessages.attachmentName] ?? null,
          attachmentMime: row?.[COLUMNS.roomMessages.attachmentMime] ?? null,
          attachmentSize: row?.[COLUMNS.roomMessages.attachmentSize] ?? null,
        })) || [];
      setMessages(msgs);
      setLoadingMsgs(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`room-${room}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.roomMessages,
          filter: `${COLUMNS.roomMessages.roomKey}=eq.${room}`,
        },
        loadMessages
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [room]);

  useEffect(() => {
    if (!userId) {
      setRawDirects([]);
      return;
    }

    let cancelled = false;

    const ensureThreadsForFriends = async () => {
      const { data: friendRows, error: friendErr } = await supabase
        .from(TABLES.friendships)
        .select(`${COLUMNS.friendships.userId},${COLUMNS.friendships.friendId}`)
        .or(
          `${COLUMNS.friendships.userId}.eq.${userId},${COLUMNS.friendships.friendId}.eq.${userId}`
        );

      if (friendErr) {
        console.error("Friends load error:", friendErr.message);
        return;
      }

      const friendIds = (friendRows || [])
        .map((row: any) => {
          const a = row?.[COLUMNS.friendships.userId];
          const b = row?.[COLUMNS.friendships.friendId];
          if (a === userId) return b;
          if (b === userId) return a;
          return null;
        })
        .filter(Boolean);

      const uniqueFriends = Array.from(new Set(friendIds));
      if (uniqueFriends.length === 0) return;

      const { data: threadRows, error: threadErr } = await supabase
        .from(TABLES.dmThreads)
        .select(`${COLUMNS.dmThreads.id},${COLUMNS.dmThreads.userIds}`)
        .contains(COLUMNS.dmThreads.userIds, [userId]);

      if (threadErr) {
        console.error("Direct threads load error:", threadErr.message);
        return;
      }

      const existing = new Set<string>();
      (threadRows || []).forEach((row: any) => {
        const ids = row?.[COLUMNS.dmThreads.userIds];
        if (!Array.isArray(ids)) return;
        const otherUid = ids.find((id: string) => id !== userId);
        if (otherUid) existing.add(otherUid);
      });

      const missing = uniqueFriends.filter((uid) => !existing.has(uid));
      if (missing.length === 0) return;

      const inserts = missing.map((uid) => ({
        [COLUMNS.dmThreads.userIds]: [userId, uid],
        [COLUMNS.dmThreads.lastMessage]: "",
        [COLUMNS.dmThreads.lastTimestamp]: null,
        [COLUMNS.dmThreads.hiddenBy]: [],
      }));

      const { error: insertErr } = await supabase.from(TABLES.dmThreads).insert(inserts);
      if (insertErr) {
        console.error("Direct threads create error:", insertErr.message);
      }
    };

    const loadThreads = async () => {
      const columns = [
        COLUMNS.dmThreads.id,
        COLUMNS.dmThreads.userIds,
        COLUMNS.dmThreads.lastMessage,
        COLUMNS.dmThreads.lastTimestamp,
        COLUMNS.dmThreads.hiddenBy,
      ].join(",");

      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(columns)
        .contains(COLUMNS.dmThreads.userIds, [userId])
        .order(COLUMNS.dmThreads.lastTimestamp, { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Direct threads load error:", error.message);
        if (!cancelled) setRawDirects([]);
        return;
      }

      if (cancelled) return;

      const arr: RawDirect[] = (data || []).map((row: any) => {
        const userIds = row?.[COLUMNS.dmThreads.userIds];
        const hiddenBy = Array.isArray(row?.[COLUMNS.dmThreads.hiddenBy])
          ? row?.[COLUMNS.dmThreads.hiddenBy]
          : [];

        let otherUid = userId;
        if (Array.isArray(userIds)) {
          otherUid = userIds.find((id: string) => id !== userId) || userId;
        }

        return {
          id: row?.[COLUMNS.dmThreads.id],
          otherUid,
          last: row?.[COLUMNS.dmThreads.lastMessage] ?? "",
          lastTimestamp: row?.[COLUMNS.dmThreads.lastTimestamp] ?? null,
          hidden: hiddenBy.includes(userId),
        };
      });
      setRawDirects(arr);
    };

    const syncThreads = async () => {
      await ensureThreadsForFriends();
      await loadThreads();
    };

    syncThreads();

    const channel = supabase
      .channel(`dm-threads-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendships,
          filter: `${COLUMNS.friendships.userId}=eq.${userId}`,
        },
        syncThreads
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendships,
          filter: `${COLUMNS.friendships.friendId}=eq.${userId}`,
        },
        syncThreads
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLES.dmThreads },
        loadThreads
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fetch missing profiles for directs
  useEffect(() => {
    const missing = Array.from(
      new Set(rawDirects.map((d) => d.otherUid).filter((uid) => !userProfiles[uid]))
    );

    if (!missing.length) return;

    const cached = getMemoryProfiles(missing);
    if (Object.keys(cached).length > 0) {
      const mapped = Object.fromEntries(
        Object.entries(cached).map(([id, entry]) => [
          id,
          {
            username: entry.username ?? undefined,
            avatarPath: entry.avatarPath ?? null,
            avatarUrl: entry.avatarUrl ?? null,
          } as UserProfile,
        ])
      );
      setUserProfiles((prev) => ({ ...prev, ...mapped }));
    }

    let cancelled = false;

    (async () => {
      const profiles = await fetchProfilesWithCache(missing);
      if (cancelled) return;
      const mapped = Object.fromEntries(
        Object.entries(profiles).map(([id, entry]) => [
          id,
          {
            username: entry.username ?? undefined,
            avatarPath: entry.avatarPath ?? null,
            avatarUrl: entry.avatarUrl ?? null,
          } as UserProfile,
        ])
      );
      setUserProfiles((prev) => ({ ...prev, ...mapped }));
    })();

    return () => {
      cancelled = true;
    };
  }, [rawDirects, userProfiles]);

  const refreshUnreadCounts = useCallback(() => {
    let cancelled = false;

    const run = async () => {
      if (!userId) {
        setUnreadByThread({});
        return;
      }

      const threadIds = rawDirects.map((d) => d.id).filter(Boolean);
      if (threadIds.length === 0) {
        setUnreadByThread({});
        return;
      }

      const { data: readRows, error: readErr } = await supabase
        .from(TABLES.dmReads)
        .select(`${COLUMNS.dmReads.threadId},${COLUMNS.dmReads.lastReadAt}`)
        .eq(COLUMNS.dmReads.userId, userId)
        .in(COLUMNS.dmReads.threadId, threadIds);

      if (readErr) {
        console.error("DM read state load error:", readErr.message);
        return;
      }

      const lastReadByThread: Record<string, string | null> = {};
      (readRows || []).forEach((row: any) => {
        const threadId = row?.[COLUMNS.dmReads.threadId];
        const lastRead = row?.[COLUMNS.dmReads.lastReadAt] ?? null;
        if (threadId) lastReadByThread[threadId] = lastRead;
      });

      const counts = await Promise.all(
        threadIds.map(async (threadId) => {
          let query = supabase
            .from(TABLES.dmMessages)
            .select(COLUMNS.dmMessages.id, { count: "exact", head: true })
            .eq(COLUMNS.dmMessages.threadId, threadId)
            .neq(COLUMNS.dmMessages.senderId, userId);

          const lastReadAt = lastReadByThread[threadId];
          if (lastReadAt) {
            query = query.gt(COLUMNS.dmMessages.createdAt, lastReadAt);
          }

          const { count, error } = await query;
          if (error) {
            console.error("DM unread count error:", error.message);
            return { threadId, count: 0 };
          }
          return { threadId, count: count ?? 0 };
        })
      );

      if (cancelled) return;
      const map: Record<string, number> = {};
      counts.forEach((entry) => {
        map[entry.threadId] = entry.count ?? 0;
      });
      setUnreadByThread(map);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [rawDirects, userId]);

  useEffect(() => {
    const cleanup = refreshUnreadCounts();
    return () => cleanup?.();
  }, [refreshUnreadCounts]);

  useFocusEffect(
    useCallback(() => {
      const cleanup = refreshUnreadCounts();
      return () => cleanup?.();
    }, [refreshUnreadCounts])
  );

  const directs: Direct[] = useMemo(
    () =>
      rawDirects.map((d) => ({
        id: d.id,
        otherUid: d.otherUid,
        displayName: userProfiles[d.otherUid]?.username || d.otherUid,
        avatarUrl: userProfiles[d.otherUid]?.avatarUrl ?? null,
        last: d.last ?? "",
        lastTimestamp: d.lastTimestamp ?? null,
        hidden: d.hidden ?? false,
        unreadCount: unreadByThread[d.id] ?? 0,
      })),
    [rawDirects, unreadByThread, userProfiles]
  );

  const unreadDirectCount = useMemo(
    () =>
      rawDirects.filter(
        (d) => !(d.hidden ?? false) && (unreadByThread[d.id] ?? 0) > 0
      ).length,
    [rawDirects, unreadByThread]
  );

  // Rooms filter
  const filteredRooms: RoomItem[] = useMemo(() => {
    const list: RoomItem[] = [
      { key: "salzburg", title: t("chat.rooms.salzburg.title"), subtitle: t("chat.rooms.salzburg.subtitle") },
      { key: "oesterreich", title: t("chat.rooms.oesterreich.title"), subtitle: t("chat.rooms.oesterreich.subtitle") },
      { key: "wirtschaft", title: t("chat.rooms.wirtschaft.title"), subtitle: t("chat.rooms.wirtschaft.subtitle") },
    ];

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
    );
  }, [search, t]);

  // Directs filter
  const filteredDirects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directs.filter((d) => !d.hidden);

    const match = (d: Direct) =>
      d.displayName.toLowerCase().includes(q) || (d.last ?? "").toLowerCase().includes(q);

    return directs.filter((d) => !d.hidden && match(d));
  }, [directs, search]);

  // Hide blocked senders
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const sender = (m as any).sender as string | undefined;
        if (!sender) return true;
        return !blocked.includes(sender);
      }),
    [messages, blocked]
  );

  const handlePickAttachment = async () => {
    const next = await pickAttachment();
    if (next) setAttachment(next);
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  // Send message
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
          return [entry, ...prev];
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ChatHeader
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        unreadDirectCount={unreadDirectCount}
      />

      {tab === "rooms" && !room && <RoomsList rooms={filteredRooms} onSelect={setRoom} />}

      {tab === "direct" && (
        <DirectList
          directs={filteredDirects}
          router={router}
          pendingCount={pendingCount}
          onToggleHidden={async (id, makeHidden) => {
            if (!userId) return;
            try {
              const { data, error } = await supabase
                .from(TABLES.dmThreads)
                .select(COLUMNS.dmThreads.hiddenBy)
                .eq(COLUMNS.dmThreads.id, id)
                .maybeSingle();

              if (error) throw error;

              const current = Array.isArray(data?.[COLUMNS.dmThreads.hiddenBy])
                ? (data?.[COLUMNS.dmThreads.hiddenBy] as string[])
                : [];

              const next = makeHidden
                ? Array.from(new Set([...current, userId]))
                : current.filter((v) => v !== userId);

              const { error: updErr } = await supabase
                .from(TABLES.dmThreads)
                .update({ [COLUMNS.dmThreads.hiddenBy]: next })
                .eq(COLUMNS.dmThreads.id, id);
              if (updErr) throw updErr;
            } catch (err) {
              console.error("Fehler beim Ausblenden:", err);
            }
          }}
          accentColor={chatColor || theme.colors.primary}
        />
      )}

      {tab === "rooms" && room && (
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
          onBack={() => setRoom(null)}
          t={t}
          theme={theme}
          accentColor={chatColor || theme.colors.primary}
          router={router}
          uploadAttachment={handlePickAttachment}
          attachment={attachment}
          clearAttachment={clearAttachment}
        />
      )}
    </View>
  );
}
