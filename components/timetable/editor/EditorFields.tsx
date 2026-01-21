// components/timetable/editor/EditorFields.tsx
//FIXME: Text in the Fields flicker when editing and cursor lags behind or resets.
import React, { useMemo } from "react";
import { View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { SegmentedButtons } from "react-native-paper";

import type {
  ActivePicker,
  CourseEditorForm,
  EntryDisplayType,
  EventEditorForm,
  PartyEditorForm,
} from "@/types/timetable";

import { formatDateTimeIso } from "@/src/timetable/utils/date";
import { AutoGrowTextInput, ReadonlyField, SectionLabel } from "./EditorCommon";

export function TypeSelector({
  value,
  onChange,
}: {
  value: EntryDisplayType;
  onChange: (t: EntryDisplayType) => void;
}) {
  // ✅ Only allow "none" and "event"
  const buttons = useMemo(
    () => [
      { value: "none", label: "Entry" }, // ✅ renamed from "None"
      { value: "event", label: "Event" },
    ],
    [],
  );

  // If current value is "course", SegmentedButtons would have no matching button.
  // We still keep the component simple; caller must not render it for courses.
  return (
    <View>
      <SectionLabel>Type</SectionLabel>
      <SegmentedButtons
        value={value === "course" ? "none" : value}
        onValueChange={(v) => onChange(v as EntryDisplayType)}
        buttons={buttons}
      />
    </View>
  );
}

export function DateTimeFields({
  form,
  isIcalEditing,
  activePicker,
  onSetActivePicker,
  onPickerChange,
}: {
  form: EventEditorForm;
  isIcalEditing: boolean;
  activePicker: ActivePicker;
  onSetActivePicker: (p: ActivePicker) => void;
  onPickerChange: (event: DateTimePickerEvent, date?: Date) => void;
}) {
  return (
    <View>
      <ReadonlyField
        label={`From ${isIcalEditing ? "(aus iCal, nicht änderbar)" : ""}`}
        value={formatDateTimeIso(form.from)}
        onPress={isIcalEditing ? undefined : () => onSetActivePicker(activePicker === "from" ? null : "from")}
      />
      {!isIcalEditing && activePicker === "from" && (
        <DateTimePicker value={new Date(form.from)} mode="datetime" display="spinner" onChange={onPickerChange} />
      )}

      <ReadonlyField
        label={`Until ${isIcalEditing ? "(aus iCal, nicht änderbar)" : ""}`}
        value={formatDateTimeIso(form.until)}
        onPress={isIcalEditing ? undefined : () => onSetActivePicker(activePicker === "until" ? null : "until")}
      />
      {!isIcalEditing && activePicker === "until" && (
        <DateTimePicker value={new Date(form.until)} mode="datetime" display="spinner" onChange={onPickerChange} />
      )}
    </View>
  );
}

export function CourseFields({
  form,
  onChangeCourseField,
}: {
  form: CourseEditorForm;
  onChangeCourseField: (patch: Partial<CourseEditorForm>) => void;
}) {
  return (
    <View>
      <SectionLabel>Type</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.courseType ?? ""}
        onChangeText={(t) => onChangeCourseField({ courseType: t })}
        dense
      />

      <SectionLabel>Groups (comma separated)</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.groups ?? ""}
        onChangeText={(t) => onChangeCourseField({ groups: t })}
        dense
        multiline
      />

      <SectionLabel>Location</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.location ?? ""}
        onChangeText={(t) => onChangeCourseField({ location: t })}
        dense
      />

      <SectionLabel>Lecturer</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.lecturer ?? ""}
        onChangeText={(t) => onChangeCourseField({ lecturer: t })}
        dense
      />
    </View>
  );
}

export function PartyFields({
  form,
  onChangePartyField,
}: {
  form: PartyEditorForm;
  onChangePartyField: (patch: Partial<PartyEditorForm>) => void;
}) {
  return (
    <View>
      <SectionLabel>Location</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.location ?? ""}
        onChangeText={(t) => onChangePartyField({ location: t })}
        dense
      />

      <SectionLabel>Event Created By</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.createdBy ?? ""}
        onChangeText={(t) => onChangePartyField({ createdBy: t })}
        dense
      />

      <SectionLabel>Entry fee</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.entryFee ?? ""}
        onChangeText={(t) => onChangePartyField({ entryFee: t })}
        dense
      />

      <SectionLabel>Invited Groups (comma separated)</SectionLabel>
      <AutoGrowTextInput
        mode="outlined"
        value={form.invitedGroups ?? ""}
        onChangeText={(t) => onChangePartyField({ invitedGroups: t })}
        dense
      />
    </View>
  );
}
