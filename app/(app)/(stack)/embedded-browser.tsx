// app/(app)/(stack)
import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import EmbeddedBrowser from "@/components/EmbeddedBrowser/EmbeddedBrowser";

export default function EmbeddedBrowserScreen() {
  const router = useRouter();
  const { url, title, resetToken } = useLocalSearchParams<{
    url?: string;
    title?: string;
    resetToken?: string;
  }>();

  const initialUrl = typeof url === "string" ? url : "";
  const initialTitle = typeof title === "string" ? title : "Browser";

  const tokenNum =
    typeof resetToken === "string" && resetToken.length > 0
      ? Number(resetToken)
      : 0;

  return (
    <EmbeddedBrowser
      initialUrl={initialUrl}
      title={initialTitle}
      onClose={() => router.back()}
      resetToken={Number.isFinite(tokenNum) ? tokenNum : 0}
    />
  );
}