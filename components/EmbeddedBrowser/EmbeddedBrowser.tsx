// components/EmbeddedBrowser/EmbeddedBrowser.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { Appbar, ProgressBar, Text } from "react-native-paper";
import { WebView } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";

type Props = {
  initialUrl: string;
  title?: string;
  onClose?: () => void;
  onUrlChange?: (url: string) => void;

  /** When changed, forces a full WebView reset */
  resetToken?: number;
};

export default function EmbeddedBrowser({
  initialUrl,
  title = "Browser",
  onClose,
  onUrlChange,
  resetToken,
}: Props) {
  const webRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTitle, setCurrentTitle] = useState(title);

  // 🔑 this key controls full WebView lifecycle
  const webViewKey = `webview-${resetToken ?? 0}`;

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

  const onNavStateChange = useCallback(
    (navState: any) => {
      setCanGoBack(navState.canGoBack);
      if (navState.title) setCurrentTitle(navState.title);
      if (navState.url) {
        onUrlChange?.(navState.url);
      }
    },
    [onUrlChange]
  );

  return (
    <View style={styles.root}>
      <Appbar.Header mode="small">
        <Appbar.Action icon="close" onPress={onClose} />
        <Appbar.Content title={currentTitle} />
        <Appbar.Action
          icon="arrow-left"
          disabled={!canGoBack}
          onPress={() => webRef.current?.goBack()}
        />
        <Appbar.Action icon="arrow-right" onPress={() => webRef.current?.goForward()} />
        <Appbar.Action icon="refresh" onPress={() => webRef.current?.reload()} />
      </Appbar.Header>

      {progress > 0 && progress < 1 ? <ProgressBar progress={progress} /> : null}

      <WebView
        key={webViewKey}
        ref={webRef}
        source={{ uri: initialUrl }}
        onNavigationStateChange={onNavStateChange}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        onLoadEnd={() => setProgress(0)}
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        onShouldStartLoadWithRequest={() => true}
        renderError={() => (
          <View style={styles.errorBox}>
            <Text>Seite konnte nicht geladen werden.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  errorBox: { padding: 16 },
});
