// components/timetable/editor/types.ts
import type { MD3Theme } from "react-native-paper";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import type {
  ActivePicker,
  CourseEditorForm,
  EntryDisplayType,
  EvWithMeta,
  EventEditorForm,
  PartyEditorForm,
} from "@/types/timetable";

export type EventEditorDrawerProps = {
  visible: boolean;
  paper: MD3Theme;

  editingEvent: EvWithMeta | null;
  form: EventEditorForm | null;

  activePicker: ActivePicker;
  isIcalEditing: boolean;

  isCreatingNew: boolean;
  isDirty: boolean;
  onRequestClose: () => void;
  onDiscardChanges: () => void;

  onSave: () => void;
  onDelete: () => void;

  onChangeFullTitle: (text: string) => void;
  onChangeTitleAbbr: (text: string) => void;
  onChangeNote: (text: string) => void;

  onSelectColor: (color: string) => void;
  onSelectDisplayType: (t: EntryDisplayType) => void;

  onChangeCourseField: (patch: Partial<CourseEditorForm>) => void;
  onChangePartyField: (patch: Partial<PartyEditorForm>) => void;

  onSetActivePicker: (p: ActivePicker) => void;
  onPickerChange: (event: DateTimePickerEvent, date?: Date) => void;
};
