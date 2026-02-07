import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";

import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import { fetchUnreadDmCounts, getOrCreateDmThread } from "@/src/lib/dmThreads";
import ChatHeader from "./ChatHeader";
import RoomsList, { RoomItem } from "./RoomsList";
import DirectList, { Direct } from "./DirectList";
import {
  fetchVisibleRoomThreads,
  searchRoomThreads,
  subscribeRoomThread,
} from "@/src/lib/roomThreads";

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
  const { t } = useTranslation();
  const userId = useSupabaseUserId();

  const [tab, setTab] = useState<TabKey>("rooms");
  const [search, setSearch] = useState("");

  const [roomThreads, setRoomThreads] = useState<RoomItem[]>([]);
  const [roomSearchResults, setRoomSearchResults] = useState<RoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsSearchLoading, setRoomsSearchLoading] = useState(false);
  const [roomPendingKeys, setRoomPendingKeys] = useState<Set<string>>(new Set());

  const [username, setUsername] = useState("");
  const [chatColor, setChatColor] = useState<string | null>(null);

  const [rawDirects, setRawDirects] = useState<RawDirect[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadByThread, setUnreadByThread] = useState<Record<string, number>>({});
  const syncThreadsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!userId) {
      setUsername("");
      setPendingCount(0);
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

    const loadAll = async () => {
      await Promise.all([loadProfile(), loadPending()]);
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
    if (!userId) {
      setRawDirects([]);
      syncThreadsRef.current = null;
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

      await Promise.all(
        missing.map(async (uid) => {
          try {
            await getOrCreateDmThread(userId, uid);
          } catch (err: any) {
            console.error("Direct threads create error:", err?.message || err);
          }
        })
      );
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
      await loadThreads();
      ensureThreadsForFriends()
        .then(loadThreads)
        .catch((err) => console.error("Direct threads sync error:", err?.message || err));
    };

    syncThreadsRef.current = syncThreads;
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
        {
          event: "*",
          schema: "public",
          table: TABLES.dmThreads,
          filter: `${COLUMNS.dmThreads.userIds}=cs.{${userId}}`,
        },
        loadThreads
      )
      .subscribe();

    return () => {
      cancelled = true;
      syncThreadsRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      syncThreadsRef.current?.();
    }, [])
  );

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

      try {
        const counts = await fetchUnreadDmCounts();
        if (cancelled) return;
        const map: Record<string, number> = {};
        threadIds.forEach((threadId) => {
          map[threadId] = counts[threadId] ?? 0;
        });
        setUnreadByThread(map);
      } catch (err: any) {
        console.error("DM unread count error:", err?.message || err);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [rawDirects, userId]);

  useEffect(() => {
    if (tab !== "direct") return;
    const cleanup = refreshUnreadCounts();
    return () => cleanup?.();
  }, [refreshUnreadCounts, tab]);

  useFocusEffect(
    useCallback(() => {
      if (tab !== "direct") return;
      const cleanup = refreshUnreadCounts();
      return () => cleanup?.();
    }, [refreshUnreadCounts, tab])
  );

  const mapRoomRows = useCallback(
    (rows: any[] | null | undefined, visibleFallback: boolean) =>
      (rows || [])
        .map((row: any) => {
          const key = row?.thread_key ?? row?.room_key ?? row?.key;
          if (!key) return null;
          const rawNumber = row?.thread_number;
          const parsedNumber =
            typeof rawNumber === "number"
              ? rawNumber
              : typeof rawNumber === "string"
              ? Number(rawNumber)
              : null;
          return {
            key,
            title: row?.title ?? String(key),
            subtitle: row?.subtitle ?? null,
            threadNumber: Number.isFinite(parsedNumber) ? parsedNumber : null,
            isVisible:
              typeof row?.is_visible === "boolean" ? row.is_visible : visibleFallback,
          } as RoomItem;
        })
        .filter(Boolean),
    []
  );

  const refreshVisibleRooms = useCallback(async () => {
    if (!userId) {
      setRoomThreads([]);
      setRoomsLoading(false);
      return;
    }

    setRoomsLoading(true);
    try {
      const rows = await fetchVisibleRoomThreads();
      setRoomThreads(mapRoomRows(rows, true) as RoomItem[]);
    } catch (err: any) {
      console.error("Room threads load error:", err?.message || err);
      setRoomThreads([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [mapRoomRows, userId]);

  useEffect(() => {
    refreshVisibleRooms();
  }, [refreshVisibleRooms]);

  useFocusEffect(
    useCallback(() => {
      if (tab !== "rooms") return;
      refreshVisibleRooms();
    }, [refreshVisibleRooms, tab])
  );

  useEffect(() => {
    if (tab !== "rooms") {
      setRoomsSearchLoading(false);
      return;
    }
    const q = search.trim();
    if (!q) {
      setRoomSearchResults([]);
      setRoomsSearchLoading(false);
      return;
    }
    if (!userId) {
      setRoomSearchResults([]);
      setRoomsSearchLoading(false);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      setRoomsSearchLoading(true);
      try {
        const rows = await searchRoomThreads(q);
        if (!cancelled) {
          setRoomSearchResults(mapRoomRows(rows, false) as RoomItem[]);
        }
      } catch (err: any) {
        console.error("Room threads search error:", err?.message || err);
        if (!cancelled) setRoomSearchResults([]);
      } finally {
        if (!cancelled) setRoomsSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [mapRoomRows, search, tab, userId]);

  const handleMakeVisible = useCallback(
    async (room: RoomItem) => {
      if (!room?.key) return;
      setRoomPendingKeys((prev) => {
        const next = new Set(prev);
        next.add(room.key);
        return next;
      });

      try {
        await subscribeRoomThread(room.key);
        setRoomSearchResults((prev) =>
          prev.map((item) =>
            item.key === room.key ? { ...item, isVisible: true } : item
          )
        );
        await refreshVisibleRooms();
      } catch (err: any) {
        console.error("Room thread subscribe error:", err?.message || err);
      } finally {
        setRoomPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(room.key);
          return next;
        });
      }
    },
    [refreshVisibleRooms]
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

  const visibleRooms = useMemo(() => roomThreads, [roomThreads]);
  const searchedRooms = useMemo(() => roomSearchResults, [roomSearchResults]);
  const showHiddenActions = search.trim().length > 0;
  const roomsForDisplay = useMemo(
    () => (showHiddenActions ? searchedRooms : visibleRooms),
    [searchedRooms, showHiddenActions, visibleRooms]
  );
  const roomsLoadingState = roomsLoading || (showHiddenActions && roomsSearchLoading);

  // Directs filter
  const filteredDirects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return directs.filter((d) => !d.hidden);

    const match = (d: Direct) =>
      d.displayName.toLowerCase().includes(q) || (d.last ?? "").toLowerCase().includes(q);

    return directs.filter((d) => !d.hidden && match(d));
  }, [directs, search]);


  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ChatHeader
        tab={tab}
        setTab={setTab}
        search={search}
        setSearch={setSearch}
        unreadDirectCount={unreadDirectCount}
      />

      {tab === "rooms" && (
        <RoomsList
          rooms={roomsForDisplay}
          onSelect={(roomItem) => {
            const baseTitle = roomItem.title?.trim() || roomItem.key;
            const displayTitle =
              typeof roomItem.threadNumber === "number"
                ? `${baseTitle} #${roomItem.threadNumber}`
                : baseTitle;
            router.push({
              pathname: "/(app)/(stack)/room",
              params: {
                room: roomItem.key,
                roomTitle: displayTitle,
                accentColor: chatColor ?? "",
                username: username ?? "",
              },
            });
          }}
          onMakeVisible={handleMakeVisible}
          showHiddenActions={showHiddenActions}
          loading={roomsLoadingState}
          pendingKeys={roomPendingKeys}
        />
      )}

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

    </View>
  );
}
