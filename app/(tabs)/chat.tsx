import {Ionicons} from "@expo/vector-icons";
import {addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp,} from "firebase/firestore";
import React, {useEffect, useState} from "react";
import {FlatList, KeyboardAvoidingView, Platform, StyleSheet, View,} from "react-native";
import {useRouter} from "expo-router";
import {Button, Card, Divider, IconButton, Text, TextInput, useTheme,} from "react-native-paper";

import {auth, db} from "../../firebase";

const ROOMS = {
    salzburg: "messages_salzburg",
    oesterreich: "messages_oesterreich",
    wirtschaft: "messages_wirtschaft",
} as const;

type RoomKey = keyof typeof ROOMS;

export default function ChatScreen() {
    const router = useRouter();
    const theme = useTheme();

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [username, setUsername] = useState("");
    const [room, setRoom] = useState<RoomKey | null>(null);
    const [inputHeight, setInputHeight] = useState(40);

    // Live username
    useEffect(() => {
        if (!auth.currentUser) return;
        const userRef = doc(db, "users", auth.currentUser.uid);
        const unsubscribe = onSnapshot(userRef, (snap) => {
            if (snap.exists()) setUsername(snap.data().username);
        });
        return () => unsubscribe();
    }, []);

    // Live messages for active room
    useEffect(() => {
        if (!room) return;
        const q = query(collection(db, ROOMS[room]), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((d) => ({id: d.id, ...d.data()}));
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [room]);

    const sendMessage = async () => {
        if (!input.trim() || !room || !username) return;
        try {
            await addDoc(collection(db, ROOMS[room]), {
                username,
                text: input.trim(),
                timestamp: serverTimestamp(),
            });
            setInput("");
            setInputHeight(40);
        } catch (err) {
            console.error("❌ Nachricht konnte nicht gesendet werden:", err);
        }
    };

    const uploadAttachment = async () => {
        // TODO: expo-image-picker / document-picker + Firebase Storage
        console.log("📎 Attachment hochladen…");
    };

    const openThread = (message: any) => {
        if (!room) return;
        router.push({
            pathname: "/reply",
            params: {
                room,
                messageId: message.id,
                messageText: message.text,
                messageUser: message.username,
            },
        });
    };

    if (!room) {
        return (
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <Text variant="titleLarge" style={styles.heading}>
                    💬 Wähle einen Chatroom
                </Text>

                <View style={{gap: 12}}>
                    {(
                        Object.keys(ROOMS) as Array<keyof typeof ROOMS>
                    ).map((key) => (
                        <Card key={key} onPress={() => setRoom(key)}>
                            <Card.Content>
                                <Text variant="titleMedium">
                                    {key === "salzburg"
                                        ? "Salzburg"
                                        : key === "oesterreich"
                                            ? "Österreich"
                                            : "Wirtschaft"}
                                </Text>
                            </Card.Content>
                        </Card>
                    ))}
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={110}
        >
            {/* Header */}
            <View style={styles.headerRow}>
                <IconButton
                    onPress={() => setRoom(null)}
                    accessibilityLabel="Zurück"
                    icon={() => (
                        <Ionicons
                            name="arrow-back"
                            size={22}
                            color={theme.colors.onSurface}
                        />
                    )}
                />
                <Text variant="titleLarge" style={styles.headerTitle}>
                    💬 Chatroom:{" "}
                    {room === "salzburg"
                        ? "Salzburg"
                        : room === "oesterreich"
                            ? "Österreich"
                            : "Wirtschaft"}
                </Text>
            </View>

            {/* Messages */}
            <Card mode="contained" style={{flex: 1}}>
                <Card.Content style={{paddingHorizontal: 0}}>
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        ItemSeparatorComponent={Divider}
                        renderItem={({item}) => {
                            const date = item.timestamp?.toDate
                                ? item.timestamp
                                    .toDate()
                                    .toLocaleString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                : "Gerade eben";

                            return (
                                <Card mode="contained" onPress={() => openThread(item)}
                                      style={{marginHorizontal: 12, marginVertical: 6}}>
                                    <Card.Content>
                                        <Text variant="labelSmall" style={{opacity: 0.7}}>
                                            {item.username || "???"} • {date}
                                        </Text>
                                        <Text variant="bodyMedium" style={{marginTop: 4}}>
                                            {item.text}
                                        </Text>
                                    </Card.Content>
                                </Card>
                            );
                        }}
                    />
                </Card.Content>
            </Card>

            {/* Composer */}
            <View style={styles.inputRow}>
                <IconButton
                    onPress={uploadAttachment}
                    accessibilityLabel="Anhang"
                    icon={() => <Ionicons name="attach" size={22} color={theme.colors.primary}/>}
                />

                <TextInput
                    mode="outlined"
                    multiline
                    placeholder="Nachricht eingeben…"
                    value={input}
                    onChangeText={setInput}
                    onContentSizeChange={(e) =>
                        setInputHeight(Math.max(40, e.nativeEvent.contentSize.height))
                    }
                    style={[styles.input, {height: inputHeight}]}
                />

                <Button
                    mode="contained"
                    onPress={sendMessage}
                    disabled={!input.trim()}
                >
                    Senden
                </Button>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16, gap: 12},
    heading: {marginBottom: 8},
    headerRow: {flexDirection: "row", alignItems: "center"},
    headerTitle: {marginLeft: 4},
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        marginTop: 8,
    },
    input: {
        flex: 1,
    },
});
