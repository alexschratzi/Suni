import * as React from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import EmbeddedBrowser from "../../screens/EmbeddedBrowser";
import Header from "../ui/Header";
import { useUniversity } from "./UniversityContext";
import {
    fetchUniLinks,
    fetchUniConfig,
    LinkItem,
    UniConfig,
} from "./uni-login";
import { useResetOnboarding } from "./useResetOnboarding";
import CookieManager from "@react-native-cookies/cookies";

import {
    CookieJsonRecord,
    scrapeStudentProfile,
} from "../../src/server/uniScraper"; // adjust relative path as needed#
import { router } from "expo-router";

type Props = {
  onOpenGrades?: () => void;
};

export default function LinkHub({ onOpenGrades }: Props) {
    const { university } = useUniversity();
    const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);
    const [links, setLinks] = React.useState<LinkItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const resetOnboarding = useResetOnboarding();

    // NEW: uni config for loginUrl (to derive cookie domain)
    const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

    // NEW: scraping state + result text
    const [scraping, setScraping] = React.useState(false);
    const [scrapeResult, setScrapeResult] = React.useState<string>("Noch keine Daten.");



    // ---- Load links + uni config when university changes ----
    React.useEffect(() => {
        let alive = true;

        async function load() {
            if (!university) {
                setLinks([]);
                setUniCfg(null);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const [linksRes, cfgRes] = await Promise.all([
                    fetchUniLinks(university.id),
                    fetchUniConfig(university.id)
                ]);

                if (!alive) return;

                setLinks(linksRes.links ?? []);
                setUniCfg(cfgRes);
            } catch (e: any) {
                if (!alive) return;
                setError(e?.message ?? "Request failed");
                setLinks([]);
                setUniCfg(null);
            } finally {
                if (alive) setLoading(false);
            }
        }

        load();
        return () => {
            alive = false;
        };
    }, [university]);

    // ---- Cookie helpers (adapted from your POC) ----

    // which domains to read cookies from
    const cookieDomains = React.useMemo(() => {
        const base: string[] = [
            "https://login.microsoftonline.com",
            "https://login.microsoft.com",
            "https://sts.windows.net",
        ];

        if (uniCfg?.loginUrl) {
            try {
                const origin = new URL(uniCfg.loginUrl).origin;
                base.push(origin); // e.g. https://login.fh-salzburg.ac.at
            } catch {
                // ignore
            }
        }

        return base;
    }, [uniCfg?.loginUrl]);

    const relevantName = React.useCallback((name: string) => {
        const n = name.toLowerCase();
        return (
            n.startsWith("_shibsession_") ||
            n.startsWith("_shibstate_") ||
            n.startsWith("estsauth") || // ESTSAUTH, ESTSAUTHPERSISTENT, ESTSAUTHLIGHT
            n.startsWith("esctx") || // esctx, esctx-*
            n === "buid" ||
            n === "msfpc" ||
            n === "mc1" ||
            n === "ms0" ||
            n === "portal_version"
        );
    }, []);

    const collectCookies = React.useCallback(async (): Promise<Record<string, CookieJsonRecord>> => {
        const merged: Record<string, CookieJsonRecord> = {};

        for (const d of cookieDomains) {
            try {
                const got = await CookieManager.get(d);
                if (!got) continue;

                for (const [name, c] of Object.entries(got)) {
                    const cookieAny = c as any;
                    merged[name] = {
                        name,
                        value: String(cookieAny?.value ?? ""),
                        path: cookieAny?.path ?? "/",
                        secure: Boolean(cookieAny?.secure ?? true),
                        httpOnly: Boolean(cookieAny?.httpOnly ?? true),
                        domain: cookieAny?.domain ?? null,
                    };
                }
            } catch (err) {
                console.warn("Cookie fetch error for", d, err);
            }
        }

        return merged;
    }, [cookieDomains]);

    const buildCookiesJson = React.useCallback(
        (src: Record<string, CookieJsonRecord>, onlyRelevant: boolean) => {
            const out: Record<string, CookieJsonRecord> = {};
            for (const [name, rec] of Object.entries(src)) {
                if (!onlyRelevant || relevantName(name)) {
                    out[name] = {
                        httpOnly: Boolean(rec.httpOnly),
                        path: rec.path ?? "/",
                        value: String(rec.value ?? ""),
                        secure: Boolean(rec.secure),
                        domain: rec.domain ?? null,
                        name,
                    };
                }
            }
            return out;
        },
        [relevantName]
    );

    const prettyJson = (txt: string | null) => {
        if (!txt) return "";
        try {
            return JSON.stringify(JSON.parse(txt), null, 2);
        } catch {
            return txt; // fallback
        }
    };


    const handleStartScraping = React.useCallback(async () => {
        if (!university && !uniCfg?.uniId) return;

        setScraping(true);
        setScrapeResult("Starte Scraping…");

        try {
            const merged = await collectCookies();
            const cookiesJson = buildCookiesJson(merged, true);
            const university_id = String(university?.id ?? uniCfg?.uniId ?? "");

            const profile = await scrapeStudentProfile({
                university_id,
                cookies: cookiesJson,
            });

            // For now: display profile JSON
            setScrapeResult(JSON.stringify(profile, null, 2));

            // Later: store in some global profile context instead of scrapeResult
        } catch (e: any) {
            const msg = e?.message || String(e);
            console.warn("Scraping error:", msg);
            setScrapeResult("Fehler beim Scraping: " + msg);
        } finally {
            setScraping(false);
        }
    }, [collectCookies, buildCookiesJson, university, uniCfg]);




    const handleDebugCookies = React.useCallback(async () => {
        console.log("========== COOKIE DEBUG ==========");

        try {
            // collect all cookies
            const merged = await collectCookies();
            const cookiesJson = buildCookiesJson(merged, false); // ALL cookies, not only relevant!

            const cookieCount = Object.keys(cookiesJson).length;

            console.log(`Cookies Count: ${cookieCount}`);
            console.log(`Websites for cookies:`);
            cookieDomains.forEach((d) => console.log(` - ${d}`));

            console.log(`\nCookies:\n----- COOKIES.JSON BEGIN -----`);
            console.log(JSON.stringify(cookiesJson, null, 2));
            console.log("----- COOKIES.JSON END -----");

        } catch (err: any) {
            console.warn("Cookie Debug Failed:", err?.message || String(err));
        }

        console.log("=================================\n");
    }, [collectCookies, buildCookiesJson, cookieDomains]);

    return (
        <View style={styles.root}>
            <Header title={`${university?.name ?? "Uni"}:`} />

            {/* main content */}
            {loading ? (
                <View style={{ padding: 16 }}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 8 }}>Lade Links…</Text>
                </View>
            ) : error ? (
                <Card style={{ margin: 12, padding: 16 }}>
                    <Text>Fehler beim Laden der Links.</Text>
                    <Text selectable style={{ opacity: 0.7, marginTop: 6 }}>{error}</Text>
                </Card>
            ) : (
                <FlatList
                    data={links}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 12, paddingHorizontal: 10 }}
                    contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => setBrowserUrl(item.url)}
                            style={styles.tilePressable}
                        >
                            <View style={styles.tile}>
                                <Text style={styles.tileText}>{item.title}</Text>
                            </View>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <Card style={{ margin: 12, padding: 16 }}>
                            <Text>Keine Links hinterlegt.</Text>
                        </Card>
                    }
                    ListFooterComponent={
                        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                            <Button
                                mode="outlined"
                                style={{ marginBottom: 10 }}
                                onPress={onOpenGrades}
                                disabled={!university}
                                >
                                Noten
                            </Button>
                            <Button
                                mode="outlined"
                                style={{ marginTop: 6, marginBottom: 10 }}
                                onPress={handleDebugCookies}
                                disabled={scraping}
                            >
                                Debug: Cookies anzeigen
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleStartScraping}
                                disabled={scraping || !university}
                            >
                                {scraping ? "Scraping läuft…" : "Scraping starten"}
                            </Button>

                            {/* NEW: scrollable response view */}
                            <View style={styles.scrapeBox}>
                                <ScrollView>
                                    <ScrollView horizontal>
                                        <Text
                                            selectable
                                            style={styles.scrapeText}
                                        >
                                            {scrapeResult}
                                        </Text>
                                    </ScrollView>
                                </ScrollView>
                            </View>
                        </View>
                    }

                />
            )}

            <Modal
                visible={!!browserUrl}
                animationType="slide"
                onRequestClose={() => setBrowserUrl(null)}
            >
                {browserUrl ? (
                    <EmbeddedBrowser
                        initialUrl={browserUrl}
                        title="FH Browser"
                        onClose={() => setBrowserUrl(null)}
                    />
                ) : null}
            </Modal>

            <Button
                mode="text"
                compact
                style={{ margin: 12 }}
                textColor="#d32f2f"
                onPress={async () => {
                    setBrowserUrl(null);
                    setLinks([]);
                    setUniCfg(null);
                    setScrapeResult("Noch keine Daten.");
                    await resetOnboarding({ clearCookies: true });
                }}
                accessibilityLabel="Logout"
            >
                Logout
            </Button>
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

    // NEW: scraping result box
    scrapeBox: {
        marginTop: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.12)",
        maxHeight: 220,
        padding: 8,
        backgroundColor: "#fafafa",
    },
    scrapeText: {
        fontSize: 12,
        lineHeight: 16,
        // if you have a monospaced font:
        // fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    },
});
