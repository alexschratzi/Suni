import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (auth.currentUser) {
          const userRef = doc(db, "users", auth.currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) setUserData(snap.data());
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
      if (!newUsername.trim()) {
        Alert.alert("Fehler", "Bitte gib einen Benutzernamen ein.");
        return;
      }

      const q = query(collection(db, "usernames"), where("username", "==", newUsername));
      const existing = await getDocs(q);
      if (!existing.empty) {
        Alert.alert("Fehler", "Benutzername ist schon vergeben!");
        return;
      }

      // Alten Username freigeben
      if (userData?.username) {
        const oldQ = query(collection(db, "usernames"), where("username", "==", userData.username));
        const oldDocs = await getDocs(oldQ);
        for (const d of oldDocs.docs) {
          await deleteDoc(d.ref);
        }
      }

      // Neuen reservieren
      await addDoc(collection(db, "usernames"), {
        username: newUsername,
        uid: auth.currentUser?.uid,
      });

      // In users updaten
      const userRef = doc(db, "users", auth.currentUser!.uid);
      await updateDoc(userRef, { username: newUsername });

      setUserData((prev: any) => ({ ...prev, username: newUsername }));
      setEditVisible(false);
      setNewUsername("");
      Alert.alert("✅ Erfolg", "Benutzername erfolgreich geändert!");
    } catch (err: any) {
      Alert.alert("Fehler", err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text>Profil wird geladen...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="red" />
        <Text style={{ fontSize: 18, marginTop: 10 }}>❌ Nicht eingeloggt</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profil-Icon */}
      <Ionicons name="person-circle-outline" size={120} color="#1976D2" />
      <Text style={styles.title}>Mein Profil</Text>

      {/* Karte: Telefonnummer */}
      <View style={styles.card}>
        <Ionicons name="call-outline" size={22} color="#1976D2" style={styles.cardIcon} />
        <Text style={styles.cardText}>Telefonnummer: {userData.phone}</Text>
      </View>

      {/* Karte: Benutzername */}
      <View style={styles.cardRow}>
        <Ionicons name="person-outline" size={22} color="#1976D2" style={styles.cardIcon} />
        <Text style={styles.cardText}>Benutzername: {userData.username}</Text>
        <TouchableOpacity onPress={() => setEditVisible(true)}>
          <Ionicons name="pencil" size={20} color="#1976D2" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>

      {/* Karte: Rolle */}
      <View style={styles.card}>
        <Ionicons name="key-outline" size={22} color="#1976D2" style={styles.cardIcon} />
        <Text style={styles.cardText}>Rolle: {userData.role}</Text>
      </View>

      {/* Modal für Benutzernamen ändern */}
      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Benutzernamen ändern</Text>
            <TextInput
              style={styles.input}
              placeholder="Neuer Benutzername"
              value={newUsername}
              onChangeText={setNewUsername}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, styles.saveBtn]} onPress={handleUpdateUsername}>
                <Text style={styles.buttonText}>Speichern</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={() => setEditVisible(false)}>
                <Text style={styles.buttonText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center", padding: 20, backgroundColor: "#F5F9FF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold", marginVertical: 15, color: "#0D47A1" },

  // Karten-Styling
  card: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: { marginRight: 10 },
  cardText: { fontSize: 16, flexShrink: 1 },

  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: { width: "85%", padding: 20, backgroundColor: "white", borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
  button: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 5 },
  saveBtn: { backgroundColor: "#1976D2" },
  cancelBtn: { backgroundColor: "gray" },
  buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
});
