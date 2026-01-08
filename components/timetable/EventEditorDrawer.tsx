// components/timetable/EventEditorDrawer.tsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  Button,
  Divider,
  IconButton,
  Surface,
  Text,
  TextInput,
  type MD3Theme,
} from "react-native-paper";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import type {
  ActivePicker,
  CourseEditorForm,
  EntryDisplayType,
  EvWithMeta,
  EventEditorForm,
  PartyEditorForm,
} from "@/types/timetable";

import { ColorRow, SectionLabel } from "./editor/EditorCommon";
import { CourseFields, DateTimeFields, PartyFields, TypeSelector } from "./editor/EditorFields";

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
  onSelectDisplayType: (t: EntryDisplayType) => void;

  onChangeCourseField: (patch: Partial<CourseEditorForm>) => void;
  onChangePartyField: (patch: Partial<PartyEditorForm>) => void;

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
    onSelectDisplayType,
    onChangeCourseField,
    onChangePartyField,
    onSetActivePicker,
    onPickerChange,
  } = props;

  const modalRef = useRef<BottomSheetModal>(null);

  // ✅ Inline “sync visible -> present/dismiss”
  useEffect(() => {
    const m = modalRef.current;
    if (!m) return;

    if (visible) {
      m.present();
    } else {
      m.dismiss();
    }
  }, [visible]);

  const snapPoints = useMemo(() => ["90%"], []);
  const ready = !!editingEvent && !!form;
  const t = (form?.displayType ?? "none") as EntryDisplayType;

  const headerTitle = useMemo(() => {
    const base =
      t === "course"
        ? "Course bearbeiten"
        : t === "event"
          ? "Event (Party) bearbeiten"
          : "Eintrag bearbeiten";
    return isIcalEditing ? `${base} (iCal)` : base;
  }, [isIcalEditing, t]);

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        // ✅ outside-tap should NOT close
        pressBehavior="none"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  const dismiss = useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      onDismiss={onClose}
      handleIndicatorStyle={{ backgroundColor: paper.colors.outlineVariant }}
      backgroundStyle={{ backgroundColor: paper.colors.surface }}
    >
      <BottomSheetView style={styles.container}>
        {!ready ? (
          <View style={{ padding: 16 }}>
            <Text variant="bodyMedium" style={{ color: paper.colors.onSurfaceVariant }}>
              Loading…
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            style={{ flex: 1 }}
          >
            <Surface mode="flat" elevation={0} style={[styles.sheet, { backgroundColor: paper.colors.surface }]}>
              <BottomSheetScrollView
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Header */}
                <View style={styles.headerRow}>
                  <Text variant="titleMedium" style={{ flex: 1 }}>
                    {headerTitle}
                  </Text>
                  <IconButton icon="close" onPress={dismiss} />
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {/* Type selector */}
                <TypeSelector value={t} onChange={onSelectDisplayType} />

                <Divider style={{ marginVertical: 10 }} />

                {/* NONE */}
                {t === "none" && (
                  <>
                    <SectionLabel>
                      Title{isIcalEditing ? " (aus iCal, nicht änderbar)" : ""}
                    </SectionLabel>
                    <TextInput
                      mode="outlined"
                      value={form.fullTitle}
                      onChangeText={onChangeFullTitle}
                      dense
                      editable={!isIcalEditing}
                    />

                    <SectionLabel>Title abbr.</SectionLabel>
                    <TextInput mode="outlined" value={form.titleAbbr} onChangeText={onChangeTitleAbbr} dense />

                    <DateTimeFields
                      form={form}
                      isIcalEditing={isIcalEditing}
                      activePicker={activePicker}
                      onSetActivePicker={onSetActivePicker}
                      onPickerChange={onPickerChange}
                    />

                    <SectionLabel>Note</SectionLabel>
                    <TextInput
                      mode="outlined"
                      value={form.note}
                      onChangeText={onChangeNote}
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

                {/* COURSE */}
                {t === "course" && (
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

                    <SectionLabel>Note</SectionLabel>
                    <TextInput
                      mode="outlined"
                      value={form.note}
                      onChangeText={onChangeNote}
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

                {/* EVENT (PARTY) */}
                {t === "event" && (
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

                    <SectionLabel>Note</SectionLabel>
                    <TextInput
                      mode="outlined"
                      value={form.note}
                      onChangeText={onChangeNote}
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {editingEvent?.source === "local" && (
                    <Button onPress={onDelete} textColor={paper.colors.error}>
                      Löschen
                    </Button>
                  )}
                  <Button mode="contained" onPress={onSave}>
                    Speichern
                  </Button>
                </View>
              </BottomSheetScrollView>
            </Surface>
          </KeyboardAvoidingView>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheet: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    columnGap: 8,
  },
});
