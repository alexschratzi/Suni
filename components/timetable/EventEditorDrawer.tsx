// components/timetable/EventEditorDrawer.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  Button,
  Divider,
  IconButton,
  Surface,
  Text,
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

import { AutoGrowTextInput, ColorRow } from "./editor/EditorCommon";
import { CourseFields, DateTimeFields, PartyFields, TypeSelector } from "./editor/EditorFields";

const COLOR_OPTIONS = ["#4dabf7", "#f783ac", "#ffd43b", "#69db7c", "#845ef7", "#ffa94d"];

type Props = {
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

export function EventEditorDrawer(props: Props) {
  const {
    visible,
    paper,
    editingEvent,
    form,
    activePicker,
    isIcalEditing,
    isCreatingNew,
    isDirty,
    onRequestClose,
    onDiscardChanges,
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
  const titleRef = useRef<any>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ prevents double confirm due to close events
  const bypassNextCloseConfirmRef = useRef(false);

  // ✅ remember whether the confirm was triggered by swipe-down dismissal
  const confirmWasFromSwipeRef = useRef(false);

  useEffect(() => {
    const m = modalRef.current;
    if (!m) return;
    if (visible) m.present();
    else m.dismiss();
  }, [visible]);

  const snapPoints = useMemo(() => ["92%"], []);
  const ready = !!editingEvent && !!form;
  const t = (form?.displayType ?? "none") as EntryDisplayType;

  // Title flicker fix: local draft
  const [titleDraft, setTitleDraft] = useState<string>("");

  const eventKey = useMemo(() => {
    if (!editingEvent) return "none";
    return (
      (editingEvent as any).id ??
      `${editingEvent.source}:${(editingEvent as any).start}:${(editingEvent as any).end}`
    );
  }, [editingEvent]);

  useEffect(() => {
    if (!visible || !ready || !form) return;
    setTitleDraft(form.fullTitle ?? "");
    setConfirmOpen(false);
    bypassNextCloseConfirmRef.current = false;
    confirmWasFromSwipeRef.current = false;
  }, [visible, ready, eventKey, form]);

  useEffect(() => {
    if (!visible || !ready) return;
    if (!isCreatingNew) return;
    if (isIcalEditing) return;

    const id = setTimeout(() => {
      titleRef.current?.focus?.();
    }, 250);

    return () => clearTimeout(id);
  }, [visible, ready, isCreatingNew, isIcalEditing]);

  const titleTheme = useMemo(
    () => ({ colors: { primary: paper.colors.primary } }),
    [paper.colors.primary],
  );

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        pressBehavior="none"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    [],
  );

  const openConfirmFromButton = useCallback(() => {
    confirmWasFromSwipeRef.current = false; // close button keeps sheet up
    setConfirmOpen(true);
  }, []);

  const attemptClose = useCallback(() => {
    if (confirmOpen) return;
    if (isDirty) {
      openConfirmFromButton();
      return;
    }
    onRequestClose();
  }, [confirmOpen, isDirty, onRequestClose, openConfirmFromButton]);

  // ✅ If user swipes down to close the sheet:
  // - if dirty => KEEP SHEET DOWN and show confirm
  // - cancel => re-open
  const onSheetChange = useCallback(
    (index: number) => {
      if (index !== -1) return;

      if (bypassNextCloseConfirmRef.current) {
        bypassNextCloseConfirmRef.current = false;
        return;
      }

      // If already confirming, ignore
      if (confirmOpen) return;

      if (isDirty) {
        confirmWasFromSwipeRef.current = true; // <-- important
        setConfirmOpen(true);
        return; // keep sheet dismissed
      }

      onRequestClose();
    },
    [confirmOpen, isDirty, onRequestClose],
  );

  const onChangeTitle = useCallback(
    (text: string) => {
      setTitleDraft(text);
      onChangeFullTitle(text);
    },
    [onChangeFullTitle],
  );

  const titlePlaceholder = useMemo(() => {
    if (!isCreatingNew) return undefined;
    if (t === "course") return "Course title";
    if (t === "event") return "Event title";
    return "Title";
  }, [isCreatingNew, t]);

  const handleCancelConfirm = useCallback(() => {
    const fromSwipe = confirmWasFromSwipeRef.current;
    setConfirmOpen(false);
    confirmWasFromSwipeRef.current = false;

    // ✅ only re-open the sheet if the confirm came from a swipe-down dismissal
    if (fromSwipe) {
      // small delay helps avoid a weird visual race on some devices
      setTimeout(() => {
        modalRef.current?.present();
      }, 0);
    }
  }, []);

  const handleDiscard = useCallback(() => {
    bypassNextCloseConfirmRef.current = true;
    setConfirmOpen(false);
    confirmWasFromSwipeRef.current = false;
    onDiscardChanges();
  }, [onDiscardChanges]);

  const handleApply = useCallback(() => {
    bypassNextCloseConfirmRef.current = true;
    setConfirmOpen(false);
    confirmWasFromSwipeRef.current = false;
    onSave();
  }, [onSave]);

  return (
    <>
      <BottomSheetModal
        ref={modalRef}
        snapPoints={snapPoints}
        index={0}
        backdropComponent={renderBackdrop}
        onChange={onSheetChange}
        backgroundStyle={{ backgroundColor: paper.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: paper.colors.outlineVariant }}
        enablePanDownToClose
        enableDynamicSizing={false}
        enableOverDrag={false}
        enableHandlePanningGesture={true}
        enableContentPanningGesture={false}
        keyboardBehavior={Platform.OS === "ios" ? "interactive" : "extend"}
        keyboardBlurBehavior="restore"
      >
        {!ready ? (
          <View style={{ padding: 16 }} />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
            style={{ flex: 1 }}
          >
            <Surface mode="flat" elevation={0} style={[styles.sheet, { backgroundColor: paper.colors.surface }]}>
              <BottomSheetScrollView
                style={{ flex: 1 }}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <AutoGrowTextInput
                      ref={titleRef}
                      mode="flat"
                      value={titleDraft}
                      onChangeText={onChangeTitle}
                      editable={!isIcalEditing}
                      autoFocus={isCreatingNew && !isIcalEditing}
                      selectTextOnFocus={isCreatingNew && !isIcalEditing}
                      placeholder={titlePlaceholder}
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      cursorColor={paper.colors.primary}
                      selectionColor={paper.colors.primary}
                      theme={titleTheme}
                      style={[styles.titleInline, { backgroundColor: "transparent" }]}
                      contentStyle={[
                        styles.titleInlineContent,
                        { color: paper.colors.onSurface, backgroundColor: "transparent" },
                      ]}
                      dense={false}
                      multiline
                      numberOfLines={2}
                      scrollEnabled
                    />
                  </View>

                  <IconButton icon="close" onPress={attemptClose} style={{ marginTop: 6 }} />
                </View>

                <Divider style={{ marginVertical: 10 }} />

                <TypeSelector value={t} onChange={onSelectDisplayType} />

                <Divider style={{ marginVertical: 10 }} />

                {t === "none" && (
                  <>
                    <AutoGrowTextInput
                      mode="outlined"
                      label="Title abbr."
                      value={form!.titleAbbr}
                      onChangeText={onChangeTitleAbbr}
                      dense
                    />

                    <DateTimeFields
                      form={form!}
                      isIcalEditing={isIcalEditing}
                      activePicker={activePicker}
                      onSetActivePicker={onSetActivePicker}
                      onPickerChange={onPickerChange}
                    />

                    <AutoGrowTextInput
                      mode="outlined"
                      label="Note"
                      value={form!.note}
                      onChangeText={onChangeNote}
                      dense
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form!.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

                {t === "course" && (
                  <>
                    <CourseFields form={form as CourseEditorForm} onChangeCourseField={onChangeCourseField} />

                    <Divider style={{ marginVertical: 10 }} />

                    <DateTimeFields
                      form={form!}
                      isIcalEditing={isIcalEditing}
                      activePicker={activePicker}
                      onSetActivePicker={onSetActivePicker}
                      onPickerChange={onPickerChange}
                    />

                    <AutoGrowTextInput
                      mode="outlined"
                      label="Note"
                      value={form!.note}
                      onChangeText={onChangeNote}
                      dense
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form!.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

                {t === "event" && (
                  <>
                    <PartyFields form={form as PartyEditorForm} onChangePartyField={onChangePartyField} />

                    <Divider style={{ marginVertical: 10 }} />

                    <DateTimeFields
                      form={form!}
                      isIcalEditing={isIcalEditing}
                      activePicker={activePicker}
                      onSetActivePicker={onSetActivePicker}
                      onPickerChange={onPickerChange}
                    />

                    <AutoGrowTextInput
                      mode="outlined"
                      label="Note"
                      value={form!.note}
                      onChangeText={onChangeNote}
                      dense
                      multiline
                      numberOfLines={3}
                    />

                    <ColorRow paper={paper} value={form!.color} onSelect={onSelectColor} options={COLOR_OPTIONS} />
                  </>
                )}

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
      </BottomSheetModal>

      {/* confirm modal */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCancelConfirm}
        statusBarTranslucent
      >
        {/* Backdrop tap behaves like Cancel */}
        <Pressable style={styles.modalBackdrop} onPress={handleCancelConfirm} />

        <View style={styles.modalCenter}>
          <Surface style={[styles.modalCard, { backgroundColor: paper.colors.surface }]} elevation={3}>
            <Text variant="titleMedium">Unsaved changes</Text>
            <Text variant="bodyMedium" style={{ color: paper.colors.onSurfaceVariant, marginTop: 8 }}>
              You have unsaved changes. Do you want to apply them or discard them?
            </Text>

            <View style={styles.modalActions}>
              <Button onPress={handleCancelConfirm}>Cancel</Button>
              <Button onPress={handleDiscard} textColor={paper.colors.error}>
                Discard
              </Button>
              <Button mode="contained" onPress={handleApply}>
                Apply
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
  },
  titleInline: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: -2,
  },
  titleInlineContent: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 140,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    columnGap: 8,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    flexWrap: "wrap",
  },
});
