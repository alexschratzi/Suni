import * as React from "react";
import { Text, useTheme } from "react-native-paper";
import { useUniversity } from "@/components/university/UniversityContext";

export function UniHeaderTitle() {
  const theme = useTheme();
  const { university, shouldShowLinks } = useUniversity();

  // When onboarding is active, keep a stable title
  const title = shouldShowLinks
    ? (university?.name ?? "Uni")
    : "Uni Login";

  return (
    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
      {title}
    </Text>
  );
}