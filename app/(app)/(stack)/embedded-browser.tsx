import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import EmbeddedBrowser from "@/components/EmbeddedBrowser/EmbeddedBrowser";

export default function EmbeddedBrowserScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    url?: string;
    title?: string;
    resetToken?: string;
  }>();

  const url = params.url ?? "about:blank";
  const title = params.title ?? "Browser";
  const resetToken = Number(params.resetToken ?? 0);

  return (
      <EmbeddedBrowser
        initialUrl={url}
        title={title}
        resetToken={resetToken}
        onClose={() => router.back()}
      />
  );
}
