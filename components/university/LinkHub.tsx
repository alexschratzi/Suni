// components/university/LinkHub.tsx
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";


import Header from "../ui/Header";
import { useUniversity } from "./UniversityContext";
import { LinkHubLink, UniConfig, loadActiveUniConfig } from "./uni-login";
import { useResetOnboarding } from "./useResetOnboarding";
import { getCachedStudentProfile, scrapeStudentProfile } from "../../src/server/uniScraper";

import {
  buildCookieOrigins,
  collectCookiesByOrigin,
  flattenToCookiesJson,
  clearAllCookies,
} from "@/components/university/cookies";

type Props = {
  onOpenGrades?: () => void;
};

export default function LinkHub({ onOpenGrades }: Props) {
  const { university } = useUniversity();
  const theme = useTheme();
  const router = useRouter();

  const [links, setLinks] = React.useState<LinkHubLink[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetOnboarding = useResetOnboarding();
  const [browserResetToken, setBrowserResetToken] = React.useState(0);

  const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

  const [scraping, setScraping] = React.useState(false);

  const autoRefreshRef = React.useRef(false);

  const cookieDomains = React.useMemo(() => {
    return buildCookieOrigins({
      cookieLinks: uniCfg?.cookieLinks ?? [],
      loginUrl: uniCfg?.loginUrl ?? null,
      includeMicrosoftDefaults: true,
    });
  }, [uniCfg?.cookieLinks, uniCfg?.loginUrl]);

  // ---- Load links + uni config when university changes ----
  React.useEffect(() => {
    let alive = true;

    async function load() {
      if (!university) {
        setLinks([]);
        setUniCfg(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const cached = await loadActiveUniConfig();
        if (!alive) return;

        if (!cached || cached.uniId !== university.id) {
          setLinks([]);
          setUniCfg(null);
          setError("Keine Uni-Konfiguration im Cache. Bitte erneut anmelden (Onboarding).");
          return;
        }

        setUniCfg(cached);
        setLinks(cached.linkhubLinks ?? []);
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

  const refreshProfileIfNeeded = React.useCallback(async () => {
    if (autoRefreshRef.current) return;
    autoRefreshRef.current = true;

    const university_id = String(university?.id ?? uniCfg?.uniId ?? "");
    if (!university_id) return;

    const cached = await getCachedStudentProfile();
    if (cached) return;

    try {
      const byOrigin = await collectCookiesByOrigin(cookieDomains);
      const cookiesJson = flattenToCookiesJson(byOrigin);

      const profile = await scrapeStudentProfile({
        university_id,
        cookies: cookiesJson,
      });

    } catch (e: any) {
      autoRefreshRef.current = false;
    }
  }, [university?.id, uniCfg?.uniId, cookieDomains]);

  React.useEffect(() => {
    if (!university || !uniCfg) return;
    if (cookieDomains.length === 0) return;
    refreshProfileIfNeeded();
  }, [university, uniCfg, cookieDomains, refreshProfileIfNeeded]);

  const openEmbeddedBrowser = React.useCallback(
    (url: string, title?: string) => {
      router.push({
        pathname: "/(app)/(stack)/embedded-browser",
        params: {
          url,
          title: title ?? "Uni Browser",
          resetToken: String(browserResetToken),
        },
      });
    },
    [router, browserResetToken]
  );

  const handleStartScraping = React.useCallback(async () => {
    if (!university && !uniCfg?.uniId) return;

    setScraping(true);

    try {
      const byOrigin = await collectCookiesByOrigin(cookieDomains);
      const cookiesJson = flattenToCookiesJson(byOrigin);

      const university_id = String(university?.id ?? uniCfg?.uniId ?? "");

      const profile = await scrapeStudentProfile({
        university_id,
        cookies: cookiesJson,
      });

    } catch (e: any) {
      const msg = e?.message || String(e);
      console.warn("Scraping error:", msg);
    } finally {
      setScraping(false);
    }
  }, [cookieDomains, university, uniCfg]);

  const handleDebugCookies = React.useCallback(async () => {
    try {
      const byOrigin = await collectCookiesByOrigin(cookieDomains);
      const cookiesJson = flattenToCookiesJson(byOrigin);
      console.log(JSON.stringify(cookiesJson, null, 2));
    } catch (err: any) {
      console.warn("Cookie Debug Failed:", err?.message || String(err));
    }
  }, [cookieDomains]);

  const handleHardResetBrowserSession = React.useCallback(async () => {
    await clearAllCookies();
    setBrowserResetToken((x) => x + 1);
  }, []);

  const screenBg = theme.colors.background;

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
      <Header title={`${university?.name ?? "Uni"}:`} />

      {loading ? (
        <View style={styles.section}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Lade Links…</Text>
        </View>
      ) : error ? (
        <Card style={[styles.card, { margin: 12, padding: 16 }]}>
          <Text>Fehler beim Laden der Links.</Text>
          <Text selectable style={{ opacity: 0.7, marginTop: 6 }}>
            {error}
          </Text>
        </Card>
      ) : (
        <FlatList
          style={{ backgroundColor: "transparent" }}
          contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
          data={links}
          keyExtractor={(item) => item.link}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEmbeddedBrowser(item.link, item.title)}
              style={styles.tilePressable}
            >
              {/* Use View instead of Surface for deterministic bg */}
              <View style={styles.tile}>
                <Text>{item.title}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Card style={[styles.card, { margin: 12, padding: 16 }]}>
              <Text>Keine Links hinterlegt.</Text>
            </Card>
          }
          ListFooterComponent={
            <View style={styles.section}>
              <Button
                mode="contained"
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
                mode="outlined"
                style={{ marginTop: 6, marginBottom: 10 }}
                onPress={handleHardResetBrowserSession}
                disabled={scraping}
              >
                Debug: Browser Hard Reset
              </Button>

              <Button
                mode="contained"
                style={{ marginTop: 6, marginBottom: 10 }}
                onPress={handleStartScraping}
                disabled={scraping || !university}
              >
                {scraping ? "Debug: Scraping läuft…" : "Debug: Scraping starten"}
              </Button>
              <Button
                mode="outlined"
                style={{ marginTop: 6, marginBottom: 10 }}
                compact
                textColor={theme.colors.error}
                onPress={async () => {
                  setLinks([]);
                  setUniCfg(null);
                  autoRefreshRef.current = false;
                  await resetOnboarding({ clearCookies: true });
                }}
                accessibilityLabel="Logout"
              >
                Debug: Logout
              </Button>
            </View>
          }
        />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  section: { paddingHorizontal: 12, paddingVertical: 8 },

  tilePressable: { flex: 1 },
  tile: {
    flex: 1,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "transparent",
  },

  scrapeBox: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    maxHeight: 220,
    padding: 8,
    backgroundColor: "transparent",
  },

  card: {
    backgroundColor: "transparent",
    elevation: 0,
    shadowColor: "transparent",
  },
});