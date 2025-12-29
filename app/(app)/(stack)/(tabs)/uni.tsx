// app/(tabs)/uni.tsx
import * as React from "react";
import LinkHub from "../../../../components/university/LinkHub";
import Onboarding from "../../../../components/university/Onboarding";
import Grades from "../../../../components/university/grades";
import { useUniversity } from "../../../../components/university/UniversityContext";
import { Surface, useTheme } from "react-native-paper";

type UniView = "hub" | "grades";

export default function Uni() {
  const { shouldShowLinks } = useUniversity();
  const theme = useTheme();

  const [view, setView] = React.useState<UniView>("hub");

  // If user logs out, force onboarding/hub state
  React.useEffect(() => {
    if (!shouldShowLinks) setView("hub");
  }, [shouldShowLinks]);

  return (
    <Surface style={[{ backgroundColor: theme.colors.background }, { flex: 1 }]}>
      {!shouldShowLinks ? (
        <Onboarding />
      ) : view === "hub" ? (
        <LinkHub onOpenGrades={() => setView("grades")} />
      ) : (
        <Grades onBack={() => setView("hub")} />
      )}
    </Surface>
  );
}
