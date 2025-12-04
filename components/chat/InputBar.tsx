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
import { Button, useTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  input: string;
  setInput: (t: string) => void;
  inputHeight: number;
  setInputHeight: (h: number) => void;
  sendMessage: () => void;
  uploadAttachment?: () => void;
  placeholder: string;
};

export default function InputBar({
  input,
  setInput,
  inputHeight,
  setInputHeight,
  sendMessage,
  uploadAttachment,
  placeholder,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.inputRow,
        { borderTopColor: theme.colors.outlineVariant },
      ]}
    >
      <TouchableOpacity
        onPress={uploadAttachment}
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
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={input}
        onChangeText={setInput}
        multiline
        onContentSizeChange={(e) =>
          setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
        }
      />

      <Button
        mode="contained"
        onPress={sendMessage}
        disabled={!input.trim()}
        style={{ marginLeft: 6 }}
        contentStyle={{ paddingHorizontal: 14, height: 40 }}
      >
        Senden
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginRight: 8,
    textAlignVertical: "top",
  },
});
