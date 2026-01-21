// components/timetable/editor/EditorContent.tsx
import React, { useMemo } from "react";
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

import {
  DEFAULT_COLORS,
  getDefaultColorForEditorForm,
  withDefaultFirst,
} from "@/src/timetable/utils/defaultColors";

const BASE_COLOR_OPTIONS = [
  DEFAULT_COLORS.course, // blue
  DEFAULT_COLORS.assessment, // yellow
  DEFAULT_COLORS.none, // purple
  DEFAULT_COLORS.event, // green
  DEFAULT_COLORS.assignment, // orange (future)
  "#f783ac",
] as const;

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
  // ✅ Default color for this entry type (yellow override if assessment keywords present)
  const defaultColor = useMemo(
    () => getDefaultColorForEditorForm(form, entryType),
    [form, entryType],
  );

  // ✅ Default color as first option in the palette
  const colorOptions = useMemo(
    () => withDefaultFirst([...BASE_COLOR_OPTIONS], defaultColor),
    [defaultColor],
  );

  return (
    <>
      {/* ✅ Hide type selector entirely for courses (your requirement) */}
      {entryType !== "course" && (
        <>
          <TypeSelector value={entryType} onChange={onSelectDisplayType} />
          <Divider style={{ marginVertical: 10 }} />
        </>
      )}

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

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={colorOptions} />
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

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={colorOptions} />
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

          <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={colorOptions} />
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
