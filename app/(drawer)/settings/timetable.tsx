// app/(drawer)/settings/timetable.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
} from "../../../src/server/calendar"; // adjust if you use path aliases

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

  // TODO: replace with real user id once auth is available
  const userId = "1234";

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
  /* On mount: just load from AsyncStorage                                    */
  /* (Timetable screen does the actual sync with server on load)              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const init = async () => {
      try {
        setLoadingSubs(true);
        const localSubs = await loadLocalSubscriptions();
        setSubscriptions(localSubs);
      } catch (e) {
        console.error("Failed to load iCal subscriptions:", e);
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

  const openDialog = () => {
    setError(null);
    setForm({
      name: "",
      url: "",
      color: randomPresetColor(), // random color for each new subscription
    });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogVisible(false);
  };

  const handleSaveSubscription = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError("Name und iCal-URL dürfen nicht leer sein.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // PUSH iCal to server
      await updateICal({
        userId,
        name: form.name.trim(),
        url: form.url.trim(),
        color: form.color,
      });

      // GET_ICAL from server (canonical list)
      const serverSubs = await getICalSubscriptions(userId);

      const mapped: ICalSubscription[] = serverSubs.map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
      }));

      setSubscriptions(mapped);
      await saveLocalSubscriptions(mapped);

      setDialogVisible(false);
    } catch (e) {
      console.error(e);
      setError("Speichern fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubscription = async (id: string) => {
    // For now: only local removal. Add a delete API later if needed.
    const next = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(next);
    await saveLocalSubscriptions(next);
  };

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      <Surface
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        elevation={0}
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
        <Surface
          style={{ borderRadius: 12, overflow: "hidden", marginBottom: 16 }}
          elevation={1}
        >
          <List.Section>
            <List.Subheader>Navigation</List.Subheader>

            <List.Item
              title="Zu heute springen"
              description="Kalender auf den aktuellen Tag / die aktuelle Woche zurücksetzen"
              left={(props) => <List.Icon {...props} icon="calendar-today" />}
              onPress={() =>
                router.push({
                  pathname: "/(drawer)/(tabs)/timetable",
                  params: { jumpToToday: "1" },
                })
              }
            />
          </List.Section>
        </Surface>

        {/* iCal subscriptions section */}
        <Surface style={{ borderRadius: 12, overflow: "hidden" }} elevation={1}>
          <List.Section>
            <List.Subheader>iCal-Abonnements</List.Subheader>

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

            {subscriptions.map((sub) => (
              <List.Item
                key={sub.id}
                title={sub.name}
                description={sub.url}
                left={() => (
                  <View style={styles.colorDotContainer}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: sub.color || theme.colors.primary },
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
              onPress={openDialog}
            />
          </List.Section>
        </Surface>
      </Surface>

      {/* Dialog for new iCal subscription */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>Neue iCal-Verknüpfung</Dialog.Title>
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
            />

            {/* Paper-optimized color row: just "Farbe" + dot on the right */}
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
              style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}
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
    flexGrow: 1,
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
