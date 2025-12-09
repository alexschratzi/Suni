// app/(drawer)/settings/timetable.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import {
  ActivityIndicator,
  Dialog,
  IconButton,
  List,
  Portal,
  Surface,
  Text,
  TextInput,
  Button,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  updateICal,
  getICalSubscriptions,
  deleteICalSubscription,
} from "@/src/server/calendar";
import { notifyICalChanged } from "@/src/utils/calendarSyncEvents";

type ICalSubscription = {
  id: string;
  name: string;
  url: string;
  color: string;
};

const ICAL_ASYNC_KEY = "ical_subscriptions_v1";

const COLOR_PRESETS = [
  "#F44336",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#2196F3",
  "#03A9F4",
  "#00BCD4",
  "#009688",
  "#4CAF50",
  "#8BC34A",
  "#CDDC39",
  "#FFC107",
  "#FF9800",
  "#FF5722",
  "#795548",
  "#607D8B",
];

/**
 * Try to fetch the iCal URL and check if it looks like an actual ICS file.
 * Returns true if:
 *  - response is OK (2xx)
 *  - body contains "BEGIN:VCALENDAR"
 */
async function validateIcalUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return false;
    }

    const text = await res.text();
    return !(!text || !text.includes("BEGIN:VCALENDAR"));


  } catch (e) {
    console.warn("Failed to validate iCal URL", e);
    return false;
  }
}

