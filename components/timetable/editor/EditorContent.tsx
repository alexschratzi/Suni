// components/timetable/editor/EditorContent.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, type MD3Theme } from "react-native-paper";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import type {
  ActivePicker,
  CourseEditorForm,
  EntryDisplayType,
  EvWithMeta,
  EventEditorForm,
  PartyEditorForm,
} from "@/types/timetable";

import { AutoGrowTextInput, ColorRow } from "./EditorCommon";
import { CourseFields, DateTimeFields, PartyFields, TypeSelector } from "./EditorFields";

const COLOR_OPTIONS = ["#4dabf7", "#f783ac", "#ffd43b", "#69db7c", "#845ef7", "#ffa94d"];

type Props = {
  paper: MD3Theme;

  editingEvent: EvWithMeta;
  form: EventEditorForm;

  activePicker: ActivePicker;
  isIcalEditing: boolean;

  entryType: EntryDisplayType;
  onSelectDisplayType: (t: EntryDisplayType) => void;

  onChangeNote: (t: string) => void;
  onSelectColor: (c: string) => void;

  onChangeCourseField: (patch: Partial<CourseEditorForm>) => void;
  onChangePartyField: (patch: Partial<PartyEditorForm>) => void;

  onSetActivePicker: (p: ActivePicker) => void;
  onPickerChange: (event: DateTimePickerEvent, date?: Date) => void;

  onDelete: () => void;
  onSave: () => void;
};

export function EditorContent({
  paper,
  editingEvent,
  form,
  activePicker,
  isIcalEditing,
  entryType,
  onSelectDisplayType,
  onChangeNote,
  onSelectColor,
  onChangeCourseField,
  onChangePartyField,
  onSetActivePicker,
  onPickerChange,
  onDelete,
  onSave,
}: Props) {
  return (
    <>
      <TypeSelector value={entryType} onChange={onSelectDisplayType} />
      <Divider style={{ marginVertical: 10 }} />

      {entryType === "none" && (
        <>
          <DateTimeFields
            form={form}
            isIcalEditing={isIcalEditing}
            activePicker={activePicker}
            onSetActivePicker={onSetActivePicker}
            onPickerChange={onPickerChange}
          />

          <AutoGrowTextInput
            mode="outlined"
            label="Note"
            value={form.note}
            onChangeText={onChangeNote}
            dense
            multiline
            numberOfLines={3}
          />

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
        </>
      )}

      {entryType === "course" && (
        <>
          <CourseFields form={form as CourseEditorForm} onChangeCourseField={onChangeCourseField} />

          <Divider style={{ marginVertical: 10 }} />

          <DateTimeFields
            form={form}
            isIcalEditing={isIcalEditing}
            activePicker={activePicker}
            onSetActivePicker={onSetActivePicker}
            onPickerChange={onPickerChange}
          />

          <AutoGrowTextInput
            mode="outlined"
            label="Note"
            value={form.note}
            onChangeText={onChangeNote}
            dense
            multiline
            numberOfLines={3}
          />

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
        </>
      )}

      {entryType === "event" && (
        <>
          <PartyFields form={form as PartyEditorForm} onChangePartyField={onChangePartyField} />

          <Divider style={{ marginVertical: 10 }} />

          <DateTimeFields
            form={form}
            isIcalEditing={isIcalEditing}
            activePicker={activePicker}
            onSetActivePicker={onSetActivePicker}
            onPickerChange={onPickerChange}
          />

          <AutoGrowTextInput
            mode="outlined"
            label="Note"
            value={form.note}
            onChangeText={onChangeNote}
            dense
            multiline
            numberOfLines={3}
          />

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
        </>
      )}

      <View style={styles.actionsRow}>
        {editingEvent.source === "local" && (
          <Button onPress={onDelete} textColor={paper.colors.error}>
            Löschen
          </Button>
        )}
        <Button mode="contained" onPress={onSave}>
          Speichern
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    columnGap: 8,
  },
});
