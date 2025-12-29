import React from "react";
import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Surface, useTheme } from "react-native-paper";

export default function TodosScreen() {
  const theme = useTheme();
  const [todos, setTodos] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (newTodo.trim() === "") return;
    setTodos([...todos, newTodo]);
    setNewTodo("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Surface
        style={{
          flex: 1,
          padding: 20,
          backgroundColor: theme.colors.background,
        }}
      > 

        <TextInput
          mode="outlined"
          label="Neue Aufgabe"
          value={newTodo}
          onChangeText={setNewTodo}
          style={{ marginBottom: 10 }}
        />

        <Button mode="contained" onPress={addTodo}>
          Hinzufügen
        </Button>

        <FlatList
          data={todos}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <Text variant="bodyLarge" style={{ marginTop: 10 }}>
              • {item}
            </Text>
          )}
          style={{ marginTop: 20 }}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}