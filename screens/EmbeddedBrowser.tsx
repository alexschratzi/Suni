// src/screens/EmbeddedBrowser.tsx
import React, {useCallback, useEffect, useRef, useState} from "react";
import {BackHandler, StyleSheet, View} from "react-native";
import {Appbar, ProgressBar, Text} from "react-native-paper";
import {WebView} from "react-native-webview";
import type {LoginDetectionConfig}  from "@/components/university/uni-login";

type Props = {
    initialUrl: string;
    title?: string;
    onClose?: () => void;
    onUrlChange?: (url: string) => void;
    onLoginDetected?: (finalUrl: string) => void;
    loginDetection?: LoginDetectionConfig;
};

function hostOf(url: string): string | null {
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}

export default function EmbeddedBrowser({
                                            initialUrl,
                                            title = "Browser",
                                            onClose,
                                            onUrlChange,
                                            onLoginDetected,
                                            loginDetection,
                                        }: Props) {
    const webRef = useRef<WebView>(null);
    const [canGoBack, setCanGoBack] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTitle, setCurrentTitle] = useState(title);

    useEffect(() => {
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            if (canGoBack && webRef.current) {
                webRef.current.goBack();
                return true;
            }
            return false;
        });
        return () => sub.remove();
    }, [canGoBack]);

    const checkLoginDetection = useCallback((url: string) => {
        if (!loginDetection) return;

        const h = hostOf(url);
        if (!h) return;

        // If we are on an FH domain we consider that success.
        const isSuccess = loginDetection.successHostSuffixes.some((suffix) =>
            h.endsWith(suffix)
        );

        // If idpHosts provided and we're still on one of them, ignore.
        const stillOnIdp =
            loginDetection.idpHosts?.some((idp) => h === idp) ?? false;

        if (isSuccess && !stillOnIdp) {
            onLoginDetected?.(url);
        }
    }, [loginDetection, onLoginDetected]);

    const onNavStateChange = useCallback((navState: any) => {
        setCanGoBack(navState.canGoBack);
        if (navState.title) setCurrentTitle(navState.title);
        if (navState.url) {
            onUrlChange?.(navState.url);
            checkLoginDetection(navState.url);
        }
    }, [onUrlChange, checkLoginDetection]);

    return (
        <View style={styles.root}>
            <Appbar.Header mode="small">
                <Appbar.Action icon="close" onPress={onClose}/>
                <Appbar.Content title={currentTitle}/>
                <Appbar.Action icon="arrow-left" disabled={!canGoBack} onPress={() => webRef.current?.goBack()}/>
                <Appbar.Action icon="arrow-right" onPress={() => webRef.current?.goForward()}/>
                <Appbar.Action icon="refresh" onPress={() => webRef.current?.reload()}/>
            </Appbar.Header>

            {progress > 0 && progress < 1 ? <ProgressBar progress={progress}/> : null}

            <WebView
                ref={webRef}
                source={{uri: initialUrl}}
                onNavigationStateChange={onNavStateChange}
                onLoadProgress={({nativeEvent}) => setProgress(nativeEvent.progress)}
                onLoadEnd={() => setProgress(0)}
                onContentProcessDidTerminate={() => webRef.current?.reload()} // iOS recovery
                setSupportMultipleWindows={false}
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                onShouldStartLoadWithRequest={() => true}
                renderError={() => (
                    <View style={styles.errorBox}><Text>Seite konnte nicht geladen werden.</Text></View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1, backgroundColor: "#fff"},
    errorBox: {padding: 16},
});
