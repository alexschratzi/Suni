// components/ui/Header.tsx
import * as React from "react";
import {StyleSheet} from "react-native";
import {Appbar} from "react-native-paper";

export default function Header({
                                   title,
                                   canGoBack,
                                   onBack,
                               }: {
    title: string;
    canGoBack?: boolean;
    onBack?: () => void;
}) {
    return (
        <Appbar.Header
            mode="small"
            elevated={false}
            statusBarHeight={0}
            style={styles.header}
            theme={{colors: {surface: "transparent"}}} // ensure Paper uses transparent surface
        >
            {canGoBack ? <Appbar.BackAction onPress={onBack}/> : null}
            <Appbar.Content title={title}/>
        </Appbar.Header>
    );
}

const styles = StyleSheet.create({
    header: {
        marginTop: 0,
        paddingTop: 0,
        elevation: 0,                      // Android shadow
        shadowColor: "transparent",        // iOS shadow
        borderBottomWidth: 0,              // no divider line
    },
});
