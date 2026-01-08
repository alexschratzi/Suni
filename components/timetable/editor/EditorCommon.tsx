// components/timetable/editor/EditorCommon.tsx
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput, type MD3Theme } from "react-native-paper";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text variant="labelSmall" style={styles.label}>{children}</Text>;
}

export function ColorRow({
  paper,
  value,
  onSelect,
  options,
}: {
  paper: MD3Theme;
  value: string;
  onSelect: (c: string) => void;
  options: string[];
}) {
  return (
    <View>
      <SectionLabel>Color</SectionLabel>
      <View style={styles.colorRow}>
        {options.map((c) => {
          const selected = value === c;
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderColor: paper.colors.outlineVariant },
                selected && { borderWidth: 2, borderColor: paper.colors.primary },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

export function ReadonlyField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      <Pressable onPress={onPress} disabled={!onPress}>
        <TextInput mode="outlined" value={value} editable={false} pointerEvents="none" dense />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 10, marginBottom: 4 },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
});
