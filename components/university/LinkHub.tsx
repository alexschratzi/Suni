// components/university/LinkHub.tsx
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
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

import HubTile from "./HubTile";

export default function LinkHub() {
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

    const ensureProfile = React.useCallback(
    async (opts?: { force?: boolean; setBusy?: boolean }) => {
      const force = Boolean(opts?.force);
      const setBusy = Boolean(opts?.setBusy);

      const university_id = String(university?.id ?? uniCfg?.uniId ?? "");
      if (!university_id) return null;

      if (setBusy) setScraping(true);
      try {
        if (!force) {
          const cached = await getCachedStudentProfile();
          if (cached) return cached;
        }

        const byOrigin = await collectCookiesByOrigin(cookieDomains);
        const cookiesJson = flattenToCookiesJson(byOrigin);

        const profile = await scrapeStudentProfile({
          university_id,
          cookies: cookiesJson,
        });

        return profile;
      } finally {
        if (setBusy) setScraping(false);
      }
    },
    [university?.id, uniCfg?.uniId, cookieDomains]
  );

  React.useEffect(() => {
    let alive = true;
    if (!university || !uniCfg) return;

    (async () => {
      setScraping(true);
      try {
        await ensureProfile();
      } catch (e) {
        console.warn("Auto profile load failed", e);
      } finally {
        if (alive) setScraping(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [university, uniCfg, ensureProfile]);

  const handleOpenGrades = React.useCallback(async () => {
    if (scraping) return;
    try {
      await ensureProfile({ force: false, setBusy: true }); // blocks UI + disables button
      router.push("/(app)/(stack)/grades");
    } catch (e: any) {
      console.warn("Open grades failed:", e?.message || String(e));
    }
  }, [ensureProfile, router, scraping]);

  const handleStartScraping = React.useCallback(async () => {
    if (scraping) return;
    try {
      await ensureProfile({ force: true, setBusy: true }); // force refresh
    } catch (e: any) {
      console.warn("Scraping error:", e?.message || String(e));
    }
  }, [ensureProfile, scraping]);

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
    setBrowserResetToken((x) => x + 1); // keep if you still use it
  }, []);

  const data = React.useMemo(() => {
    // Put “Grades” tile first, then the linkhub links
    const items: Array<{ kind: "grades" } | { kind: "link"; link: LinkHubLink }> = [
      { kind: "grades" },
      ...links.map((l) => ({ kind: "link" as const, link: l })),
    ];
    return items;
  }, [links]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Header title={`${university?.name ?? "Uni"}`} />

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
          data={data}
          keyExtractor={(item, idx) =>
            item.kind === "grades" ? "grades" : `link:${item.link.link}:${idx}`
          }
          numColumns={1}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.kind === "grades") {
              return (
                <View>
                  <HubTile
                    title={scraping ? "Noten werden geladen…" : "Noten / Leistungen"}
                    subtitle="Aktuelle Kurse & Bewertungen abrufen"
                    icon="school"
                    onPress={handleOpenGrades}
                    disabled={!university || scraping}
                  />
                </View>
              );
            }

            return (
              <View>
                <HubTile
                  title={item.link.title}
                  icon="open-in-new"
                  onPress={() => openEmbeddedBrowser(item.link.link, item.link.title)}
                  disabled={!item.link.link}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <Card style={[styles.card, { margin: 12, padding: 16 }]}>
              <Text>Keine Links hinterlegt.</Text>
            </Card>
          }
          ListFooterComponent={
            __DEV__ ? (
              <View style={styles.devSection}>
                <HubTile
                  title="DEV: Cookies anzeigen"
                  subtitle="console.log"
                  icon="bug"
                  onPress={handleDebugCookies}
                />

                <HubTile
                  title="DEV: Cookies löschen"
                  subtitle="Hard Reset"
                  icon="delete"
                  onPress={handleHardResetBrowserSession}
                />

                <HubTile
                  title={scraping ? "DEV: Scraping…" : "DEV: Scraping starten"}
                  subtitle="Profil neu abrufen"
                  icon="cloud-download"
                  onPress={handleStartScraping}
                  disabled={scraping}
                />

                <HubTile
                  title="DEV: Logout"
                  subtitle="Reset onboarding"
                  icon="logout"
                  onPress={async () => {
                    setLinks([]);
                    setUniCfg(null);
                    autoRefreshRef.current = false;
                    await resetOnboarding({ clearCookies: true });
                  }}
                />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 12, paddingVertical: 8 },
  card: { backgroundColor: "transparent", elevation: 0, shadowColor: "transparent" },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  devSection: {
    marginTop: 12,
    gap: 12,
  },
});