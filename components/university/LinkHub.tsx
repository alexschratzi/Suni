import * as React from "react";
import {ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View} from "react-native";
import {Button, Card, Text} from "react-native-paper";
import EmbeddedBrowser from "../../screens/EmbeddedBrowser";
import Header from "../ui/Header";
import {useUniversity} from "./UniversityContext";
import {fetchUniLinks, LinkItem} from "./uni-login";
import {useResetOnboarding} from "./useResetOnboarding";

export default function LinkHub() {
    const {university} = useUniversity();
    const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);
    const [links, setLinks] = React.useState<LinkItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const resetOnboarding = useResetOnboarding();

    React.useEffect(() => {
        let alive = true;

        async function load() {
            if (!university) {
                setLinks([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const res = await fetchUniLinks(university.id);
                if (!alive) return;
                setLinks(res.links ?? []);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Request failed");
                setLinks([]);
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [university]);

    return (
        <View style={styles.root}>
            <Header title={`${university?.name ?? "Uni"}:`}/>

            {loading ? (
                <View style={{padding: 16}}>
                    <ActivityIndicator/>
                    <Text style={{marginTop: 8}}>Lade Links…</Text>
                </View>
            ) : error ? (
                <Card style={{margin: 12, padding: 16}}>
                    <Text>Fehler beim Laden der Links.</Text>
                    <Text selectable style={{opacity: 0.7, marginTop: 6}}>{error}</Text>
                </Card>
            ) : (
                <FlatList
                    data={links}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={{gap: 12, paddingHorizontal: 10}}
                    contentContainerStyle={{gap: 12, paddingVertical: 10}}
                    renderItem={({item}) => (
                        <Pressable onPress={() => setBrowserUrl(item.url)} style={styles.tilePressable}>
                            <View style={styles.tile}><Text style={styles.tileText}>{item.title}</Text></View>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <Card style={{margin: 12, padding: 16}}>
                            <Text>Keine Links hinterlegt.</Text>
                        </Card>
                    }
                />
            )}

            <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
                {browserUrl ? (
                    <EmbeddedBrowser initialUrl={browserUrl} title="FH Browser" onClose={() => setBrowserUrl(null)}/>
                ) : null}
            </Modal>

            <Button
                mode="text"
                compact
                style={{margin: 12}}
                textColor="#d32f2f"        // optional: red-ish logout
                onPress={async () => {
                    setBrowserUrl(null);
                    setLinks([]);
                    await resetOnboarding({clearCookies: true});
                }}
                accessibilityLabel="Logout"
            >
                Logout
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {flex: 1},
    tilePressable: {flex: 1},
    tile: {
        flex: 1, minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)",
        alignItems: "center", justifyContent: "center", padding: 12,
    },
    tileText: {fontSize: 16, fontWeight: "600"},
});
