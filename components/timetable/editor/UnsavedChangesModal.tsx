// components/timetable/editor/UnsavedChangesModal.tsx
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Surface, Text, type MD3Theme } from "react-native-paper";

type Props = {
  open: boolean;
  paper: MD3Theme;

  onCancel: () => void;
  onDiscard: () => void;
  onApply: () => void;
};

export function UnsavedChangesModal({ open, paper, onCancel, onDiscard, onApply }: Props) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />

      <View style={styles.center}>
        <Surface style={[styles.card, { backgroundColor: paper.colors.surface }]} elevation={3}>
          <Text variant="titleMedium">Unsaved changes</Text>
          <Text variant="bodyMedium" style={{ color: paper.colors.onSurfaceVariant, marginTop: 8 }}>
            You have unsaved changes. Do you want to apply them or discard them?
          </Text>

          <View style={styles.actions}>
            <Button onPress={onCancel}>Cancel</Button>
            <Button onPress={onDiscard} textColor={paper.colors.error}>
              Discard
            </Button>
            <Button mode="contained" onPress={onApply}>
              Apply
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 16,
    flexWrap: "wrap",
  },
});
