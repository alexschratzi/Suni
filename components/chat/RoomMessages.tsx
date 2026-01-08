/**
 * RoomMessages.tsx
 * Shows messages for a public thread and the input bar.
 */

import React from "react";
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { Router } from "expo-router";
import InputBar from "./InputBar";

type RoomKey = "salzburg" | "oesterreich" | "wirtschaft";

type Message = {
  id: string;
  sender?: string;
  username?: string;
  text: string;
  timestamp?: any;
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

  const toDate = (value: any) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof value.toDate === "function") return value.toDate();
    return null;
  };

  const formatTimestamp = (value: any) => {
    const dateValue = toDate(value);
    if (!dateValue) return t("chat.justNow");
    return dateValue.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openThread = (message: Message) => {
    router.push({
      pathname: "/(app)/(stack)/reply",
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
            paddingTop: 12,
            paddingBottom: 12,
          }}
          renderItem={({ item }) => {
            const timeLabel = formatTimestamp(item.timestamp);
            const meta = `${item.username || "???"} - ${timeLabel}`;

            return (
              <TouchableOpacity
                onPress={() => openThread(item)}
                activeOpacity={0.7}
                style={styles.messageRow}
              >
                <View
                  style={[
                    styles.threadCard,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                    numberOfLines={1}
                  >
                    {meta}
                  </Text>
                  <Text style={[styles.msgText, { color: theme.colors.onSurface }]}>
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <InputBar
        input={input}
        setInput={setInput}
        inputHeight={inputHeight}
        setInputHeight={setInputHeight}
        sendMessage={sendMessage}
        placeholder={t("chat.inputPlaceholder")}
        accentColor={accentColor}
      />
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
  messageRow: {
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  threadCard: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    fontSize: 12,
    marginBottom: 6,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 20,
  },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
});
