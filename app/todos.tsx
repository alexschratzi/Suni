import { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";

export default function TodosScreen() {
  const [todos, setTodos] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState("");

  const addTodo = () => {
    if (newTodo.trim() === "") return;
    setTodos([...todos, newTodo]);
    setNewTodo("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>✅ To-Do Liste</Text>
      <TextInput
        style={styles.input}
        placeholder="Neue Aufgabe..."
        value={newTodo}
        onChangeText={setNewTodo}
      />
      <Button title="Hinzufügen" onPress={addTodo} />

      <FlatList
        data={todos}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.todo}>• {item}</Text>}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  todo: { fontSize: 18, marginBottom: 5 },
});
