import React, { useEffect, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  IconButton,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { supabase } from "../../../src/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  role: string | null;
};

export default function ProfileScreen() {
  const theme = useTheme();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [loading, setLoading] = useState(true);

  const [editVisible, setEditVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userRes.user;
      if (!user) {
        setEmail(null);
        setProfile(null);
        return;
      }

      setEmail(user.email ?? null);

      // Load profile from DB
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) throw profErr;

      // If profile doesn't exist yet, create a minimal one (safe fallback)
      if (!prof) {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          username: null,
          role: "student",
        });

        if (insErr) throw insErr;

        setProfile({ id: user.id, username: null, role: "student" });
      } else {
        setProfile(prof as ProfileRow);
      }
    } catch (err: any) {
      console.log("Profil laden fehlgeschlagen:", err);
      Alert.alert("Fehler", err?.message ?? String(err));
      setEmail(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    // Optional: keep UI in sync if auth state changes while this screen is open
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateUsername = async () => {
    try {
      const clean = newUsername.trim();

      if (!clean) {
        Alert.alert("Fehler", "Bitte gib einen Benutzernamen ein.");
        return;
      }

      if (!profile) {
        Alert.alert("Fehler", "Nicht eingeloggt.");
        return;
      }

      // Update username directly on profiles.
      // Best practice: enforce uniqueness in DB via UNIQUE constraint/index on profiles.username.
      const { data, error } = await supabase
        .from("profiles")
        .update({ username: clean })
        .eq("id", profile.id)
        .select("id, username, role")
        .single();

      if (error) {
        // If you have a UNIQUE constraint, Postgres returns a constraint violation.
        // Message differs by driver; keep it robust:
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          Alert.alert("Fehler", "Benutzername ist schon vergeben!");
          return;
        }
        throw error;
      }

      setProfile(data as ProfileRow);
      setEditVisible(false);
      setNewUsername("");
      Alert.alert("✅ Erfolg", "Benutzername erfolgreich geändert!");
    } catch (err: any) {
      Alert.alert("Fehler", err?.message ?? String(err));
    }
  };

  if (loading) {
    return (
      <Surface style={styles.center}>
        <ActivityIndicator animating size="large" />
        <Text style={{ marginTop: 8 }}>Profil wird geladen...</Text>
      </Surface>
    );
  }

  if (!profile) {
    return (
      <Surface style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color={theme.colors.error} />
        <Text variant="titleMedium" style={{ marginTop: 10 }}>
          Nicht eingeloggt
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      {/* Profilkopf */}
      <Surface style={styles.header}>
        <Ionicons name="person-circle-outline" size={120} color={theme.colors.primary} />
        <Text variant="headlineSmall" style={{ marginTop: 12 }}>
          Mein Profil
        </Text>
      </Surface>

      {/* E-Mail (replaces phone) */}
      <Card style={styles.card}>
        <Card.Title
          title="E-Mail"
          left={() => (
            <Ionicons
              name="mail-outline"
              size={22}
              color={theme.colors.onSurface}
              style={{ marginLeft: 8 }}
            />
          )}
        />
        <Card.Content>
          <Text variant="bodyLarge">{email ?? "—"}</Text>
        </Card.Content>
      </Card>

      {/* Benutzername */}
      <Card style={styles.card}>
        <Card.Title
          title="Benutzername"
          left={() => (
            <Ionicons
              name="person-outline"
              size={22}
              color={theme.colors.onSurface}
              style={{ marginLeft: 8 }}
            />
          )}
          right={() => (
            <IconButton
              accessibilityLabel="Benutzernamen bearbeiten"
              onPress={() => {
                setNewUsername(profile.username ?? "");
                setEditVisible(true);
              }}
              icon={() => <Ionicons name="pencil" size={20} color={theme.colors.primary} />}
            />
          )}
        />
        <Card.Content>
          <Text variant="bodyLarge">{profile.username ?? "—"}</Text>
        </Card.Content>
      </Card>

      {/* Rolle */}
      <Card style={styles.card}>
        <Card.Title
          title="Rolle"
          left={() => (
            <Ionicons
              name="key-outline"
              size={22}
              color={theme.colors.onSurface}
              style={{ marginLeft: 8 }}
            />
          )}
        />
        <Card.Content>
          <Text variant="bodyLarge">{profile.role ?? "—"}</Text>
        </Card.Content>
      </Card>

      {/* Dialog: Benutzernamen ändern */}
      <Portal>
        <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)}>
          <Dialog.Title>Benutzernamen ändern</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Neuer Benutzername"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditVisible(false)}>Abbrechen</Button>
            <Button mode="contained" onPress={handleUpdateUsername}>
              Speichern
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 8 },
  card: { width: "100%" },
});
