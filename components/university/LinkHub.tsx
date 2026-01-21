// components/university/LinkHub.tsx
import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";

import { useUniversity } from "./UniversityContext";
import {
  LinkHubLink,
  UniConfig,
  loadActiveUniConfig,
  fetchUniConfig,
} from "./uni-login";
import { useResetOnboarding } from "./useResetOnboarding";
import { getCachedStudentProfile, scrapeStudentProfile } from "../../src/server/uniScraper";

import {
  buildCookieOrigins,
  collectCookiesByOrigin,
  flattenToCookiesJson,
  clearAllCookies,
} from "@/components/university/cookies";

import HubTile from "./HubTile";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_LAST_FORCED_SCRAPE_TS = "uni:last_forced_profile_scrape_ts";
const ONE_HOUR_MS = 60 * 60 * 1000;

async function canForceScrapeNow(): Promise<{
  allowed: boolean;
  waitMs: number;
  lastTs: number | null;
}> {
  const raw = await AsyncStorage.getItem(KEY_LAST_FORCED_SCRAPE_TS);
  const lastTs = raw ? Number(raw) : null;

  if (!lastTs || !Number.isFinite(lastTs)) {
    return { allowed: true, waitMs: 0, lastTs: null };
  }

  const elapsed = Date.now() - lastTs;
  const waitMs = Math.max(0, ONE_HOUR_MS - elapsed);

  return { allowed: waitMs === 0, waitMs, lastTs };
}

async function markForcedScrapeNow(): Promise<void> {
  await AsyncStorage.setItem(KEY_LAST_FORCED_SCRAPE_TS, String(Date.now()));
}

export default function LinkHub() {
  const { university } = useUniversity();
  const theme = useTheme();
  const router = useRouter();

  const [links, setLinks] = React.useState<LinkHubLink[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const resetOnboarding = useResetOnboarding();
  const [browserResetToken, setBrowserResetToken] = React.useState(0);

  const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

  const [scraping, setScraping] = React.useState(false);

  const autoRefreshRef = React.useRef(false);
  const refreshBusyRef = React.useRef(false);

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

        markForcedScrapeNow();

        return profile;
      } finally {
        if (setBusy) setScraping(false);
      }
    },
    [university?.id, uniCfg?.uniId, cookieDomains]
  );

  const onRefresh = React.useCallback(async () => {
    if (!university?.id) return;
    if (refreshBusyRef.current) return;

    refreshBusyRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      // 1) refetch uni config + update cache
      const cfg = await fetchUniConfig(university.id);
      setUniCfg(cfg);
      setLinks(cfg.linkhubLinks ?? []);

      const gate = await canForceScrapeNow();
      if (gate.allowed) {
        await ensureProfile({ force: true, setBusy: true });
      }
    } catch (e: any) {
      setError(e?.message ?? "Fehler beim Aktualisieren.");
    } finally {
      setRefreshing(false);
      refreshBusyRef.current = false;
    }
  }, [university?.id, ensureProfile]);

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
      await ensureProfile({ force: false, setBusy: true });
      router.push("/(app)/(stack)/grades");
    } catch (e: any) {
      console.warn("Open grades failed:", e?.message || String(e));
    }
  }, [ensureProfile, router, scraping]);

  const handleStartScraping = React.useCallback(async () => {
    if (scraping) return;
    try {
      await ensureProfile({ force: true, setBusy: true });
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
    setBrowserResetToken((x) => x + 1);
  }, []);

  const data = React.useMemo(() => {
    return [
      { kind: "grades" as const },
      ...links.map((l) => ({ kind: "link" as const, link: l })),
    ];
  }, [links]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            if (item.kind === "grades") {
              return (
                <HubTile
                  title={scraping ? "Noten werden geladen…" : "Noten / Leistungen"}
                  subtitle="Aktuelle Kurse & Bewertungen abrufen"
                  icon="school"
                  onPress={handleOpenGrades}
                  disabled={!university || scraping}
                />
              );
            }

            return (
              <HubTile
                title={item.link.title}
                icon="open-in-new"
                onPress={() => openEmbeddedBrowser(item.link.link, item.link.title)}
                disabled={!item.link.link}
              />
            );
          }}
          ListEmptyComponent={
            <Card style={[styles.card, { margin: 12, padding: 16 }]}>
              <Text>Keine Links hinterlegt.</Text>
            </Card>
          }
          ListFooterComponent={
            false ? (
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