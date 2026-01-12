// app/(app)/(stack)/settings/timetable.tsx
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import {
  ActivityIndicator,
  IconButton,
  List,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getICalSubscriptions, deleteICalSubscription } from "@/src/server/calendar";
import { notifyICalChanged } from "@/src/utils/calendarSyncEvents";
import { loadLockedCourseIcalSubscriptionIds } from "@/src/timetable/utils/storage";

import type { EntryDisplayType } from "@/types/timetable";
import { ICalSubscriptionEditorDialog } from "@/components/timetable/ICalSubscriptionEditorDialog";

type ICalSubscriptionRow = {
  id: string;
  name: string;
  url: string;
  color: string;
  defaultDisplayType: EntryDisplayType; // "none" | "course" | "event"
};

const ICAL_ASYNC_KEY = "ical_subscriptions_v1";

function normalizeDisplayType(v: any): EntryDisplayType {
  return v === "none" || v === "course" || v === "event" ? v : "none";
}

export default function TimetableSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const userId = "1234"; // TODO: real auth

  const [subscriptions, setSubscriptions] = useState<ICalSubscriptionRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  // ✅ NEW: locked course subscriptions
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<ICalSubscriptionRow | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Local cache helpers                                                      */
  /* ------------------------------------------------------------------------ */

  const loadLocalSubscriptions = async (): Promise<ICalSubscriptionRow[]> => {
    try {
      const raw = await AsyncStorage.getItem(ICAL_ASYNC_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as any[];
      return (parsed ?? []).map((s) => ({
        id: String(s.id),
        name: String(s.name ?? ""),
        url: String(s.url ?? ""),
        color: String(s.color ?? "#2196F3"),
        defaultDisplayType: normalizeDisplayType(s.defaultDisplayType),
      }));
    } catch (e) {
      console.warn("Failed to load local iCal subs:", e);
      return [];
    }
  };

  const saveLocalSubscriptions = async (subs: ICalSubscriptionRow[]) => {
    try {
      await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(subs));
    } catch (e) {
      console.warn("Failed to save local iCal subs:", e);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Locked course calendars                                                   */
  /* ------------------------------------------------------------------------ */

  const refreshLocked = async () => {
    const ids = await loadLockedCourseIcalSubscriptionIds();
    setLockedIds(ids);
  };

  /* ------------------------------------------------------------------------ */
  /* Fetch subs (server first, fallback local)                                 */
  /* ------------------------------------------------------------------------ */

  const refreshSubs = async () => {
    try {
      setLoadingSubs(true);
      await refreshLocked();

      try {
        const serverSubs = await getICalSubscriptions(userId);
        const mapped: ICalSubscriptionRow[] = (serverSubs as any[]).map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          color: s.color,
          // server uses default_display_type; store locally as defaultDisplayType
          defaultDisplayType: normalizeDisplayType(s.default_display_type),
        }));
        setSubscriptions(mapped);
        await saveLocalSubscriptions(mapped);
      } catch (serverError) {
        console.warn("Failed to load iCal subscriptions from server:", serverError);
        const localSubs = await loadLocalSubscriptions();
        setSubscriptions(localSubs);
      }
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    refreshSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------------ */
  /* UI actions                                                                */
  /* ------------------------------------------------------------------------ */

  const openCreateDialog = () => {
    setEditingSub(null);
    setEditorVisible(true);
  };

  const openEditDialog = (sub: ICalSubscriptionRow) => {
    // ✅ NEW: locked subs can't be edited
    if (lockedIds.has(sub.id)) return;

    setEditingSub(sub);
    setEditorVisible(true);
  };

  const closeEditor = () => {
    setEditorVisible(false);
    setEditingSub(null);
  };

  const handleRemoveSubscription = async (id: string) => {
    // ✅ NEW: locked subs can't be deleted via UI
    if (lockedIds.has(id)) return;

    try {
      await deleteICalSubscription(userId, id);
      await refreshSubs();
      notifyICalChanged();
    } catch (e) {
      console.error("Failed to delete iCal subscription:", e);
    }
  };

  const rows = useMemo(
    () => subscriptions.map((sub) => ({ sub, isLocked: lockedIds.has(sub.id) })),
    [subscriptions, lockedIds],
  );

  /* ------------------------------------------------------------------------ */
  /* Render                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleLarge" style={styles.title}>
          Kalender verwalten
        </Text>

        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
        >
          Hier können andere Kalender abboniert werden. Hinzugefügt Kalender synchronisieren sich automatisch.
        </Text>

        {/* iCal subscriptions */}
        <Surface style={{ borderRadius: 12 }} elevation={1}>
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <List.Section>
              <List.Subheader>Meine Kalender</List.Subheader>

              {loadingSubs && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" />
                  <Text
                    variant="bodySmall"
                    style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}
                  >
                    Lädt iCal-Abonnements...
                  </Text>
                </View>
              )}

              {rows.map(({ sub, isLocked }) => {
                const muted = theme.colors.onSurfaceVariant;

                return (
                  <List.Item
                    key={sub.id}
                    title={sub.name}
                    description={sub.url}
                    onPress={() => openEditDialog(sub)}
                    disabled={isLocked}
                    titleStyle={isLocked ? { color: muted } : undefined}
                    descriptionStyle={isLocked ? { color: muted } : undefined}
                    left={() => (
                      <View style={styles.colorDotContainer}>
                        <View
                          style={[
                            styles.colorDot,
                            {
                              backgroundColor: sub.color || theme.colors.primary,
                              opacity: isLocked ? 0.35 : 1,
                            },
                          ]}
                        />
                      </View>
                    )}
                    right={() =>
                      isLocked ? (
                        <IconButton icon="lock" disabled />
                      ) : (
                        <IconButton
                          icon="delete"
                          onPress={() => handleRemoveSubscription(sub.id)}
                        />
                      )
                    }
                  />
                );
              })}

              <List.Item
                title="Neuen Kalender hinzufügen"
                description="Kalender per iCal-Link, Google, Apple oder Outlook hinzufügen"
                left={(props) => <List.Icon {...props} icon="plus" />}
                onPress={openCreateDialog}
              />
            </List.Section>
          </View>
        </Surface>
      </ScrollView>

      <ICalSubscriptionEditorDialog
        userId={userId}
        visible={editorVisible}
        editingSub={editingSub}
        existingSubs={subscriptions}
        onClose={closeEditor}
        onSaved={(nextSubs) => {
          setSubscriptions(nextSubs);
          void saveLocalSubscriptions(nextSubs);
          notifyICalChanged();
          void refreshLocked(); // keep lock state synced
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  colorDotContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
