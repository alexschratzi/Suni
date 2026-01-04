// app/(app)/(stack)/addFriends.tsx
import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, useTheme, Snackbar, List } from "react-native-paper";

import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";

const pairFor = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

export default function AddFriendScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState("");

  const userId = useSupabaseUserId();

  const searchUser = async () => {
    if (!username.trim()) {
      setSnack("Bitte Username eingeben");
      return;
    }
    if (!userId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select(`${COLUMNS.profiles.id},${COLUMNS.profiles.username}`)
        .eq(COLUMNS.profiles.username, username.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setResult(null);
        setSnack("User nicht gefunden");
      } else {
        setResult({
          uid: (data as any)?.[COLUMNS.profiles.id],
          username: (data as any)?.[COLUMNS.profiles.username],
        });
      }
    } catch (err) {
      console.error("Fehler bei Suche:", err);
      setSnack("Fehler bei der Suche");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (targetUid: string) => {
    if (!userId) return;

    if (targetUid === userId) {
      setSnack("Du kannst dich nicht selbst hinzufuegen");
      return;
    }

    try {
      const [existingFriend, outgoingReq, incomingReq, blockedByOther, blockedByMe] =
        await Promise.all([
          (() => {
            const [a, b] = pairFor(userId, targetUid);
            return supabase
              .from(TABLES.friendships)
              .select("id")
              .eq(COLUMNS.friendships.userId, a)
              .eq(COLUMNS.friendships.friendId, b)
              .maybeSingle();
          })(),
          supabase
            .from(TABLES.friendRequests)
            .select("id")
            .eq(COLUMNS.friendRequests.fromUser, userId)
            .eq(COLUMNS.friendRequests.toUser, targetUid)
            .maybeSingle(),
          supabase
            .from(TABLES.friendRequests)
            .select("id")
            .eq(COLUMNS.friendRequests.fromUser, targetUid)
            .eq(COLUMNS.friendRequests.toUser, userId)
            .maybeSingle(),
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, targetUid)
            .eq(COLUMNS.blocks.blockedId, userId)
            .maybeSingle(),
          supabase
            .from(TABLES.blocks)
            .select("id")
            .eq(COLUMNS.blocks.blockerId, userId)
            .eq(COLUMNS.blocks.blockedId, targetUid)
            .maybeSingle(),
        ]);

      if (blockedByOther.data) {
        setSnack("Du wurdest blockiert");
        return;
      }
      if (blockedByMe.data) {
        setSnack("Du hast diesen Nutzer blockiert");
        return;
      }
      if (existingFriend.data) {
        setSnack("Ihr seid bereits befreundet");
        return;
      }
      if (outgoingReq.data) {
        setSnack("Anfrage bereits gesendet");
        return;
      }
      if (incomingReq.data) {
        setSnack("Dieser Nutzer hat dir bereits geschrieben");
        return;
      }

      const { error } = await supabase.from(TABLES.friendRequests).insert({
        [COLUMNS.friendRequests.fromUser]: userId,
        [COLUMNS.friendRequests.toUser]: targetUid,
      });
      if (error) throw error;

      setSnack("Freundschaftsanfrage gesendet");
    } catch (err) {
      console.error("Fehler beim Senden der Anfrage:", err);
      setSnack("Fehler beim Senden der Anfrage");
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
        Freund hinzufügen
      </Text>

      <TextInput
        mode="outlined"
        label="Benutzername"
        placeholder="z. B. alex"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <Button mode="contained" onPress={searchUser} loading={loading}>
        Suchen
      </Button>

      {result && (
        <List.Section style={styles.listSection}>
          <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
            Suchergebnis
          </List.Subheader>

          <List.Item
            title={result.username}
            description="User gefunden"
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="account-circle" />}
            right={() => (
              <Button mode="contained" compact icon="account-plus" onPress={() => sendRequest(result.uid)}>
                Anfrage
              </Button>
            )}
            onPress={() => sendRequest(result.uid)}
          />
        </List.Section>
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
    minHeight: "100%",
  },
  title: {
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  listSection: {
    marginTop: 20,
  },
});
