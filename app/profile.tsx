import React, {useEffect, useState} from "react";
import {Alert, StyleSheet, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {
    ActivityIndicator,
    Button,
    Card,
    Dialog,
    IconButton,
    Portal,
    Text,
    TextInput,
    useTheme,
} from "react-native-paper";

import {auth, db} from "../firebase";
import {addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where,} from "firebase/firestore";

export default function ProfileScreen() {
    const theme = useTheme();

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

            const q = query(
                collection(db, "usernames"),
                where("username", "==", newUsername)
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
                Alert.alert("Fehler", "Benutzername ist schon vergeben!");
                return;
            }

            // Alten Username freigeben
            if (userData?.username) {
                const oldQ = query(
                    collection(db, "usernames"),
                    where("username", "==", userData.username)
                );
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
            await updateDoc(userRef, {username: newUsername});

            setUserData((prev: any) => ({...prev, username: newUsername}));
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
                <ActivityIndicator animating size="large"/>
                <Text style={{marginTop: 8}}>Profil wird geladen...</Text>
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.center}>
                <Ionicons
                    name="alert-circle-outline"
                    size={60}
                    color={theme.colors.error}
                />
                <Text variant="titleMedium" style={{marginTop: 10}}>Nicht eingeloggt
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Profilkopf */}
            <View style={styles.header}>
                <Ionicons
                    name="person-circle-outline"
                    size={120}
                    color={theme.colors.primary}
                />
                <Text variant="headlineSmall" style={{marginTop: 12}}>
                    Mein Profil
                </Text>
            </View>

            {/* Telefonnummer */}
            <Card style={styles.card}>
                <Card.Title
                    title="Telefonnummer"
                    left={(props) => (
                        <Ionicons
                            name="call-outline"
                            size={22}
                            color={theme.colors.onSurface}
                            style={{marginLeft: 8}}
                        />
                    )}
                />
                <Card.Content>
                    <Text variant="bodyLarge">{userData.phone ?? "—"}</Text>
                </Card.Content>
            </Card>

            {/* Benutzername */}
            <Card style={styles.card}>
                <Card.Title
                    title="Benutzername"
                    left={(props) => (
                        <Ionicons
                            name="person-outline"
                            size={22}
                            color={theme.colors.onSurface}
                            style={{marginLeft: 8}}
                        />
                    )}
                    right={(props) => (
                        <IconButton
                            accessibilityLabel="Benutzernamen bearbeiten"
                            onPress={() => setEditVisible(true)}
                            icon={() => (
                                <Ionicons
                                    name="pencil"
                                    size={20}
                                    color={theme.colors.primary}
                                />
                            )}
                        />
                    )}
                />
                <Card.Content>
                    <Text variant="bodyLarge">{userData.username ?? "—"}</Text>
                </Card.Content>
            </Card>

            {/* Rolle */}
            <Card style={styles.card}>
                <Card.Title
                    title="Rolle"
                    left={(props) => (
                        <Ionicons
                            name="key-outline"
                            size={22}
                            color={theme.colors.onSurface}
                            style={{marginLeft: 8}}
                        />
                    )}
                />
                <Card.Content>
                    <Text variant="bodyLarge">{userData.role ?? "—"}</Text>
                </Card.Content>
            </Card>

            {/* Dialog: Benutzernamen ändern */}
            <Portal>
                <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)}>
                    <Dialog.Title>Benutzernamen ändern</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            mode="outlined"
                            placeholder="Neuer Benutzername"
                            value={newUsername}
                            onChangeText={setNewUsername}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setEditVisible(false)}>Abbrechen</Button>
                        <Button mode="contained" onPress={handleUpdateUsername}>
                            Speichern
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16, gap: 12},
    center: {flex: 1, justifyContent: "center", alignItems: "center"},
    header: {alignItems: "center", marginBottom: 8},
    card: {width: "100%"},
});
