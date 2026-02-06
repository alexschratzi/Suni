// app/(app)/(stack)/friends.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Text,
  TextInput,
  Button,
  Divider,
  Snackbar,
  Avatar,
  List,
  Surface,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { initials } from "@/utils/utils";
import { useTranslation } from "react-i18next";
import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { fetchProfilesWithCache, getMemoryProfiles } from "@/src/lib/profileCache";
import {
  acceptFriendRequest,
  blockUser as blockFriend,
  declineFriendRequest,
  sendFriendRequest,
  unblockUser as unblockFriend,
} from "@/src/lib/friends";
import { getOrCreateDmThread } from "@/src/lib/dmThreads";

type ProfileMap = Record<string, { username?: string } | undefined>;
type SearchResult = { username: string; uid: string };

export default function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const userId = useSupabaseUserId();
  const { t } = useTranslation();

  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [snack, setSnack] = useState("");

  const [incoming, setIncoming] = useState<string[]>([]);
  const [outgoing, setOutgoing] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [threadsByFriend, setThreadsByFriend] = useState<Record<string, string>>({});
  const [loadingLists, setLoadingLists] = useState(true);
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [requestsExpanded, setRequestsExpanded] = useState(false);
  const [blockedExpanded, setBlockedExpanded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIncoming([]);
      setOutgoing([]);
      setFriends([]);
      setBlocked([]);
      setThreadsByFriend({});
      setLoadingLists(false);
      return;
    }

    let cancelled = false;

    const loadLists = async () => {
      setLoadingLists(true);
      const [incomingRes, outgoingRes, blockedRes, friendsRes] = await Promise.all([
        supabase
          .from(TABLES.friendRequests)
          .select(COLUMNS.friendRequests.fromUser)
          .eq(COLUMNS.friendRequests.toUser, userId),
        supabase
          .from(TABLES.friendRequests)
          .select(COLUMNS.friendRequests.toUser)
          .eq(COLUMNS.friendRequests.fromUser, userId),
        supabase
          .from(TABLES.blocks)
          .select(COLUMNS.blocks.blockedId)
          .eq(COLUMNS.blocks.blockerId, userId),
        supabase
          .from(TABLES.friendships)
          .select(`${COLUMNS.friendships.userId},${COLUMNS.friendships.friendId}`)
          .or(
            `${COLUMNS.friendships.userId}.eq.${userId},${COLUMNS.friendships.friendId}.eq.${userId}`
          ),
      ]);

      if (incomingRes.error || outgoingRes.error || blockedRes.error || friendsRes.error) {
        console.error(
          "Friends load error:",
          incomingRes.error?.message ||
            outgoingRes.error?.message ||
            blockedRes.error?.message ||
            friendsRes.error?.message
        );
        if (!cancelled) {
          setIncoming([]);
          setOutgoing([]);
          setFriends([]);
          setBlocked([]);
          setLoadingLists(false);
        }
        return;
      }

      if (cancelled) return;

      setIncoming(
        (incomingRes.data || [])
          .map((row: any) => row?.[COLUMNS.friendRequests.fromUser])
          .filter(Boolean)
      );
      setOutgoing(
        (outgoingRes.data || [])
          .map((row: any) => row?.[COLUMNS.friendRequests.toUser])
          .filter(Boolean)
      );
      setBlocked(
        (blockedRes.data || [])
          .map((row: any) => row?.[COLUMNS.blocks.blockedId])
          .filter(Boolean)
      );
      const friendList = (friendsRes.data || [])
        .map((row: any) => {
          const a = row?.[COLUMNS.friendships.userId];
          const b = row?.[COLUMNS.friendships.friendId];
          if (a === userId) return b;
          if (b === userId) return a;
          return null;
        })
        .filter(Boolean);
      setFriends(Array.from(new Set(friendList)));
      setLoadingLists(false);
    };

    loadLists();

    const channel = supabase
      .channel(`friends-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendRequests,
          filter: `${COLUMNS.friendRequests.toUser}=eq.${userId}`,
        },
        loadLists
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendRequests,
          filter: `${COLUMNS.friendRequests.fromUser}=eq.${userId}`,
        },
        loadLists
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.blocks,
          filter: `${COLUMNS.blocks.blockerId}=eq.${userId}`,
        },
        loadLists
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendships,
          filter: `${COLUMNS.friendships.userId}=eq.${userId}`,
        },
        loadLists
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: TABLES.friendships,
          filter: `${COLUMNS.friendships.friendId}=eq.${userId}`,
        },
        loadLists
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const all = [...incoming, ...outgoing, ...blocked, ...friends];
    const missing = Array.from(new Set(all.filter((uid) => !profiles[uid])));
    if (!missing.length) return;

    (async () => {
      const cached = getMemoryProfiles(missing);
      if (Object.keys(cached).length > 0) {
        const entries: Array<[string, { username: string }]> = [];
        Object.entries(cached).forEach(([id, entry]) => {
          if (entry?.username) {
            entries.push([id, { username: entry.username }]);
          }
        });
        if (entries.length > 0) {
          setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        }
      }

      const profilesMap = await fetchProfilesWithCache(missing);
      const entries: Array<[string, { username: string }]> = [];
      Object.entries(profilesMap).forEach(([id, entry]) => {
        if (entry?.username) {
          entries.push([id, { username: entry.username }]);
        }
      });
      if (entries.length > 0) {
        setProfiles((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
  }, [incoming, outgoing, blocked, friends, profiles]);

  const displayName = useMemo(
    () => (uid: string) => profiles[uid]?.username || "...",
    [profiles]
  );
  const requestCount = incoming.length + outgoing.length;

  const ensureDirectThreads = async (friendIds: string[]) => {
    if (!userId || friendIds.length === 0) return {} as Record<string, string>;
    const uniqueFriends = Array.from(new Set(friendIds));

    const columns = [COLUMNS.dmThreads.id, COLUMNS.dmThreads.userIds].join(",");
    const { data, error } = await supabase
      .from(TABLES.dmThreads)
      .select(columns)
      .contains(COLUMNS.dmThreads.userIds, [userId]);

    if (error) {
      console.error("Direct threads load error:", error.message);
      return {} as Record<string, string>;
    }

    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      const ids = row?.[COLUMNS.dmThreads.userIds];
      if (!Array.isArray(ids)) return;
      const otherUid = ids.find((id: string) => id !== userId);
      if (otherUid) {
        map[otherUid] = row?.[COLUMNS.dmThreads.id];
      }
    });

    const missing = uniqueFriends.filter((uid) => !map[uid]);
    if (missing.length === 0) return map;

    const created = await Promise.all(
      missing.map(async (uid) => {
        try {
          const threadId = await getOrCreateDmThread(userId, uid);
          return [uid, threadId] as const;
        } catch (err: any) {
          console.error("Direct threads create error:", err?.message || err);
          return null;
        }
      })
    );

    created.forEach((entry) => {
      if (!entry) return;
      map[entry[0]] = entry[1];
    });

    return map;
  };

  useEffect(() => {
    if (!userId) {
      setThreadsByFriend({});
      return;
    }

    if (friends.length === 0) {
      setThreadsByFriend({});
      return;
    }

    let cancelled = false;

    (async () => {
      const map = await ensureDirectThreads(friends);
      if (!cancelled) setThreadsByFriend(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, friends]);

  const searchUser = async () => {
    if (!userId) {
      setSnack(t("friends.snacks.needLogin"));
      return;
    }

    const value = searchValue.trim();
    if (!value) {
      setSnack(t("friends.snacks.enterUsername"));
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(`${COLUMNS.profiles.id},${COLUMNS.profiles.username}`)
        .eq(COLUMNS.profiles.username, value)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setResult(null);
        setSnack(t("friends.errors.notFound"));
      } else {
        setResult({
          uid: (data as any)?.[COLUMNS.profiles.id],
          username: (data as any)?.[COLUMNS.profiles.username],
        });
      }
    } catch (err) {
      console.error("Fehler bei Suche:", err);
      setSnack(t("friends.errors.search"));
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (targetUid: string) => {
    if (!userId) return;
    if (targetUid === userId) {
      setSnack(t("friends.snacks.self"));
      return;
    }

    try {
      const status = await sendFriendRequest(userId, targetUid);
      if (status === "blockedByOther") {
        setSnack(t("friends.snacks.blockedByOther"));
        return;
      }
      if (status === "blockedByMe") {
        setSnack(t("friends.snacks.youBlocked"));
        return;
      }
      if (status === "alreadyFriends") {
        setSnack(t("friends.snacks.alreadyFriends"));
        return;
      }
      if (status === "pendingSent") {
        setSnack(t("friends.snacks.pendingSent"));
        return;
      }
      if (status === "pendingReceived") {
        setSnack(t("friends.snacks.pendingReceived"));
        return;
      }

      setSnack(t("friends.snacks.sent"));
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack(t("friends.errors.send"));
    }
  };

  const accept = async (otherUid: string) => {
    if (!userId) return;

    try {
      const status = await acceptFriendRequest(userId, otherUid);
      if (status === "alreadyFriends") {
        setSnack(t("friends.snacks.alreadyFriends"));
        return;
      }

      const threadId = await getOrCreateDmThread(userId, otherUid);
      setThreadsByFriend((prev) => ({ ...prev, [otherUid]: threadId }));

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

  const blockUser = async (otherUid: string) => {
    if (!userId) return;

    try {
      await blockFriend(userId, otherUid);
      setSnack(t("friends.snacks.blocked"));
    } catch (err) {
      console.error("Fehler beim Blockieren:", err);
      setSnack(t("friends.errors.block"));
    }
  };

  const unblockUser = async (otherUid: string) => {
    if (!userId) return;
    try {
      await unblockFriend(userId, otherUid);
      setSnack(t("friends.snacks.unblocked"));
    } catch (err) {
      console.error("Fehler beim Entblocken:", err);
      setSnack(t("friends.errors.unblock"));
    }
  };

  if (!userId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text>{t("friends.snacks.needLogin")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* ... UI unchanged ... */}
      <Surface style={styles.card} mode="elevated">
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {t("friends.title")}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("friends.subtitle")}
            </Text>
          </View>
          <Button
            mode="text"
            compact
            icon="account-circle"
            onPress={() => router.push("/(app)/(stack)/profile")}
          >
            {t("profile.title")}
          </Button>
        </View>
      </Surface>

      <Surface style={styles.card} mode="elevated">
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {t("friends.searchLabel")}
        </Text>
        <TextInput
          mode="outlined"
          value={searchValue}
          onChangeText={setSearchValue}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("friends.searchPlaceholder")}
          style={{ marginTop: 8 }}
        />
        <Button
          mode="contained"
          onPress={searchUser}
          loading={searching}
          style={{ marginTop: 10, alignSelf: "flex-start" }}
        >
          {t("friends.searchButton")}
        </Button>

        {result && (
          <>
            <Divider style={{ marginVertical: 12 }} />
            <List.Item
              title={result.username}
              description={t("friends.findUser")}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={(props) => (
                <Avatar.Text
                  {...props}
                  size={40}
                  label={initials(result.username)}
                  color={theme.colors.onPrimary}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
              right={() => (
                <Button
                  mode="contained"
                  compact
                  onPress={() => sendRequest(result.uid)}
                >
                  {t("friends.request")}
                </Button>
              )}
            />
          </>
        )}
      </Surface>

      {loadingLists ? (
        <Surface style={styles.card} mode="elevated">
          <ActivityIndicator />
        </Surface>
      ) : (
        <>
          <Surface style={styles.card} mode="elevated">
            <List.Section>
              <List.Accordion
                title={`${t("friends.listTitle")} (${friends.length})`}
                titleStyle={{ color: theme.colors.onSurface }}
                expanded={friendsExpanded}
                onPress={() => setFriendsExpanded((prev) => !prev)}
                left={(props) => <List.Icon {...props} icon="account-group" />}
              >
                {friends.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    {t("friends.listEmpty")}
                  </Text>
                ) : (
                  friends.map((uid, idx) => {
                    const threadId = threadsByFriend[uid];
                    return (
                      <View key={uid}>
                        <List.Item
                          title={displayName(uid)}
                          titleStyle={{ color: theme.colors.onSurface }}
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
                            <Button
                              compact
                              onPress={() =>
                                threadId &&
                                router.push({
                                  pathname: "/(app)/(stack)/reply",
                                  params: {
                                    dmId: threadId,
                                    otherUid: uid,
                                    otherName: displayName(uid),
                                  },
                                })
                              }
                              disabled={!threadId}
                            >
                              {t("friends.chat")}
                            </Button>
                          )}
                          onPress={() => {
                            if (!threadId) return;
                            router.push({
                              pathname: "/(app)/(stack)/reply",
                              params: {
                                dmId: threadId,
                                otherUid: uid,
                                otherName: displayName(uid),
                              },
                            });
                          }}
                        />
                        {idx < friends.length - 1 && (
                          <Divider style={{ marginLeft: 56 }} />
                        )}
                      </View>
                    );
                  })
                )}
              </List.Accordion>
            </List.Section>
          </Surface>

          <Surface style={styles.card} mode="elevated">
            <List.Section>
              <List.Accordion
                title={`${t("friends.requestsTitle")} (${requestCount})`}
                titleStyle={{ color: theme.colors.onSurface }}
                expanded={requestsExpanded}
                onPress={() => setRequestsExpanded((prev) => !prev)}
                left={(props) => <List.Icon {...props} icon="account-arrow-right-outline" />}
              >
                <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                  {t("friends.incomingTitle")}
                </List.Subheader>
                {incoming.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    {t("friends.incomingEmpty")}
                  </Text>
                ) : (
                  incoming.map((uid, idx) => (
                    <View key={uid}>
                      <List.Item
                        title={displayName(uid)}
                        titleStyle={{ color: theme.colors.onSurface }}
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
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Button onPress={() => accept(uid)}>{t("friends.accept")}</Button>
                            <Button onPress={() => decline(uid)} textColor="red">
                              {t("friends.decline")}
                            </Button>
                            <Button onPress={() => blockUser(uid)}>{t("friends.block")}</Button>
                          </View>
                        )}
                      />
                      {idx < incoming.length - 1 && (
                        <Divider style={{ marginLeft: 56 }} />
                      )}
                    </View>
                  ))
                )}

                <Divider style={{ marginVertical: 6 }} />

                <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
                  {t("friends.outgoingTitle")}
                </List.Subheader>
                {outgoing.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    {t("friends.outgoingEmpty")}
                  </Text>
                ) : (
                  outgoing.map((uid, idx) => (
                    <View key={uid}>
                      <List.Item
                        title={displayName(uid)}
                        description={t("friends.sentLabel")}
                        titleStyle={{ color: theme.colors.onSurface }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
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
                          <Button onPress={() => blockUser(uid)}>{t("friends.block")}</Button>
                        )}
                      />
                      {idx < outgoing.length - 1 && (
                        <Divider style={{ marginLeft: 56 }} />
                      )}
                    </View>
                  ))
                )}
              </List.Accordion>
            </List.Section>
          </Surface>

          <Surface style={styles.card} mode="elevated">
            <List.Section>
              <List.Accordion
                title={`${t("friends.blockedTitle")} (${blocked.length})`}
                titleStyle={{ color: theme.colors.onSurface }}
                expanded={blockedExpanded}
                onPress={() => setBlockedExpanded((prev) => !prev)}
                left={(props) => <List.Icon {...props} icon="account-cancel-outline" />}
              >
                {blocked.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                    {t("friends.blockedEmpty")}
                  </Text>
                ) : (
                  blocked.map((uid, idx) => (
                    <View key={uid}>
                      <List.Item
                        title={displayName(uid)}
                        titleStyle={{ color: theme.colors.onSurface }}
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
                          <Button onPress={() => unblockUser(uid)}>
                            {t("friends.unblock")}
                          </Button>
                        )}
                      />
                      {idx < blocked.length - 1 && (
                        <Divider style={{ marginLeft: 56 }} />
                      )}
                    </View>
                  ))
                )}
              </List.Accordion>
            </List.Section>
          </Surface>
        </>
      )}

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2000}>
        {snack}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyText: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
