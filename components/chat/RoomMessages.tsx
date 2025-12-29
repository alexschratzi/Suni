/**
 * RoomMessages.tsx
 * -----------------------------------------------
 * Zeigt alle Nachrichten eines Chat-Raums (Salzburg, Österreich, Wirtschaft).
 *
 * Enthält:
 *  - Back-Button
 *  - Nachrichtenliste (live aus Firestore)
 *  - Reply-Thread-Öffnen via router.push()
 *  - Eingabezeile (TextInput + Send)
 *
 * Props:
 *  - room                → aktueller Raum
 *  - locale              → Datumsformat abhängig von der Sprache
 *  - messages            → Nachrichtenliste
 *  - loading             → ob die Nachrichten geladen werden
 *  - input, setInput     → Textinput State
 *  - inputHeight         → dynamische Höhe
 *  - sendMessage()       → Funktion aus ChatScreen
 *  - onBack()            → Zurück zu den Räumen
 *  - t                   → Übersetzer aus i18n
 *  - theme               → Farben aus Paper
 *  - router              → expo-router Instanz
 *
 * Wird verwendet in:
 *  - ChatScreen.tsx
 *
 * Änderungen / Erweiterungen:
 *  - Nachrichten-Layout ändern → HIER
 *  - Verhalten beim Reply → HIER (openThread)
 *  - Neue Features wie Bilder/Dateien anhängen → im unteren Input-Bereich
 *  - Sende-Logik bleibt in ChatScreen.tsx
 */

import React from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Text,
  useTheme,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";

type RoomKey = "salzburg" | "oesterreich" | "wirtschaft";

type Message = {
  id: string;
  username?: string;
  text: string;
  timestamp?: any; // Firestore Timestamp
};

type Props = {
  room: RoomKey;
  locale: string;
  messages: Message[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  inputHeight: number;
  setInputHeight: (h: number) => void;
  sendMessage: () => void;
  onBack: () => void;
  t: (key: string) => string;
  theme: any;
  router: Router;
  accentColor: string;
};

export default function RoomMessages(props: Props) {
  const {
    room,
    locale,
    messages,
    loading,
    input,
    setInput,
    inputHeight,
    setInputHeight,
    sendMessage,
    onBack,
    t,
    theme,
    router,
    accentColor,
  } = props;

  const roomTitle =
    room === "salzburg"
      ? t("chat.rooms.salzburg.title")
      : room === "oesterreich"
      ? t("chat.rooms.oesterreich.title")
      : t("chat.rooms.wirtschaft.title");

  const openThread = (message: Message) => {
    router.push({
      pathname: "/(app)/reply",
      params: {
        room,
        messageId: message.id,
        messageText: message.text,
        messageUser: message.username ?? "???",
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={110}
    >
      {/* Raum-Header */}
      <View
        style={[
          styles.roomHeader,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={accentColor} />
        </TouchableOpacity>
        <Text style={[styles.roomTitle, { color: theme.colors.onSurface }]}>
          {roomTitle}
        </Text>
      </View>

      {/* Nachrichtenliste */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text
            style={{
              marginTop: 8,
              color: theme.colors.onSurfaceVariant,
            }}
          >
            {t("chat.loadingMessages")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          renderItem={({ item }) => {
            const date = item.timestamp?.toDate
              ? item.timestamp
                  .toDate()
                  .toLocaleString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
              : t("chat.justNow");
            return (
              <TouchableOpacity onPress={() => openThread(item)}>
                <View
                  style={[
                    styles.msgCard,
                    {
                      borderColor: theme.colors.outlineVariant,
                      backgroundColor: theme.colors.elevation.level1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.msgMeta,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {item.username || "???"} • {date}
                  </Text>
                  <Text
                    style={[styles.msgText, { color: theme.colors.onSurface }]}
                  >
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Eingabezeile */}
      <View
        style={[
          styles.inputRow,
          { borderTopColor: theme.colors.outlineVariant },
        ]}
      >
        <TouchableOpacity
          onPress={() => console.log("📎 Attachment upload…")}
          style={styles.attachBtn}
        >
          <Ionicons name="attach" size={22} color={theme.colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              height: inputHeight,
              borderColor: theme.colors.outline,
              color: theme.colors.onSurface,
              backgroundColor: theme.colors.surface,
            },
          ]}
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={input}
          onChangeText={setInput}
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
          }
        />
        <Button
          mode="contained" buttonColor={accentColor}
          onPress={sendMessage}
          disabled={!input.trim()}
          style={{ marginLeft: 6 }}
          contentStyle={{ paddingHorizontal: 14, height: 40 }}
        >
          {t("chat.send")}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  roomTitle: { fontSize: 18, fontWeight: "600", marginLeft: 6 },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  msgCard: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  msgMeta: { fontSize: 12, marginBottom: 2 },
  msgText: { fontSize: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { marginRight: 8, padding: 4 },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    textAlignVertical: "top",
  },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
});
