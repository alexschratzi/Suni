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
  isIcalEditing,
  isCreatingNew,
  entryType,
  onPressClose,
}: Props) {
  const titleTheme = useMemo(
    () => ({ colors: { primary: paper.colors.primary } }),
    [paper.colors.primary],
  );

  const placeholder = useMemo(() => {
    if (!isCreatingNew) return undefined;
    if (entryType === "course") return "Course title";
    if (entryType === "event") return "Event title";
    return "Title";
  }, [entryType, isCreatingNew]);

  return (
    <View style={styles.topRow}>
      <View style={{ flex: 1 }}>
        <AutoGrowTextInput
          ref={titleRef}
          mode="flat"
          value={titleValue}
          onChangeText={onChangeTitle}
          editable={!isIcalEditing}
          autoFocus={isCreatingNew && !isIcalEditing}
          selectTextOnFocus={isCreatingNew && !isIcalEditing}
          placeholder={placeholder}
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

      <IconButton icon="close" onPress={onPressClose} style={{ marginTop: 6 }} />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
