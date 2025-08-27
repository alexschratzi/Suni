import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { loadLocalUser, saveLocalUser } from "../localUser";

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Firebase User (ÖH)
        if (auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            setUserData(snap.data());
          }
        } else {
          // Lokaler User (Student)
          const localUser = await loadLocalUser();
          if (localUser) setUserData(localUser);
        }
      } catch (err) {
        console.log("Profil laden fehlgeschlagen:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleUpdateUsername = async () => {
    try {
      if (auth.currentUser) {
        // Firebase (ÖH Account)
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { username: newUsername });
        setUserData((prev: any) => ({ ...prev, username: newUsername }));
      } else {
        // Lokaler Student
        const localUser = await loadLocalUser();
        if (localUser) {
          const updated = { ...localUser, username: newUsername };

          // ✅ Email UND Username übergeben
          await saveLocalUser(updated.email, updated.username);

          setUserData(updated);
        }
      }

      setEditVisible(false);
      setNewUsername("");
    } catch (err) {
      console.log("Fehler beim Ändern des Benutzernamens:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Lade Profil...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>❌ Nicht eingeloggt</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={80} color="#1976D2" />
      <Text style={styles.title}>👤 Profil</Text>

      <Text style={styles.text}>📧 E-Mail: {userData.email}</Text>
      <View style={styles.row}>
        <Text style={styles.text}>🆔 Benutzername: {userData.username}</Text>
        <TouchableOpacity onPress={() => setEditVisible(true)}>
          <Ionicons name="pencil" size={20} color="blue" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
      <Text style={styles.text}>🔑 Rolle: {userData.role || "student"}</Text>

      {/* Modal für Benutzernamen ändern */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Benutzernamen ändern</Text>
            <TextInput
              style={styles.input}
              placeholder="Neuer Benutzername"
              value={newUsername}
              onChangeText={setNewUsername}
            />
            <TouchableOpacity style={styles.button} onPress={handleUpdateUsername}>
              <Text style={styles.buttonText}>Speichern</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: "gray" }]} onPress={() => setEditVisible(false)}>
              <Text style={styles.buttonText}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "#f9f9f9" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  text: { fontSize: 18, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: { width: "80%", padding: 20, backgroundColor: "white", borderRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 },
  button: { backgroundColor: "#1976D2", padding: 10, borderRadius: 5, marginTop: 10 },
  buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
});
