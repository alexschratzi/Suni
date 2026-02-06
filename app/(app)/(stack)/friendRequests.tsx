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
import { useTranslation } from "react-i18next";
import {
  acceptFriendRequest,
  declineFriendRequest,
} from "@/src/lib/friends";

type ProfileMap = Record<string, { username?: string } | undefined>;

export default function FriendRequestsScreen() {
  const [requests, setRequests] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [snack, setSnack] = useState("");
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const userId = useSupabaseUserId();
  const { t } = useTranslation();

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
      const status = await acceptFriendRequest(userId, otherUid);
      if (status === "alreadyFriends") {
        setSnack(t("friends.snacks.alreadyFriends"));
        return;
      }

      setSnack(t("friends.snacks.added"));
    } catch (err) {
      console.error("Fehler beim Annehmen:", err);
      setSnack(t("friends.errors.accept"));
    }
  };

  const decline = async (otherUid: string) => {
    if (!userId) return;

    try {
      await declineFriendRequest(userId, otherUid);
      setSnack(t("friends.snacks.declined"));
    } catch (err) {
      console.error("Fehler beim Ablehnen:", err);
      setSnack(t("friends.errors.decline"));
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
        {t("friendRequests.title")}
      </Text>
      <Divider />

      {requests.length === 0 && (
        <Text style={{ padding: 16 }}>{t("friendRequests.empty")}</Text>
      )}

      {requests.map((uid) => (
        <List.Item
          key={uid}
          title={displayName(uid)}
          description={t("friendRequests.description")}
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
              <Button onPress={() => accept(uid)}>{t("friends.accept")}</Button>
              <Button onPress={() => decline(uid)} textColor="red">
                {t("friends.decline")}
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
