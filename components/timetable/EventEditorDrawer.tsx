// components/timetable/EventEditorDrawer.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Divider, Surface } from "react-native-paper";

import type { EntryDisplayType } from "@/types/timetable";
import type { EventEditorDrawerProps } from "./editor/types";

import { EditorHeaderTitle } from "./editor/EditorHeaderTitle";
import { EditorContent } from "./editor/EditorContent";
import { UnsavedChangesModal } from "./editor/UnsavedChangesModal";

export function EventEditorDrawer(props: EventEditorDrawerProps) {
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

  const bypassNextCloseConfirmRef = useRef(false);
  const confirmWasFromSwipeRef = useRef(false);

  useEffect(() => {
    const m = modalRef.current;
    if (!m) return;
    if (visible) m.present();
    else m.dismiss();
  }, [visible]);

  const ready = !!editingEvent && !!form;
  const snapPoints = useMemo(() => ["92%"], []);
  const t = (form?.displayType ?? "none") as EntryDisplayType;

  const [titleDraft, setTitleDraft] = useState("");

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

    const id = setTimeout(() => titleRef.current?.focus?.(), 250);
    return () => clearTimeout(id);
  }, [visible, ready, isCreatingNew, isIcalEditing]);

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

  const onChangeTitle = useCallback(
    (text: string) => {
      setTitleDraft(text);
      onChangeFullTitle(text);
    },
    [onChangeFullTitle],
  );

  const attemptCloseViaButton = useCallback(() => {
    if (confirmOpen) return;
    if (isDirty) {
      confirmWasFromSwipeRef.current = false;
      setConfirmOpen(true);
      return;
    }
    onRequestClose();
  }, [confirmOpen, isDirty, onRequestClose]);

  const onSheetChange = useCallback(
    (index: number) => {
      if (index !== -1) return;

      if (bypassNextCloseConfirmRef.current) {
        bypassNextCloseConfirmRef.current = false;
        return;
      }

      if (confirmOpen) return;

      if (isDirty) {
        confirmWasFromSwipeRef.current = true;
        setConfirmOpen(true);
        return;
      }

      onRequestClose();
    },
    [confirmOpen, isDirty, onRequestClose],
  );

  const onCancelConfirm = useCallback(() => {
    const fromSwipe = confirmWasFromSwipeRef.current;
    setConfirmOpen(false);
    confirmWasFromSwipeRef.current = false;

    if (fromSwipe) {
      setTimeout(() => modalRef.current?.present(), 0);
    }
  }, []);

  const onDiscard = useCallback(() => {
    bypassNextCloseConfirmRef.current = true;
    setConfirmOpen(false);
    confirmWasFromSwipeRef.current = false;
    onDiscardChanges();
  }, [onDiscardChanges]);

  const onApply = useCallback(() => {
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
        enableHandlePanningGesture
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
                <EditorHeaderTitle
                  paper={paper}
                  titleRef={titleRef}
                  titleValue={titleDraft}
                  onChangeTitle={onChangeTitle}
                  isIcalEditing={isIcalEditing}
                  isCreatingNew={isCreatingNew}
                  entryType={t}
                  onPressClose={attemptCloseViaButton}
                />

                <Divider style={{ marginVertical: 10 }} />

                <EditorContent
                  paper={paper}
                  editingEvent={editingEvent!}
                  form={form!}
                  activePicker={activePicker}
                  isIcalEditing={isIcalEditing}
                  entryType={t}
                  onSelectDisplayType={onSelectDisplayType}
                  onChangeTitleAbbr={onChangeTitleAbbr}
                  onChangeNote={onChangeNote}
                  onSelectColor={onSelectColor}
                  onChangeCourseField={onChangeCourseField}
                  onChangePartyField={onChangePartyField}
                  onSetActivePicker={onSetActivePicker}
                  onPickerChange={onPickerChange}
                  onDelete={onDelete}
                  onSave={onSave}
                />
              </BottomSheetScrollView>
            </Surface>
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

      <UnsavedChangesModal
        open={confirmOpen}
        paper={paper}
        onCancel={onCancelConfirm}
        onDiscard={onDiscard}
        onApply={onApply}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  scrollContent: { flexGrow: 1, paddingBottom: 140 },
});
