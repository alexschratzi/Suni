/**
 * InputBar.tsx
 *
 * Diese Komponente ist die Text-Eingabeleiste des Chats.
 * 
 * Enthält:
 *   - Attachment-Button (Platzhalter für spätere Uploads)
 *   - dynamisch mitwachsendes TextInput
 *   - Senden-Button
 * 
 * Vorteile der Auslagerung:
 *   - Wiederverwendbar in RoomMessages & Reply-Screen
 *   - Sauberer Code, weniger Wiederholungen
 *   - Leichter erweiterbar (Emojis, Uploads, Sprachnachrichten etc.)
 * 
 * Wird verwendet von:
 *   - RoomMessages.tsx
 */


import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  input: string;
  setInput: (t: string) => void;
  inputHeight: number;
  setInputHeight: (h: number) => void;
  sendMessage: () => void;
  uploadAttachment?: () => void;
  placeholder: string;
  accentColor?: string;
};

export default function InputBar({
  input,
  setInput,
  inputHeight,
  setInputHeight,
  sendMessage,
  uploadAttachment,
  placeholder,
  accentColor,
}: Props) {
  const theme = useTheme();
  const canSend = input.trim().length > 0;
  const sendColor = accentColor || theme.colors.primary;
  const attachmentEnabled = typeof uploadAttachment === "function";

  return (
    <View
      style={[
        styles.inputRow,
        {
          borderTopColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrap,
          {
            borderColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          onPress={uploadAttachment}
          disabled={!attachmentEnabled}
          style={[styles.attachBtn, !attachmentEnabled && styles.attachDisabled]}
        >
          <Ionicons name="attach" size={20} color={theme.colors.primary} />
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            {
              height: Math.min(120, Math.max(40, inputHeight)),
              color: theme.colors.onSurface,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={input}
          onChangeText={setInput}
          multiline
          onContentSizeChange={(e) =>
            setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
          }
        />
      </View>

      <TouchableOpacity
        onPress={sendMessage}
        disabled={!canSend}
        style={[
          styles.sendButton,
          {
            backgroundColor: sendColor,
            opacity: canSend ? 1 : 0.5,
          },
        ]}
      >
        <Ionicons name="send" size={18} color={theme.colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  attachBtn: { padding: 6 },
  attachDisabled: { opacity: 0.4 },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
});
