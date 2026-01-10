import * as React from "react";
import { View } from "react-native";
import { useTheme } from "react-native-paper";

import Grades from "../../../components/university/grades";

export default function GradesRoute() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Grades/>
    </View>
  );
}
