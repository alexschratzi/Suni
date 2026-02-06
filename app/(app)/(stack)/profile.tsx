import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Avatar,
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
import { initials } from "@/utils/utils";
import {
  AVATAR_BUCKET,
  createAvatarUrl,
  pickAvatar,
  uploadAvatar,
} from "@/src/lib/avatars";
import {
  fetchProfilesWithCache,
  getMemoryProfiles,
  upsertProfilesCache,
} from "@/src/lib/profileCache";
import { useTranslation } from "react-i18next";

type ProfileRow = {
  id: string;
  username: string | null;
  role: string | null;
  avatarPath: string | null;
};

export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const mapProfileRow = (row: any): ProfileRow => ({
    id: row?.id,
    username: row?.username ?? null,
    role: row?.role ?? null,
    avatarPath: row?.avatar_path ?? null,
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const user = sessionRes.session?.user;
      if (!user) {
        setEmail(null);
        setProfile(null);
        return;
      }

      setEmail(user.email ?? null);

      const cached = getMemoryProfiles([user.id])[user.id];
      if (cached && !profile) {
        setProfile({
          id: user.id,
          username: cached.username ?? null,
          role: cached.role ?? null,
          avatarPath: cached.avatarPath ?? null,
        });
        setLoading(false);
      }

      // Load profile from DB
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username, role, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) throw profErr;

      // If profile doesn't exist yet, create a minimal one (safe fallback)
      if (!prof) {
        const { error: insErr } = await supabase.from("profiles").insert({
          id: user.id,
          username: null,
          role: "student",
          avatar_path: null,
        });

        if (insErr) throw insErr;

        const freshProfile = {
          id: user.id,
          username: null,
          role: "student",
          avatarPath: null,
        };
        setProfile(freshProfile);
        await upsertProfilesCache([freshProfile]);
      } else {
        const mapped = mapProfileRow(prof);
        setProfile(mapped);
        await upsertProfilesCache([mapped]);
      }
    } catch (err: any) {
      console.log("Profil laden fehlgeschlagen:", err);
      Alert.alert(t("common.error"), err?.message ?? t("profile.errors.loadFailed"));
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

  useEffect(() => {
    let active = true;
    const profileId = profile?.id;
    const path = profile?.avatarPath;
    if (!path || !profileId) {
      setAvatarUrl(null);
      return;
    }

    const cached = getMemoryProfiles([profileId])[profileId];
    if (cached?.avatarUrl && cached.avatarPath === path) {
      setAvatarUrl(cached.avatarUrl);
    }

    (async () => {
      const profiles = await fetchProfilesWithCache([profileId]);
      if (!active) return;
      setAvatarUrl(profiles[profileId]?.avatarUrl ?? null);
    })();

    return () => {
      active = false;
    };
  }, [profile?.avatarPath, profile?.id]);

  const handleUpdateUsername = async () => {
    try {
      const clean = newUsername.trim();

      if (!clean) {
        Alert.alert(t("common.error"), t("profile.errors.enterUsername"));
        return;
      }

      if (!profile) {
        Alert.alert(t("common.error"), t("profile.errors.needLogin"));
        return;
      }

      // Update username directly on profiles.
      // Best practice: enforce uniqueness in DB via UNIQUE constraint/index on profiles.username.
      const { data, error } = await supabase
        .from("profiles")
        .update({ username: clean })
        .eq("id", profile.id)
        .select("id, username, role, avatar_path")
        .single();

      if (error) {
        // If you have a UNIQUE constraint, Postgres returns a constraint violation.
        // Message differs by driver; keep it robust:
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          Alert.alert(t("common.error"), t("profile.errors.usernameTaken"));
          return;
        }
        throw error;
      }

      setProfile(mapProfileRow(data));
      setEditVisible(false);
      setNewUsername("");
      Alert.alert(t("profile.successTitle"), t("profile.successUsername"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message ?? String(err));
    }
  };

  const handlePickAvatar = async () => {
    if (!profile) {
      Alert.alert(t("common.error"), t("profile.errors.needLogin"));
      return;
    }

    const picked = await pickAvatar();
    if (!picked) return;

    setAvatarBusy(true);
    try {
      const uploaded = await uploadAvatar(picked, profile.id);
      const previousPath = profile.avatarPath;

      const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_path: uploaded.path })
        .eq("id", profile.id)
        .select("id, username, role, avatar_path")
        .single();

      if (error) throw error;

      setProfile(mapProfileRow(data));
      const nextUrl = await createAvatarUrl(uploaded.path);
      if (nextUrl) setAvatarUrl(nextUrl);
      await upsertProfilesCache([
        {
          id: profile.id,
          username: (data as any)?.username ?? profile.username ?? null,
          role: (data as any)?.role ?? profile.role ?? null,
          avatarPath: uploaded.path,
          avatarUrl: nextUrl ?? null,
        },
      ]);

      if (previousPath && previousPath !== uploaded.path) {
        const { error: removeErr } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([previousPath]);
        if (removeErr) {
          console.warn("Avatar cleanup failed:", removeErr.message);
        }
      }
    } catch (err: any) {
      Alert.alert(t("common.error"), err?.message ?? String(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading) {
    return (
      <Surface style={styles.center}>
        <ActivityIndicator animating size="large" />
        <Text style={{ marginTop: 8 }}>{t("profile.loading")}</Text>
      </Surface>
    );
  }

  if (!profile) {
    return (
      <Surface style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color={theme.colors.error} />
        <Text variant="titleMedium" style={{ marginTop: 10 }}>
          {t("profile.notLoggedIn")}
        </Text>
      </Surface>
    );
  }

  return (
    <Surface style={styles.container}>
      {/* Profilkopf */}
      <Surface style={styles.header}>
        <TouchableOpacity
          onPress={handlePickAvatar}
          disabled={avatarBusy}
          activeOpacity={0.8}
          style={styles.avatarButton}
        >
          {avatarUrl ? (
            <Avatar.Image size={120} source={{ uri: avatarUrl }} />
          ) : (
            <Avatar.Text
              size={120}
              label={initials(profile.username ?? "") || "?"}
              color={theme.colors.onPrimary}
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
          <View
            style={[
              styles.avatarBadge,
              {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.background,
              },
            ]}
          >
            <Ionicons name="camera" size={16} color={theme.colors.onPrimary} />
          </View>
        </TouchableOpacity>
        <Text variant="headlineSmall" style={{ marginTop: 12 }}>
          {t("profile.headerTitle")}
        </Text>
        {avatarBusy && <ActivityIndicator style={{ marginTop: 8 }} />}
        <Button
          mode="outlined"
          compact
          style={{ marginTop: 8 }}
          onPress={handlePickAvatar}
          disabled={avatarBusy}
        >
          {t("profile.changeAvatar")}
        </Button>
      </Surface>

      {/* E-Mail (replaces phone) */}
      <Card style={styles.card}>
        <Card.Title
          title={t("profile.email")}
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
          <Text variant="bodyLarge">{email ?? t("common.emptyValue")}</Text>
        </Card.Content>
      </Card>

      {/* Benutzername */}
      <Card style={styles.card}>
        <Card.Title
          title={t("profile.username")}
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
              accessibilityLabel={t("profile.editUsernameAccessibility")}
              onPress={() => {
                setNewUsername(profile.username ?? "");
                setEditVisible(true);
              }}
              icon={() => <Ionicons name="pencil" size={20} color={theme.colors.primary} />}
            />
          )}
        />
        <Card.Content>
          <Text variant="bodyLarge">
            {profile.username ?? t("common.emptyValue")}
          </Text>
        </Card.Content>
      </Card>

      {/* Rolle */}
      <Card style={styles.card}>
        <Card.Title
          title={t("profile.role")}
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
          <Text variant="bodyLarge">{profile.role ?? t("common.emptyValue")}</Text>
        </Card.Content>
      </Card>

      {/* Dialog: Benutzernamen ändern */}
      <Portal>
        <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)}>
          <Dialog.Title>{t("profile.editUsernameTitle")}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label={t("profile.editUsernameLabel")}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditVisible(false)}>
              {t("common.cancel")}
            </Button>
            <Button mode="contained" onPress={handleUpdateUsername}>
              {t("common.save")}
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
  avatarButton: { alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  card: { width: "100%" },
});
