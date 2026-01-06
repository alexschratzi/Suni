// components/university/Onboarding.tsx
// FIXME The Onboarding with the login for the universities is currently really glitchy, it closes the browser window in about 2 seconds during the login attempt and assumes that you are already logged in.
import * as React from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Card, Divider, List, ProgressBar, Text } from "react-native-paper";
import CookieManager from "@react-native-cookies/cookies";

import EmbeddedBrowser from "../../components/EmbeddedBrowser/EmbeddedBrowser";
import Header from "../ui/Header";

import { fetchCountries, fetchUniConfig, fetchUniversities, UniConfig } from "./uni-login";
import { Country, University, useUniversity } from "./UniversityContext";
import { useResetOnboarding } from "./useResetOnboarding";
import { checkLoginWithBackend } from "@/src/server/uniScraper";

type CookieJsonRecord = {
  httpOnly: boolean;
  path: string;
  value: string;
  secure: boolean;
  domain: string | null;
  name: string;
};

export type CookiesByOrigin = Record<string, Record<string, CookieJsonRecord>>;

export default function Onboarding() {
  const resetOnboarding = useResetOnboarding();
  const { width } = useWindowDimensions();

  const {
    country,
    university,
    setCountry,
    setUniversity,
    step,
    acknowledgeLogin,
  } = useUniversity();

  const TOTAL_STEPS = 3;

  const pagerPos = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(pagerPos, {
      toValue: Math.min(step, TOTAL_STEPS) - 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, pagerPos]);

  const [countries, setCountries] = React.useState<Country[]>([]);
  const [universities, setUniversities] = React.useState<University[]>([]);
  const [uniCfg, setUniCfg] = React.useState<UniConfig | null>(null);

  const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ---- cookie polling state ----
  const pollTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = React.useRef(false);
  const [browserResetToken, setBrowserResetToken] = React.useState(0);
  const lastFpRef = React.useRef<string>("");
  const checkingRef = React.useRef(false);

  function cookieFingerprint(cookiesByOrigin: CookiesByOrigin): string {
    const origins = Object.keys(cookiesByOrigin).sort();

    return origins
      .map((origin) => {
        const cookies = cookiesByOrigin[origin] || {};
        const names = Object.keys(cookies).sort();

        const fpPart = names
          .map((name) => {
            const v = cookies[name]?.value ?? "";
            const head = v.slice(0, 8);
            return `${name}:${v.length}:${head}`;
          })
          .join(",");

        return `${origin}=>${fpPart}`;
      })
      .join("|");
  }
  // Build list of origins we want cookies from:
  const cookieDomains = React.useMemo(() => {
    const base: string[] = [];

    // cookie links from DB (expected: list of urls/domains)
    for (const u of uniCfg?.cookieLinks ?? []) {
      try {
        base.push(new URL(u).origin);
      } catch {
        // allow raw origins already
        if (typeof u === "string" && u.startsWith("http")) base.push(u);
      }
    }

    // include loginUrl origin as fallback
    if (uniCfg?.loginUrl) {
      try {
        base.push(new URL(uniCfg.loginUrl).origin);
      } catch { }
    }

    return Array.from(new Set(base));
  }, [uniCfg?.cookieLinks, uniCfg?.loginUrl]);

  const collectCookies = React.useCallback(async (): Promise<Record<string, CookieJsonRecord>> => {
    const merged: Record<string, CookieJsonRecord> = {};

    for (const d of cookieDomains) {
      try {
        const got = await CookieManager.get(d);
        if (!got) continue;

        for (const [name, c] of Object.entries(got)) {
          const cookieAny = c as any;
          merged[`${d}|${name}`] = {
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

  type CookiesByOrigin = Record<string, Record<string, CookieJsonRecord>>;

  const collectCookiesByOrigin = React.useCallback(async (): Promise<CookiesByOrigin> => {
    const out: CookiesByOrigin = {};
    for (const origin of cookieDomains) {
      const got = await CookieManager.get(origin);
      if (!got) continue;

      out[origin] = {};
      for (const [name, c] of Object.entries(got)) {
        const cookieAny = c as any;
        out[origin][name] = {
          name,
          value: String(cookieAny?.value ?? ""),
          path: cookieAny?.path ?? "/",
          secure: Boolean(cookieAny?.secure ?? true),
          httpOnly: Boolean(cookieAny?.httpOnly ?? true),
          domain: null, // ignore
        };
      }
    }
    return out;
  }, [cookieDomains]);

  const stopPolling = React.useCallback(() => {
    pollingRef.current = false;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = React.useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    const runOnce = async () => {
      if (!university?.id) return;
      if (cookieDomains.length === 0) return;
      if (checkingRef.current) return;

      try {
        const merged = await collectCookiesByOrigin();

        if (Object.keys(merged).length === 0) return;

        const fp = cookieFingerprint(merged);
        if (fp === lastFpRef.current) return;

        const result = await checkLoginWithBackend(String(university.id), merged);

        console.log("[poll] backend result:", result);

        checkingRef.current = false;

        if ("status" in result && result.status === 1 && result.authenticated) {
          stopPolling();
          setBrowserUrl(null);
          await acknowledgeLogin();
        }
      } catch (e: any) {
        checkingRef.current = false;
        console.warn("Polling/check-login failed:", e?.message || String(e));
      }
    };
    runOnce();
    pollTimerRef.current = setInterval(runOnce, 1200);
  }, [
    university?.id,
    cookieDomains.length,
    collectCookies,
    acknowledgeLogin,
    stopPolling,
  ]);

  // Ensure polling stops when component unmounts or browser closes
  React.useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // If browser is closed, stop polling
  React.useEffect(() => {
    if (!browserUrl) stopPolling();
  }, [browserUrl, stopPolling]);

  // ---- loaders ----
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

  // Load config when on step 3 and uni selected
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (step < 3 || !university) {
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
    inputRange: [0, 1, 2],
    outputRange: [0, -width, -2 * width],
  });

  const canGoBack = step > 1;
  const onBack = () => {
    if (university) {
      setUniversity(null);
      return;
    }
    if (country) {
      setCountry(null);
      return;
    }
  };

  const pct = Math.min(step - 1, TOTAL_STEPS) / TOTAL_STEPS;

  const openLogin = React.useCallback(async () => {
    if (!uniCfg?.loginUrl) return;

    try {
      await CookieManager.clearAll(true);
    } catch (e) {
    }

    // reset browser
    setBrowserResetToken((x) => x + 1);

    setBrowserUrl(uniCfg.loginUrl);

    startPolling();
  }, [startPolling, uniCfg?.loginUrl]);

  return (
    <View style={styles.root}>
      <Header
        title={`Schritt ${Math.min(step, TOTAL_STEPS)} von ${TOTAL_STEPS}`}
        canGoBack={canGoBack}
        onBack={onBack}
        rightIcon="backup-restore"
        onRightPress={resetOnboarding}
        rightAccessibilityLabel="Onboarding zurücksetzen"
      />

      <View style={styles.progressWrap}>
        <ProgressBar progress={pct} />
      </View>

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
        <Animated.View
          style={[
            styles.pagerRow,
            { width: width * TOTAL_STEPS, transform: [{ translateX }] },
          ]}
        >
          {/* Step 1 */}
          <View style={[styles.page, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title title="1) Land wählen" />
              <Card.Content>
                {countries.map((c) => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    left={(props) => (
                      <List.Icon {...props} icon={country?.id === c.id ? "check-circle" : "map"} />
                    )}
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
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={university?.id === u.id ? "check-circle" : "school"}
                      />
                    )}
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
              <Card.Title title="3) Anmeldung" subtitle={university?.name ?? ""} />
              <Card.Content>
                <Text>Anmeldung erfolgt sicher im Browser.</Text>
                <View style={{ height: 12 }} />

                <Button mode="contained" disabled={!uniCfg?.loginUrl} onPress={openLogin}>
                  Anmelden ({university?.name})
                </Button>

                {/* Helpful status for POC */}
                <View style={{ height: 12 }} />
                <Text style={{ opacity: 0.7 }} selectable>
                  Cookie Domains: {cookieDomains.length > 0 ? cookieDomains.join(", ") : "(keine)"}
                </Text>
              </Card.Content>
            </Card>
          </View>
        </Animated.View>
      </View>

      <Divider />

      <Modal
        visible={!!browserUrl}
        animationType="slide"
        onRequestClose={() => setBrowserUrl(null)}
      >
        {browserUrl ? (
          <EmbeddedBrowser
            initialUrl={browserUrl}
            title="FH Login"
            onClose={() => setBrowserUrl(null)}
            resetToken={browserResetToken}
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
  card: {
    marginBottom: 12,
    backgroundColor: "transparent",
    elevation: 0,
    shadowColor: "transparent",
  },
});
