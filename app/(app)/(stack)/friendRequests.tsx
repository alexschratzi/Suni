// app/(app)/(stack)/friendRequests.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import {
  Text,
  List,
  Divider,
  Button,
  Snackbar,
  ActivityIndicator,
  Avatar,
  useTheme,
} from "react-native-paper";

import { initials } from "@/utils/utils";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";

type ProfileMap = Record<string, { username?: string } | undefined>;

const pairFor = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [snack, setSnack] = useState("");
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const userId = useSupabaseUserId();

  useEffect(() => {
    if (!userId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadRequests = async () => {
      const { data, error } = await supabase
        .from(TABLES.friendRequests)
        .select(COLUMNS.friendRequests.fromUser)
        .eq(COLUMNS.friendRequests.toUser, userId);

      if (error) {
        console.error("FriendRequests load error:", error.message);
        if (!cancelled) {
          setRequests([]);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setRequests(
        (data || [])
          .map((row: any) => row?.[COLUMNS.friendRequests.fromUser])
          .filter(Boolean)
      );
      setLoading(false);
    };

    loadRequests();

    const channel = supabase
      .channel(`friend-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendRequests,
          filter: `${COLUMNS.friendRequests.toUser}=eq.${userId}`,
        },
        loadRequests
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const missing = Array.from(new Set(requests.filter((uid) => !profiles[uid])));
    if (!missing.length) return;

    (async () => {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(`${COLUMNS.profiles.id},${COLUMNS.profiles.username}`)
        .in(COLUMNS.profiles.id, missing);

      if (error) {
        console.error("FriendRequests profile load error:", error.message);
        return;
      }

      const entries =
        (data || []).map((row: any) => {
          const id = row?.[COLUMNS.profiles.id];
          const username = row?.[COLUMNS.profiles.username];
          return [id, { username }] as const;
        }) || [];

      setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [requests, profiles]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || uid,
    [profiles]
  );

  const accept = async (otherUid: string) => {
    if (!userId) return;

    try {
      const [a, b] = pairFor(userId, otherUid);
      const existing = await supabase
        .from(TABLES.friendships)
        .select("id")
        .eq(COLUMNS.friendships.userId, a)
        .eq(COLUMNS.friendships.friendId, b)
        .maybeSingle();

      if (existing.data) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }

      const { error: insertErr } = await supabase.from(TABLES.friendships).insert({
        [COLUMNS.friendships.userId]: a,
        [COLUMNS.friendships.friendId]: b,
      });
      if (insertErr) throw insertErr;

      const { error: deleteErr } = await supabase
        .from(TABLES.friendRequests)
        .delete()
        .eq(COLUMNS.friendRequests.fromUser, otherUid)
        .eq(COLUMNS.friendRequests.toUser, userId);
      if (deleteErr) throw deleteErr;

      const columns = [COLUMNS.dmThreads.id, COLUMNS.dmThreads.userIds].join(",");

      const { data, error } = await supabase
        .from(TABLES.dmThreads)
        .select(columns)
        .contains(COLUMNS.dmThreads.userIds, [userId]);

      if (!error) {
        const exists = (data || []).some((row: any) => {
          const userIds = row?.[COLUMNS.dmThreads.userIds];
          return Array.isArray(userIds) && userIds.includes(userId) && userIds.includes(otherUid);
        });

        if (!exists) {
          await supabase.from(TABLES.dmThreads).insert({
            [COLUMNS.dmThreads.userIds]: [userId, otherUid],
            [COLUMNS.dmThreads.lastMessage]: "",
            [COLUMNS.dmThreads.lastTimestamp]: null,
            [COLUMNS.dmThreads.hiddenBy]: [],
          });
        }
      }

      setSnack("Freund hinzugef?gt!");
    } catch (err) {
      console.error("Fehler beim Annehmen:", err);
      setSnack("Fehler beim Annehmen");
    }
  };

  const decline = async (otherUid: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from(TABLES.friendRequests)
        .delete()
        .eq(COLUMNS.friendRequests.fromUser, otherUid)
        .eq(COLUMNS.friendRequests.toUser, userId);
      if (error) throw error;

      setSnack("Anfrage abgelehnt");
    } catch (err) {
      console.error("Fehler beim Ablehnen:", err);
      setSnack("Fehler beim Ablehnen");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Text variant="titleLarge" style={{ padding: 16 }}>
        Anfragen
      </Text>
      <Divider />

      {requests.length === 0 && <Text style={{ padding: 16 }}>Keine Anfragen</Text>}

      {requests.map((uid) => (
        <List.Item
          key={uid}
          title={displayName(uid)}
          description="Möchte mit dir befreundet sein"
          left={(props) => (
            <Avatar.Text
              {...props}
              size={40}
              label={initials(displayName(uid))}
              color={theme.colors.onPrimary}
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
          right={() => (
            <View style={{ flexDirection: "row" }}>
              <Button onPress={() => accept(uid)}>Annehmen</Button>
              <Button onPress={() => decline(uid)} textColor="red">
                Ablehnen
              </Button>
            </View>
          )}
        />
      ))}

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")}>
        {snack}
      </Snackbar>
    </View>
  );
}
