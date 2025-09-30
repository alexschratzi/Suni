// components/university/LinkHub.tsx
import * as React from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import EmbeddedBrowser from "../../screens/EmbeddedBrowser";
import Header from "../ui/Header";
import { useUniversity } from "./UniversityContext";

type LinkItem = { id: string; title: string; url: string };

export default function LinkHub() {
    const { university } = useUniversity();
    const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);
    const [links, setLinks] = React.useState<LinkItem[]>([]);

    React.useEffect(() => {
        if (!university) { setLinks([]); return; }
        (async () => {
            try {
                // const res = await fetch(`https://api.example.com/unis/${university.id}/links`);
                // setLinks(await res.json());
                // ----- Fallback right above usage -----
                setLinks(
                    university.id === 123
                        ? [
                            { id: "outlook", title: "Outlook", url: "https://outlook.office.com/mail/" },
                            { id: "myfhs", title: "myFHS", url: "https://myfhs.fh-salzburg.ac.at/#all-updates" },
                            { id: "jobrouter", title: "JobRouter", url: "https://jobrouter.fhs.fh-salzburg.ac.at/" },
                            { id: "moodle", title: "Moodle", url: "https://elearn.fh-salzburg.ac.at/my/" },
                            { id: "fhsys", title: "FHSYS", url: "https://fhsys.fh-salzburg.ac.at/" },
                        ]
                        : []
                );
            } catch {
                setLinks([]);
            }
        })();
    }, [university]);

    return (
        <View style={styles.root}>
            <Header title={`${university?.name ?? "Uni"}: Schnellzugriff`} />
            <FlatList
                data={links}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: 12, paddingHorizontal: 10 }}
                contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
                renderItem={({ item }) => (
                    <Pressable onPress={() => setBrowserUrl(item.url)} style={styles.tilePressable}>
                        <View style={styles.tile}>
                            <Text style={styles.tileText}>{item.title}</Text>
                        </View>
                    </Pressable>
                )}
                ListEmptyComponent={<Card style={{ margin: 12, padding: 16 }}><Text>Keine Links hinterlegt.</Text></Card>}
            />

            <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
                {browserUrl ? (
                    <EmbeddedBrowser initialUrl={browserUrl} title="FH Browser" onClose={() => setBrowserUrl(null)} />
                ) : null}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    tilePressable: { flex: 1 },
    tile: {
        flex: 1,
        minHeight: 80,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.12)",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
    },
    tileText: { fontSize: 16, fontWeight: "600" },
});
