// components/university/Onboarding.tsx
import * as React from "react";
import { ActivityIndicator, Animated, Easing, Modal, StyleSheet, useWindowDimensions, View } from "react-native";

import { Button, Card, Divider, List, ProgressBar, Text } from "react-native-paper";
import EmbeddedBrowser from "../../screens/EmbeddedBrowser";
import Header from "../ui/Header";
import { fetchCountries, fetchPrograms, fetchUniConfig, fetchUniversities, UniConfig, } from "./uni-login";
import { Country, Program, University, useUniversity } from "./UniversityContext";
import { useResetOnboarding } from "./useResetOnboarding";

export default function Onboarding() {
    const resetOnboarding = useResetOnboarding(); // ✅ get the function

    const { width } = useWindowDimensions();
    const {
        country, university, program,
        setCountry, setUniversity, setProgram,
        step, acknowledgeLogin,
    } = useUniversity();

    const pagerPos = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        Animated.timing(pagerPos, {
            toValue: Math.min(step, 4) - 1,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [step, pagerPos]);

    const [countries, setCountries] = React.useState<Country[]>([]);
    const [universities, setUniversities] = React.useState<University[]>([]);
    const [programs, setPrograms] = React.useState<Program[]>([]);
    const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);
    const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Load countries (once)
    React.useEffect(() => {
        resetOnboarding();
    }, []);


    React.useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchCountries();
                if (!alive) return;
                setCountries(data);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Fehler beim Laden der Länder.");
                setCountries([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    // Load universities for selected country
    React.useEffect(() => {
        let alive = true;
        (async () => {
            if (!country) {
                setUniversities([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const data = await fetchUniversities(country.id);
                if (!alive) return;
                setUniversities(data);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Fehler beim Laden der Universitäten.");
                setUniversities([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [country]);

    React.useEffect(() => {
        let alive = true;
        (async () => {
            if (!university) {
                setPrograms([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const progs = await fetchPrograms(university.id);
                if (!alive) return;
                setPrograms(progs);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Fehler beim Laden der Studiengänge.");
                setPrograms([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [university]);

    React.useEffect(() => {
        let alive = true;
        (async () => {
            if (step < 4 || !university) {
                // Not on login step; ensure we don't block the button logic later
                setUniCfg(null);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const cfg = await fetchUniConfig(university.id);
                if (!alive) return;
                setUniCfg(cfg);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Fehler beim Laden der Uni-Konfiguration.");
                setUniCfg(null);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [step, university]);


    const translateX = pagerPos.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [0, -width, -2 * width, -3 * width],
    });

    const canGoBack = step > 1;
    const onBack = () => {
        if (program) {
            setProgram(null);
            return;
        }
        if (university) {
            setUniversity(null);
            return;
        }
        if (country) {
            setCountry(null);
            return;
        }
    };

    const pct = Math.min(step - 1, 4) / 4;

    return (
        <View style={styles.root}>
            <Header
                title={`Schritt ${Math.min(step, 4)} von 4`}
                canGoBack={canGoBack}
                onBack={onBack}
                rightIcon="backup-restore"                   // circular arrows
                onRightPress={resetOnboarding}               // callback
                rightAccessibilityLabel="Onboarding zurücksetzen"
            />

            <View style={styles.progressWrap}><ProgressBar progress={pct} /></View>

            {loading && (
                <View style={{ padding: 16 }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 8 }}>Daten werden geladen…</Text>
                </View>
            )}

            {error && !loading && (
                <Card style={{ marginHorizontal: 12, marginBottom: 8, padding: 12 }}>
                    <Text>Fehler: {error}</Text>
                </Card>
            )}

            <View style={[styles.pagerFrame, { width }]}>
                <Animated.View style={[styles.pagerRow, { width: width * 4, transform: [{ translateX }] }]}>

                    {/* Step 1 */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="1) Land wählen" />
                            <Card.Content>
                                {countries.map((c) => (
                                    <List.Item
                                        key={c.id}
                                        title={c.name}
                                        left={(props) => <List.Icon {...props}
                                            icon={country?.id === c.id ? "check-circle" : "map"} />}
                                        onPress={() => setCountry(c)}
                                    />
                                ))}
                                {!loading && countries.length === 0 && <Text>Keine Länder verfügbar.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 2 */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="2) Universität wählen" subtitle={country?.name ?? ""} />
                            <Card.Content>
                                {universities.map((u) => (
                                    <List.Item
                                        key={u.id}
                                        title={u.name}
                                        left={(props) => <List.Icon {...props}
                                            icon={university?.id === u.id ? "check-circle" : "school"} />}
                                        onPress={() => setUniversity(u)}
                                    />
                                ))}
                                {!loading && universities.length === 0 && <Text>Keine Universitäten hinterlegt.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 3 */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="3) Studiengang wählen" subtitle={university?.name ?? ""} />
                            <Card.Content>
                                {programs.map((p) => (
                                    <List.Item
                                        key={p.id}
                                        title={p.name}
                                        left={(props) => <List.Icon {...props}
                                            icon={program?.id === p.id ? "check-circle" : "book"} />}
                                        onPress={() => setProgram(p)}
                                    />
                                ))}
                                {!loading && programs.length === 0 && <Text>Keine Studiengänge hinterlegt.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 4 */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="4) Anmeldung" subtitle={university?.name ?? ""} />
                            <Card.Content>
                                <Text>
                                    Anmeldung erfolgt sicher im Browser.
                                </Text>
                                <View style={{ height: 12 }} />
                                <Button
                                    mode="contained"
                                    disabled={!uniCfg?.loginUrl}
                                    onPress={() => uniCfg?.loginUrl && setBrowserUrl(uniCfg.loginUrl)}
                                >
                                    Anmelden ({university?.name})
                                </Button>
                            </Card.Content>
                        </Card>
                    </View>
                </Animated.View>
            </View>

            <Divider />

            <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
                {browserUrl ? (
                    <EmbeddedBrowser
                        initialUrl={browserUrl}
                        title="FH Login"
                        onClose={() => setBrowserUrl(null)}
                        loginDetection={uniCfg?.loginDetection}
                        onLoginDetected={async () => {
                            setBrowserUrl(null);
                            await acknowledgeLogin();
                        }}
                    />
                ) : null}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    pagerFrame: { flex: 1, overflow: "hidden" },
    pagerRow: { flexDirection: "row", flex: 1 },
    progressWrap: { marginHorizontal: 12, marginBottom: 8 },
    page: { flex: 1, padding: 10 },
    card: { marginBottom: 12, backgroundColor: "transparent", elevation: 0, shadowColor: "transparent" },
});
