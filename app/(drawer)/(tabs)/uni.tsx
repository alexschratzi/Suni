// app/(tabs)/uni.tsx
import * as React from "react";
import {View} from "react-native";
import LinkHub from "../../../components/university/LinkHub";
import Onboarding from "../../../components/university/Onboarding";
import {useUniversity} from "../../../components/university/UniversityContext";
import { Surface, useTheme } from "react-native-paper";

export default function Uni() {
    const {shouldShowLinks} = useUniversity();
    const theme = useTheme();
    return <Surface style={[{ backgroundColor: theme.colors.background }, {flex: 1}]}>{shouldShowLinks ? <LinkHub/> : <Onboarding/>}</Surface>;
}
