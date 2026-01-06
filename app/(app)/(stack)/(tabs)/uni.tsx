// app/(app)/(stack)/(tabs)/uni.tsx
import * as React from "react";
import { View } from "react-native";
import { useTheme } from "react-native-paper";

import LinkHub from "../../../../components/university/LinkHub";
import Onboarding from "../../../../components/university/Onboarding";
import Grades from "../../../../components/university/grades";
import { useUniversity } from "../../../../components/university/UniversityContext";

type UniView = "hub" | "grades";

export default function Uni() {
  const { shouldShowLinks } = useUniversity();
  const theme = useTheme();

  const [view, setView] = React.useState<UniView>("hub");

  React.useEffect(() => {
    if (!shouldShowLinks) setView("hub");
  }, [shouldShowLinks]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {!shouldShowLinks ? (
        <Onboarding />
      ) : view === "hub" ? (
        <LinkHub onOpenGrades={() => setView("grades")} />
      ) : (
        <Grades onBack={() => setView("hub")} />
      )}
    </View>
  );
}
