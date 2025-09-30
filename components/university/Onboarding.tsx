// components/university/Onboarding.tsx
import * as React from "react";
import { Animated, Easing, Modal, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Card, Divider, List, ProgressBar, Text } from "react-native-paper";
import EmbeddedBrowser, { LoginDetectionConfig } from "../../screens/EmbeddedBrowser";
import Header from "../ui/Header";
import { Country, Program, University, useUniversity } from "./UniversityContext";

type UniConfig = { uniId: number; loginUrl?: string; loginDetection?: LoginDetectionConfig };

export default function Onboarding() {
    const { width } = useWindowDimensions();
    const {
        country, university, program,
        setCountry, setUniversity, setProgram,
        step, acknowledgeLogin,
    } = useUniversity();

    const pagerPos = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        const visibleIndex = Math.min(step, 4) - 1;
        Animated.timing(pagerPos, {
            toValue: visibleIndex, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start();
    }, [step, pagerPos]);

    // ---- Microservice fetchers (replace URLs; keep minimal fallback directly above usage)
    const [countries, setCountries] = React.useState<Country[]>([]);
    const [universities, setUniversities] = React.useState<University[]>([]);
    const [programs, setPrograms] = React.useState<Program[]>([]);
    const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

    React.useEffect(() => {
        (async () => {
            try {
                // Example: const res = await fetch("https://api.example.com/countries");
                // const data = await res.json();
                // setCountries(data);
                // ----- Fallback (kept right above the point of need) -----
                setCountries([
                    { id: 1, name: "Österreich" },
                    { id: 2, name: "Deutschland" },
                    { id: 3, name: "Schweiz" },
                ]);
            } catch {
                // optional: show toast/snackbar
            }
        })();
    }, []);

    React.useEffect(() => {
        if (!country) { setUniversities([]); return; }
        (async () => {
            try {
                // const res = await fetch(`https://api.example.com/universities?countryId=${country.id}`);
                // setUniversities(await res.json());
                // ----- Fallback near usage -----
                setUniversities([
                    { id: 123, name: "FH Salzburg", countryId: 1 },
                    { id: 124, name: "Universität Salzburg", countryId: 1 },
                ].filter(u => u.countryId === country.id));
            } catch {
                setUniversities([]);
            }
        })();
    }, [country]);

    React.useEffect(() => {
        if (!university) { setPrograms([]); setUniCfg(null); return; }
        (async () => {
            try {
                // Programs
                // const resP = await fetch(`https://api.example.com/programs?universityId=${university.id}`);
                // setPrograms(await resP.json());
                // ----- Fallback near usage -----
                setPrograms(
                    university.id === 123
                        ? [{ id: 1231, name: "Informationstechnik und Systemmanagement BSc", universityId: 123 }]
                        : []
                );

                // Uni Config (login + detection)
                // const resC = await fetch(`https://api.example.com/unis/${university.id}/config`);
                // setUniCfg(await resC.json());
                // ----- Fallback near usage -----
                if (university.id === 123) {
                    setUniCfg({
                        uniId: 123,
                        loginUrl: "https://login.fh-salzburg.ac.at/",
                        loginDetection: {
                            successHostSuffixes: ["fh-salzburg.ac.at", "office.com", "microsoft.com"],
                            idpHosts: ["login.microsoftonline.com"],
                        },
                    });
                } else {
                    setUniCfg({ uniId: university.id });
                }
            } catch {
                setPrograms([]); setUniCfg(null);
            }
        })();
    }, [university]);

    const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);

    const translateX = pagerPos.interpolate({
        inputRange: [0, 1, 2, 3],
        outputRange: [0, -width, -2 * width, -3 * width],
    });

    const canGoBack = step > 1;
    const onBack = () => {
        if (program) { setProgram(null); return; }
        if (university) { setUniversity(null); return; }
        if (country) { setCountry(null); return; }
    };

    const pct = Math.min(step - 1, 4) / 4;

    return (
        <View style={styles.root}>
            <Header title={`Schritt ${Math.min(step, 4)} von 4`} canGoBack={canGoBack} onBack={onBack} />
            <View style={styles.progressWrap}><ProgressBar progress={pct} /></View>

            <View style={[styles.pagerFrame, { width }]}>
                <Animated.View style={[styles.pagerRow, { width: width * 4, transform: [{ translateX }] }]}>

                    {/* Step 1: Country */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="1) Land wählen" />
                            <Card.Content>
                                {countries.map((c) => (
                                    <List.Item
                                        key={c.id}
                                        title={c.name}
                                        left={(props) => <List.Icon {...props} icon={country?.id === c.id ? "check-circle" : "map"} />}
                                        onPress={() => setCountry(c)}
                                    />
                                ))}
                                {countries.length === 0 && <Text>Keine Länder verfügbar.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 2: University */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="2) Universität wählen" subtitle={country?.name ?? ""} />
                            <Card.Content>
                                {universities.map((u) => (
                                    <List.Item
                                        key={u.id}
                                        title={u.name}
                                        left={(props) => <List.Icon {...props} icon={university?.id === u.id ? "check-circle" : "school"} />}
                                        onPress={() => setUniversity(u)}
                                    />
                                ))}
                                {universities.length === 0 && <Text>Keine Universitäten hinterlegt.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 3: Program */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="3) Studiengang wählen" subtitle={university?.name ?? ""} />
                            <Card.Content>
                                {programs.map((p) => (
                                    <List.Item
                                        key={p.id}
                                        title={p.name}
                                        left={(props) => <List.Icon {...props} icon={program?.id === p.id ? "check-circle" : "book"} />}
                                        onPress={() => setProgram(p)}
                                    />
                                ))}
                                {programs.length === 0 && <Text>Keine Studiengänge hinterlegt.</Text>}
                            </Card.Content>
                        </Card>
                    </View>

                    {/* Step 4: Login */}
                    <View style={[styles.page, { width }]}>
                        <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
                            <Card.Title title="4) Anmeldung" subtitle={university?.name ?? ""} />
                            <Card.Content>
                                <Text>
                                    Anmeldung erfolgt im eingebetteten Browser. Sobald Sie auf eine FH-Seite weitergeleitet wurden,
                                    werden die Schnelllinks freigeschaltet.
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

            {/* Embedded Browser Modal */}
            <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
                {browserUrl && (
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
                )}
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
    card: {
        marginBottom: 12,
        backgroundColor: "transparent",
        elevation: 0,
        shadowColor: "transparent",
    },
});
