// components/timetable/EventEditorDrawer.tsx
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View, KeyboardAvoidingView } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Button, Divider, IconButton, Surface, Text, TextInput, type MD3Theme } from "react-native-paper";

import type { ActivePicker, EvWithMeta, EventEditorForm } from "@/types/timetable";
import { formatDateTimeIso } from "@/src/timetable/utils/date";

const COLOR_OPTIONS = ["#4dabf7", "#f783ac", "#ffd43b", "#69db7c", "#845ef7", "#ffa94d"];

type Props = {
  visible: boolean;
  paper: MD3Theme;

  editingEvent: EvWithMeta | null;
  form: EventEditorForm | null;

  activePicker: ActivePicker;
  isIcalEditing: boolean;

  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;

  onChangeFullTitle: (text: string) => void;
  onChangeTitleAbbr: (text: string) => void;
  onChangeNote: (text: string) => void;
  onSelectColor: (color: string) => void;

  onSetActivePicker: (p: ActivePicker) => void;
  onPickerChange: (event: DateTimePickerEvent, date?: Date) => void;
};

export function EventEditorDrawer(props: Props) {
  const {
    visible,
    paper,
    editingEvent,
    form,
    activePicker,
    isIcalEditing,
    onClose,
    onSave,
    onDelete,
    onChangeFullTitle,
    onChangeTitleAbbr,
    onChangeNote,
    onSelectColor,
    onSetActivePicker,
    onPickerChange,
  } = props;

  if (!visible || !editingEvent || !form) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Pressable style={[styles.scrim, { backgroundColor: paper.colors.backdrop }]} onPress={onClose} />

      <KeyboardAvoidingView
        style={styles.drawerAvoider}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={64}
      >
        <Surface
          elevation={3}
          mode="elevated"
          style={[
            styles.drawer,
            {
              backgroundColor: paper.colors.surface,
              borderLeftColor: paper.colors.outlineVariant,
            },
          ]}
        >
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text variant="titleMedium" style={{ flex: 1 }}>
                {isIcalEditing ? "iCal-Event anzeigen" : "Event bearbeiten"}
              </Text>
              <IconButton icon="close" onPress={onClose} />
            </View>

            <Divider style={{ marginVertical: 8 }} />

            <Text variant="labelSmall" style={styles.label}>
              Title{isIcalEditing && " (aus iCal, nicht änderbar)"}
            </Text>
            <TextInput
              mode="outlined"
              value={form.fullTitle}
              onChangeText={onChangeFullTitle}
              dense
              editable={!isIcalEditing}
            />

            <Text variant="labelSmall" style={styles.label}>
              Title abbr.
            </Text>
            <TextInput mode="outlined" value={form.titleAbbr} onChangeText={onChangeTitleAbbr} dense />

            <Text variant="labelSmall" style={styles.label}>
              From {isIcalEditing && "(aus iCal, nicht änderbar)"}
            </Text>
            <Pressable
              onPress={() => {
                if (isIcalEditing) return;
                onSetActivePicker(activePicker === "from" ? null : "from");
              }}
            >
              <TextInput
                mode="outlined"
                value={formatDateTimeIso(form.from)}
                editable={false}
                pointerEvents="none"
                dense
              />
            </Pressable>
            {!isIcalEditing && activePicker === "from" && (
              <DateTimePicker
                value={new Date(form.from)}
                mode="datetime"
                display="spinner"
                onChange={onPickerChange}
                style={{ alignSelf: "stretch" }}
              />
            )}

            <Text variant="labelSmall" style={styles.label}>
              Until {isIcalEditing && "(aus iCal, nicht änderbar)"}
            </Text>
            <Pressable
              onPress={() => {
                if (isIcalEditing) return;
                onSetActivePicker(activePicker === "until" ? null : "until");
              }}
            >
              <TextInput
                mode="outlined"
                value={formatDateTimeIso(form.until)}
                editable={false}
                pointerEvents="none"
                dense
              />
            </Pressable>
            {!isIcalEditing && activePicker === "until" && (
              <DateTimePicker
                value={new Date(form.until)}
                mode="datetime"
                display="spinner"
                onChange={onPickerChange}
                style={{ alignSelf: "stretch" }}
              />
            )}

            <Text variant="labelSmall" style={styles.label}>
              Note
            </Text>
            <TextInput
              mode="outlined"
              value={form.note}
              onChangeText={onChangeNote}
              multiline
              numberOfLines={3}
            />

            <Text variant="labelSmall" style={styles.label}>
              Color
            </Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => {
                const selected = form.color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => onSelectColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c, borderColor: paper.colors.outlineVariant },
                      selected && { borderWidth: 2, borderColor: paper.colors.primary },
                    ]}
                  />
                );
              })}
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, columnGap: 8 }}>
              {editingEvent?.source === "local" && (
                <Button onPress={onDelete} textColor={paper.colors.error}>
                  Löschen
                </Button>
              )}

              <Button mode="contained" onPress={onSave}>
                Speichern
              </Button>
            </View>
          </ScrollView>
        </Surface>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 8, marginBottom: 2 },
  scrim: { ...StyleSheet.absoluteFillObject },
  drawerAvoider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "80%",
  },
  drawer: {
    flex: 1,
    padding: 16,
    borderLeftWidth: StyleSheet.hairlineWidth,
    justifyContent: "flex-start",
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
});
