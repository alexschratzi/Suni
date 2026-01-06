// components/timetable/ICalSubscriptionEditorDialog.tsx
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  IconButton,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import type { EntryDisplayType } from "@/types/timetable";
import { updateICal, getICalSubscriptions } from "@/src/server/calendar";

type ICalSubscriptionRow = {
  id: string;
  name: string;
  url: string;
  color: string;
  defaultDisplayType: EntryDisplayType;
};

type Props = {
  userId: string;
  visible: boolean;

  editingSub: ICalSubscriptionRow | null;
  existingSubs: ICalSubscriptionRow[];

  onClose: () => void;
  onSaved: (subs: ICalSubscriptionRow[]) => void;
};

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

function randomPresetColor() {
  return COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
}

function normalizeDisplayType(v: any): EntryDisplayType {
  return v === "none" || v === "course" || v === "event" ? v : "none";
}

/**
 * Try to fetch the iCal URL and check if it looks like an actual ICS file.
 * Returns true if:
 *  - response is OK (2xx)
 *  - body contains "BEGIN:VCALENDAR"
 */
async function validateIcalUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const text = await res.text();
    return !!text && text.includes("BEGIN:VCALENDAR");
  } catch (e) {
    console.warn("Failed to validate iCal URL", e);
    return false;
  }
}

export function ICalSubscriptionEditorDialog(props: Props) {
  const { userId, visible, editingSub, existingSubs, onClose, onSaved } = props;

  const theme = useTheme();
  const isEditing = !!editingSub;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    url: string;
    color: string;
    defaultDisplayType: EntryDisplayType; // 3 options only (Keine = "none")
  }>({
    name: "",
    url: "",
    color: "#2196F3",
    defaultDisplayType: "none",
  });

  // Initialize form when opening / switching editing target
  React.useEffect(() => {
    if (!visible) return;

    setError(null);
    setSaving(false);

    if (editingSub) {
      setForm({
        name: editingSub.name ?? "",
        url: editingSub.url ?? "",
        color: editingSub.color ?? "#2196F3",
        defaultDisplayType: normalizeDisplayType(editingSub.defaultDisplayType),
      });
    } else {
      setForm({
        name: "",
        url: "",
        color: randomPresetColor(),
        defaultDisplayType: "none",
      });
    }
  }, [visible, editingSub]);

  const typeButtons = useMemo(
    () => [
      { value: "none", label: "Keine" },
      { value: "course", label: "Course" },
      { value: "event", label: "Event" },
    ],
    [],
  );

  const close = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
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

    // name conflict
    const lowerName = trimmedName.toLowerCase();
    const hasNameConflict = existingSubs.some((s) => {
      if (isEditing && editingSub && s.id === editingSub.id) return false;
      return s.name.trim().toLowerCase() === lowerName;
    });

    if (hasNameConflict) {
      setError("Es existiert bereits ein iCal-Abonnement mit diesem Namen. Bitte wähle einen eindeutigen Namen.");
      return;
    }

    // url conflict only on create
    if (!isEditing) {
      const lowerUrl = trimmedUrl.toLowerCase();
      const hasUrlConflict = existingSubs.some(
        (s) => s.url.trim().toLowerCase() === lowerUrl,
      );
      if (hasUrlConflict) {
        setError("Es existiert bereits ein iCal-Abonnement mit dieser iCal-URL. Bitte verwende einen eindeutigen Link.");
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
          setError("Die iCal-URL konnte nicht erreicht werden oder ist ungültig. Bitte überprüfe den Link.");
          return;
        }
      } else if (editingSub) {
        // URL is immutable during edit
        urlToUse = editingSub.url;
      }

      await updateICal({
        userId,
        name: trimmedName,
        url: urlToUse,
        color: form.color,
        // store "none|course|event" on server; "none" is also “Keine”
        defaultDisplayType: form.defaultDisplayType,
      });

      const serverSubs = await getICalSubscriptions(userId);

      const mapped: ICalSubscriptionRow[] = (serverSubs as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        color: s.color,
        defaultDisplayType: normalizeDisplayType(s.default_display_type),
      }));

      onSaved(mapped);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Speichern fehlgeschlagen. Bitte später erneut versuchen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      {/* Create / Edit dialog */}
      <Dialog visible={visible} onDismiss={close}>
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

          <Text variant="labelSmall" style={{ marginTop: 4, marginBottom: 6 }}>
            Default-Typ für Einträge dieser Subscription
          </Text>
          <SegmentedButtons
            value={form.defaultDisplayType}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, defaultDisplayType: v as EntryDisplayType }))
            }
            buttons={typeButtons}
            style={{ marginBottom: 10 }}
          />

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
          <Button onPress={close} disabled={saving}>
            Abbrechen
          </Button>
          <Button onPress={handleSave} loading={saving}>
            Speichern
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* Color picker */}
      <Dialog visible={colorPickerVisible} onDismiss={() => setColorPickerVisible(false)}>
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
              const isSelected = c.toLowerCase() === form.color.toLowerCase();
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
          <Button onPress={() => setColorPickerVisible(false)}>Schließen</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
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
