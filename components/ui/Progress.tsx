// components/ui/Progress.tsx
import * as React from "react";
import {StyleSheet, View} from "react-native";
import {ProgressBar} from "react-native-paper";

export default function Progress({step, total}: { step: number; total: number }) {
    const pct = Math.min(step - 1, total) / total;
    return <View style={styles.wrap}><ProgressBar progress={pct}/></View>;
}
const styles = StyleSheet.create({wrap: {marginHorizontal: 12, marginBottom: 8}});
