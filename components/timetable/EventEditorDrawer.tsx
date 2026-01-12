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

function clampAbbr(raw: string): string {
  const s = String(raw ?? "").trim();
  return s.replace(/\s+/g, "").slice(0, 4);
}

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
  const abbrRef = useRef<any>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ used to skip confirm for intentional/programmatic closes (Save/Delete/Apply/Discard)
  const bypassNextCloseConfirmRef = useRef(false);
  // ✅ used to re-open only when confirm came from swipe-down
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

  // local drafts prevent cursor flicker
  const [titleDraft, setTitleDraft] = useState("");
  const [abbrDraft, setAbbrDraft] = useState("");

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
    setAbbrDraft(clampAbbr(form.titleAbbr ?? ""));
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

  const onChangeAbbr = useCallback(
    (text: string) => {
      const clamped = clampAbbr(text);
      setAbbrDraft(clamped);
      onChangeTitleAbbr(clamped);
    },
    [onChangeTitleAbbr],
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

      // ✅ Skip confirm once for intentional closes (Save/Delete/Apply/Discard)
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

  // ✅ Wrap Save/Delete so they DON'T trigger the dirty-confirm on sheet dismiss
  const handleSave = useCallback(() => {
    bypassNextCloseConfirmRef.current = true;
    onSave();
  }, [onSave]);

  const handleDelete = useCallback(() => {
    bypassNextCloseConfirmRef.current = true;
    onDelete();
  }, [onDelete]);

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
                  abbrRef={abbrRef}
                  abbrValue={abbrDraft}
                  onChangeAbbr={onChangeAbbr}
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
                  onChangeNote={onChangeNote}
                  onSelectColor={onSelectColor}
                  onChangeCourseField={onChangeCourseField}
                  onChangePartyField={onChangePartyField}
                  onSetActivePicker={onSetActivePicker}
                  onPickerChange={onPickerChange}
                  // ✅ use wrapped handlers
                  onDelete={handleDelete}
                  onSave={handleSave}
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
