import React from "react";
import { Text } from "react-native-paper";

import { settingsStyles } from "@/components/settings/settingsStyles";

type Props = {
  label?: string;
  scale?: number;
};

export function SettingsTodoTag({ label = "TODO", scale = 1 }: Props) {
  return (
    <Text style={[settingsStyles.todo, { fontSize: Math.round(12 * scale) }]}>
      {label}
    </Text>
  );
}
