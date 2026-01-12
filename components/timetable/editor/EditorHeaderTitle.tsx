// components/timetable/editor/EditorHeaderTitle.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, type MD3Theme } from "react-native-paper";

import type { EntryDisplayType } from "@/types/timetable";
import { AutoGrowTextInput } from "./EditorCommon";

type Props = {
  paper: MD3Theme;

  titleRef: React.RefObject<any>;
  titleValue: string;
  onChangeTitle: (t: string) => void;

  abbrRef?: React.RefObject<any>;
  abbrValue: string;
  onChangeAbbr: (t: string) => void;

  isIcalEditing: boolean;
  isCreatingNew: boolean;
  entryType: EntryDisplayType;

  onPressClose: () => void;
};

export function EditorHeaderTitle({
  paper,
  titleRef,
  titleValue,
  onChangeTitle,
  abbrRef,
  abbrValue,
  onChangeAbbr,
  isIcalEditing,
  isCreatingNew,
  entryType,
  onPressClose,
}: Props) {
  const titleTheme = useMemo(
    () => ({ colors: { primary: paper.colors.primary } }),
    [paper.colors.primary],
  );

  const titlePlaceholder = useMemo(() => {
    if (!isCreatingNew) return undefined;
    if (entryType === "course") return "Course title";
    if (entryType === "event") return "Event title";
    return "Title";
  }, [entryType, isCreatingNew]);

  return (
    <View style={styles.topRow}>
      <View style={{ flex: 1 }}>
        {/* MAIN TITLE */}
        <AutoGrowTextInput
          ref={titleRef}
          mode="flat"
          value={titleValue}
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

        {/* ABBREVIATION — directly under title */}
        <AutoGrowTextInput
          ref={abbrRef}
          mode="flat"
          value={abbrValue}
          onChangeText={onChangeAbbr}
          editable={!isIcalEditing}
          underlineColor="transparent"
          activeUnderlineColor="transparent"
          cursorColor={paper.colors.primary}
          selectionColor={paper.colors.primary}
          theme={titleTheme}
          style={[styles.abbrInline, { backgroundColor: "transparent" }]}
          contentStyle={[
            styles.abbrInlineContent,
            { color: paper.colors.onSurfaceVariant, backgroundColor: "transparent" },
          ]}
          dense={false}
          multiline={false}
          maxLength={4}
          // ❌ no placeholder
          placeholder={undefined}
        />
      </View>

      <IconButton icon="close" onPress={onPressClose} style={{ marginTop: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 8,
  },

  /* Title */
  titleInline: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: -2,
  },
  titleInlineContent: {
    paddingHorizontal: 0,
    paddingVertical: 4, // ↓ tighter
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },

  /* Abbreviation */
  abbrInline: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginTop: -10, // ↓ pulls it directly under the title
  },
  abbrInlineContent: {
    paddingHorizontal: 0,
    paddingVertical: 0, // ↓ minimal spacing
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
