// app/(tabs)/uni.tsx
import * as React from "react";
import { View } from "react-native";
import { UniversityProvider, useUniversity } from "../../components/university/UniversityContext";
import Onboarding from "../../components/university/Onboarding";
import LinkHub from "../../components/university/LinkHub";

function UniInner() {
  const { shouldShowLinks } = useUniversity();
  // Render either the quick links hub (post-login) or the onboarding flow
  return <View style={{ flex: 1 }}>{shouldShowLinks ? <LinkHub /> : <Onboarding />}</View>;
}

export default function Uni() {
  return (
    <UniversityProvider>
      <UniInner />
    </UniversityProvider>
  );
}