export default function TimetableSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<ICalSubscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    url: "",
    color: "#2196F3",
  });

  const [editingSub, setEditingSub] = useState<ICalSubscription | null>(null);
  const isEditing = !!editingSub;

  const userId = "1234"; // TODO: real auth

  /* ------------------------------------------------------------------------ */
  /* Local storage helpers                                                    */
  /* ------------------------------------------------------------------------ */

  const loadLocalSubscriptions = async (): Promise<ICalSubscription[]> => {
    try {
      const raw = await AsyncStorage.getItem(ICAL_ASYNC_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to load local iCal subs:", e);
      return [];
    }
  };

  const saveLocalSubscriptions = async (subs: ICalSubscription[]) => {
    try {
      await AsyncStorage.setItem(ICAL_ASYNC_KEY, JSON.stringify(subs));
    } catch (e) {
      console.warn("Failed to save local iCal subs:", e);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* On mount: prefer server, fallback to local cache                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingSubs(true);

        try {
          const serverSubs = await getICalSubscriptions(userId);
          const mapped: ICalSubscription[] = serverSubs.map((s) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            color: s.color,
          }));
          setSubscriptions(mapped);
          await saveLocalSubscriptions(mapped);
        } catch (serverError) {
          console.warn(
            "Failed to load iCal subscriptions from server:",
            serverError,
          );
          const localSubs = await loadLocalSubscriptions();
          setSubscriptions(localSubs);
        }
      } finally {
        setLoadingSubs(false);
      }
    };

    init();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Dialog + color picker handling                                           */
  /* ------------------------------------------------------------------------ */

  const randomPresetColor = () =>
    COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];

  const openCreateDialog = () => {
    setError(null);
    setEditingSub(null);
    setForm({
      name: "",
      url: "",
      color: randomPresetColor(),
    });
    setDialogVisible(true);
  };

  const openEditDialog = (sub: ICalSubscription) => {
    setError(null);
    setEditingSub(sub);
    setForm({
      name: sub.name,
      url: sub.url,
      color: sub.color || "#2196F3",
    });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogVisible(false);
    setEditingSub(null);
    setError(null);
  };

  const handleSaveSubscription = async () => {
    const trimmedName = form.name.trim();
    const trimmedUrl = form.url.trim();

    if (!trimmedName) {
      setError("Name darf nicht leer sein.");
      return;
    }
    if (!isEditing && !trimmedUrl) {
      setError("Name und iCal-URL dürfen nicht leer sein.");
      return;
    }

    const lowerName = trimmedName.toLowerCase();

    const hasNameConflict = subscriptions.some((s) => {
      if (isEditing && editingSub && s.id === editingSub.id) return false;
      return s.name.trim().toLowerCase() === lowerName;
    });

    if (hasNameConflict) {
      setError(
        "Es existiert bereits ein iCal-Abonnement mit diesem Namen. Bitte wähle einen eindeutigen Namen.",
      );
      return;
    }

    if (!isEditing) {
      const lowerUrl = trimmedUrl.toLowerCase();
      const hasUrlConflict = subscriptions.some(
        (s) => s.url.trim().toLowerCase() === lowerUrl,
      );

      if (hasUrlConflict) {
        setError(
          "Es existiert bereits ein iCal-Abonnement mit dieser iCal-URL. Bitte verwende einen eindeutigen Link.",
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);

      let urlToUse = trimmedUrl;

      if (!isEditing) {
        const valid = await validateIcalUrl(trimmedUrl);
        if (!valid) {
          setError(
            "Die iCal-URL konnte nicht erreicht werden oder ist ungültig. Bitte überprüfe den Link.",
          );
          return;
        }
      } else if (editingSub) {
        urlToUse = editingSub.url;
      }

      await updateICal({
        userId,
        name: trimmedName,
        url: urlToUse,
        color: form.color,
      });

      const serverSubs = await getICalSubscriptions(userId);

      const mapped: ICalSubscription[] = serverSubs.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
      }));

      setSubscriptions(mapped);
      await saveLocalSubscriptions(mapped);

      // tell timetable to reload now
      notifyICalChanged();

      setDialogVisible(false);
      setEditingSub(null);
    } catch (e) {
      console.error(e);
      setError("Speichern fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubscription = async (id: string) => {
    try {
      await deleteICalSubscription(userId, id);

      const serverSubs = await getICalSubscriptions(userId);
      const mapped: ICalSubscription[] = serverSubs.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
      }));

      setSubscriptions(mapped);
      await saveLocalSubscriptions(mapped);

      // tell timetable to reload now
      notifyICalChanged();
    } catch (e) {
      console.error("Failed to delete iCal subscription:", e);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.container}
      >
        <Text variant="titleLarge" style={styles.title}>
          Stundenplan-Einstellungen
        </Text>

        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
        >
          Hier können spezifische Einstellungen für den Stundenplan vorgenommen
          werden.
        </Text>

        {/* Navigation section */}
        <Surface style={{ borderRadius: 12, marginBottom: 16 }} elevation={1}>
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <List.Section>
              <List.Subheader>Navigation</List.Subheader>

              <List.Item
                title="Zu heute springen"
                description="Kalender auf den aktuellen Tag / die aktuelle Woche zurücksetzen"
                left={(props) => (
                  <List.Icon {...props} icon="calendar-today" />
                )}
                onPress={() =>
                  router.push({
                    pathname: "/(drawer)/(tabs)/timetable",
                    params: { jumpToToday: "1" },
                  })
                }
              />
            </List.Section>
          </View>
        </Surface>

        {/* iCal subscriptions section */}
        <Surface style={{ borderRadius: 12 }} elevation={1}>
          <View style={{ borderRadius: 12, overflow: "hidden" }}>
            <List.Section>
              <List.Subheader>iCal-Abonnements</List.Subheader>

              {loadingSubs && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" />
                  <Text
                    variant="bodySmall"
                    style={{
                      marginLeft: 8,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    Lädt iCal-Abonnements...
                  </Text>
                </View>
              )}

              {subscriptions.map((sub) => (
                <List.Item
                  key={sub.id}
                  title={sub.name}
                  description={sub.url}
                  onPress={() => openEditDialog(sub)}
                  left={() => (
                    <View style={styles.colorDotContainer}>
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor:
                              sub.color || theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  )}
                  right={() => (
                    <IconButton
                      icon="delete"
                      onPress={() => handleRemoveSubscription(sub.id)}
                    />
                  )}
                />
              ))}

              <List.Item
                title="Neue iCal-Verknüpfung"
                description="iCal-Link, Name und Farbe hinzufügen"
                left={(props) => <List.Icon {...props} icon="plus" />}
                onPress={openCreateDialog}
              />
            </List.Section>
          </View>
        </Surface>
      </ScrollView>

      {/* Dialogs */}
      <Portal>
        {/* Create / Edit iCal dialog */}
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>
            {isEditing ? "iCal-Verknüpfung bearbeiten" : "Neue iCal-Verknüpfung"}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name"
              value={form.name}
              onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
              style={{ marginBottom: 8 }}
            />
            <TextInput
              label="iCal-URL"
              value={form.url}
              onChangeText={(text) => setForm((f) => ({ ...f, url: text }))}
              style={{ marginBottom: 8 }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isEditing}
              disabled={isEditing}
            />

            {/* Color selection row */}
            <List.Item
              title="Farbe"
              onPress={() => setColorPickerVisible(true)}
              right={() => (
                <View style={styles.colorRowRight}>
                  <View
                    style={[
                      styles.colorPreviewCircle,
                      { backgroundColor: form.color },
                    ]}
                  />
                  <IconButton icon="chevron-right" size={20} />
                </View>
              )}
            />

            {error && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error, marginTop: 4 }}
              >
                {error}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog} disabled={saving}>
              Abbrechen
            </Button>
            <Button onPress={handleSaveSubscription} loading={saving}>
              Speichern
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Color picker dialog */}
        <Dialog
          visible={colorPickerVisible}
          onDismiss={() => setColorPickerVisible(false)}
        >
          <Dialog.Title>Farbe auswählen</Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodySmall"
              style={{
                marginBottom: 8,
                color: theme.colors.onSurfaceVariant,
              }}
            >
              Tippe auf eine Farbe, um sie zu übernehmen.
            </Text>

            <View style={styles.colorGrid}>
              {COLOR_PRESETS.map((c) => {
                const isSelected =
                  c.toLowerCase() === form.color.toLowerCase();
                return (
                  <TouchableRipple
                    key={c}
                    style={styles.colorGridItem}
                    borderless
                    onPress={() => {
                      setForm((f) => ({ ...f, color: c }));
                      setColorPickerVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.colorGridCircle,
                        {
                          backgroundColor: c,
                          borderWidth: isSelected ? 3 : 1,
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.outlineVariant,
                        },
                      ]}
                    />
                  </TouchableRipple>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setColorPickerVisible(false)}>
              Schließen
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  colorRowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorPreviewCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 4,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  colorGridItem: {
    width: "20%",
    alignItems: "center",
    marginVertical: 6,
  },
  colorGridCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});
