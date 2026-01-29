/**
 * chat.tsx (Stack Route Screen)
 * -----------------------------------------------
 * Deprecated: Chat lives in tabs. This route redirects to the tab.
 */

import React from "react";
import { Redirect } from "expo-router";

export default function ChatRoute() {
  return <Redirect href="/(app)/(stack)/(tabs)/chat" />;
}
