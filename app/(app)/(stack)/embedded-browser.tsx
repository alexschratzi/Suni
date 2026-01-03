import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import EmbeddedBrowser from "@/screens/EmbeddedBrowser";

export default function EmbeddedBrowserScreen() {
  const router = useRouter();
  const { url, title } = useLocalSearchParams<{ url?: string; title?: string }>();

  const initialUrl = typeof url === "string" ? url : "";
  const initialTitle = typeof title === "string" ? title : "Browser";

  return (
    <EmbeddedBrowser
      initialUrl={initialUrl}
      title={initialTitle}
      onClose={() => router.back()}
    />
  );
}
