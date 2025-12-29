/**
 * chat.tsx (Route Screen)
 * -----------------------------------------------
 * Minimaler Wrapper für das Chat-Modul.
 *
 * Zweck:
 *  - expo-router verlangt eine Datei pro Route
 *  - Diese Datei importiert nur die eigentliche Logik aus components/chat
 *
 * Wird verwendet von:
 *  - Drawer → Tabs → Chat-Tab
 *
 * Änderungen / Erweiterungen:
 *  - Hier sollte man normal NICHTS ändern.
 *  - Wenn du irgendwann mehrere Chat-Routen brauchst (z. B. Gruppenchat),
 *    dann kommen sie in den Ordner hier daneben.
 */

import React from "react";
import ChatScreen from "@/components/chat/ChatScreen";

export default function ChatRoute() {
  return <ChatScreen />;
}
