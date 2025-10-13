// app/(tabs)/uni.tsx
import * as React from "react";
import {View} from "react-native";
import LinkHub from "../../components/university/LinkHub";
import Onboarding from "../../components/university/Onboarding";
import {useUniversity} from "../../components/university/UniversityContext";

export default function Uni() {
    const {shouldShowLinks} = useUniversity();
    return <View style={{flex: 1}}>{shouldShowLinks ? <LinkHub/> : <Onboarding/>}</View>;
}
