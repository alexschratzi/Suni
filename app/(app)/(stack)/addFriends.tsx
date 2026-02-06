// app/(app)/(stack)/addFriends.tsx
import React, { useState } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Text, TextInput, Button, useTheme, Snackbar, List } from "react-native-paper";

import { supabase } from "@/src/lib/supabase";
import { useSupabaseUserId } from "@/src/lib/useSupabaseUser";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { useTranslation } from "react-i18next";
import { sendFriendRequest } from "@/src/lib/friends";

export default function AddFriendScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState("");

  const userId = useSupabaseUserId();
  const { t } = useTranslation();

  const searchUser = async () => {
    if (!username.trim()) {
      setSnack(t("friends.snacks.enterUsername"));
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
      setLoading(false);
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

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
        {t("addFriends.title")}
      </Text>

      <TextInput
        mode="outlined"
        label={t("addFriends.label")}
        placeholder={t("addFriends.placeholder")}
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />

      <Button mode="contained" onPress={searchUser} loading={loading}>
        {t("addFriends.searchButton")}
      </Button>

      {result && (
        <List.Section style={styles.listSection}>
          <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>
            {t("addFriends.resultsTitle")}
          </List.Subheader>

          <List.Item
            title={result.username}
            description={t("addFriends.userFound")}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            left={(props) => <List.Icon {...props} icon="account-circle" />}
            right={() => (
              <Button mode="contained" compact icon="account-plus" onPress={() => sendRequest(result.uid)}>
                {t("friends.request")}
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
