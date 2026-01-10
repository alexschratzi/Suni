import * as React from "react";
import { View } from "react-native";
import { useTheme } from "react-native-paper";

import LinkHub from "../../../../components/university/LinkHub";
import Onboarding from "../../../../components/university/Onboarding";
import { useUniversity } from "../../../../components/university/UniversityContext";

export default function Uni() {
  const { shouldShowLinks } = useUniversity();
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {!shouldShowLinks ? <Onboarding /> : <LinkHub />}
    </View>
  );
}
