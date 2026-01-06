// components/university/LinkHub.tsx
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Button, Card, Text, useTheme, Surface } from "react-native-paper";
import { useRouter } from "expo-router";

import Header from "../ui/Header";
import { useUniversity } from "./UniversityContext";
import { LinkHubLink, UniConfig, loadActiveUniConfig } from "./uni-login";
import { useResetOnboarding } from "./useResetOnboarding";
import { scrapeStudentProfile } from "../../src/server/uniScraper";

import {
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

  // uni config for loginUrl (to derive cookie domain)
  const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

  // scraping state + result text
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
        const cached = await loadActiveUniConfig();
        if (!alive) return;

        // Cache missing or belongs to a different uni => user must re-run onboarding login
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

  const cookieDomains = React.useMemo(() => {
    const base: string[] = [
      "https://login.microsoftonline.com",
      "https://login.microsoft.com",
      "https://sts.windows.net",
    ];

    for (const u of uniCfg?.cookieLinks ?? []) {
      try {
        base.push(new URL(u).origin);
      } catch {
        if (typeof u === "string" && u.startsWith("http")) base.push(u);
      }
    }

    // keep loginUrl as fallback domain
    if (uniCfg?.loginUrl) {
      try {
        base.push(new URL(uniCfg.loginUrl).origin);
      } catch {}
    }

    return Array.from(new Set(base));
  }, [uniCfg?.cookieLinks, uniCfg?.loginUrl]);

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
    setScrapeResult("Starte Scraping…");

    try {
      const byOrigin = await collectCookiesByOrigin(cookieDomains);
      const cookiesJson = flattenToCookiesJson(byOrigin);

      const university_id = String(university?.id ?? uniCfg?.uniId ?? "");

      const profile = await scrapeStudentProfile({
        university_id,
        cookies: cookiesJson,
      });

      setScrapeResult(JSON.stringify(profile, null, 2));
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.warn("Scraping error:", msg);
      setScrapeResult("Fehler beim Scraping: " + msg);
    } finally {
      setScraping(false);
    }
  }, [cookieDomains, university, uniCfg]);

  const handleDebugCookies = React.useCallback(async () => {
    try {
      const byOrigin = await collectCookiesByOrigin(cookieDomains);
      const cookiesJson = flattenToCookiesJson(byOrigin);

      // IMPORTANT: prints ONLY the JSON (no banners, no extra lines)
      console.log(JSON.stringify(cookiesJson, null, 2));
    } catch (err: any) {
      console.warn("Cookie Debug Failed:", err?.message || String(err));
    }
  }, [cookieDomains]);

  const handleHardResetBrowserSession = React.useCallback(async () => {
    await clearAllCookies();
    setBrowserResetToken((x) => x + 1);
    setScrapeResult("Browser-Session zurückgesetzt (Cookies + WebView reset).");
  }, []);

  return (
    <Surface style={styles.root}>
      <Header title={`${university?.name ?? "Uni"}:`} />

      {loading ? (
        <Surface style={{ padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Lade Links…</Text>
        </Surface>
      ) : error ? (
        <Card style={{ margin: 12, padding: 16 }}>
          <Text>Fehler beim Laden der Links.</Text>
          <Text selectable style={{ opacity: 0.7, marginTop: 6 }}>
            {error}
          </Text>
        </Card>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.link}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 10 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEmbeddedBrowser(item.link, item.title)}
              style={styles.tilePressable}
            >
              <Surface style={styles.tile}>
                <Text style={styles.tileText}>{item.title}</Text>
              </Surface>
            </Pressable>
          )}
          ListEmptyComponent={
            <Card style={{ margin: 12, padding: 16 }}>
              <Text>Keine Links hinterlegt.</Text>
            </Card>
          }
          ListFooterComponent={
            <Surface style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
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
                mode="outlined"
                style={{ marginTop: 6, marginBottom: 10 }}
                onPress={handleHardResetBrowserSession}
                disabled={scraping}
              >
                Hard Reset: Browser Session
              </Button>

              <Button
                mode="contained"
                onPress={handleStartScraping}
                disabled={scraping || !university}
              >
                {scraping ? "Scraping läuft…" : "Scraping starten"}
              </Button>

              <Surface style={styles.scrapeBox}>
                <ScrollView>
                  <ScrollView horizontal>
                    <Text selectable style={styles.scrapeText}>
                      {scrapeResult}
                    </Text>
                  </ScrollView>
                </ScrollView>
              </Surface>
            </Surface>
          }
        />
      )}

      <Button
        mode="text"
        compact
        style={{ margin: 12 }}
        textColor={theme.colors.error}
        onPress={async () => {
          setLinks([]);
          setUniCfg(null);
          setScrapeResult("Noch keine Daten.");
          await resetOnboarding({ clearCookies: true });
        }}
        accessibilityLabel="Logout"
      >
        Logout
      </Button>
    </Surface>
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
  },
});
