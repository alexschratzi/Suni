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

import EmbeddedBrowser from "../../components/EmbeddedBrowser/EmbeddedBrowser";
import Header from "../ui/Header";

import { fetchCountries, fetchUniConfig, fetchUniversities, UniConfig } from "./uni-login";
import { Country, University, useUniversity } from "./UniversityContext";
import { useResetOnboarding } from "./useResetOnboarding";
import { checkLoginWithBackend } from "@/src/server/uniScraper";
import { useRouter } from "expo-router";


import {
  collectCookiesByOrigin,
  flattenToCookiesJson,
  cookieFingerprint,
  CookiesByOrigin,
  clearAllCookies,
  buildCookieOrigins,
} from "@/components/university/cookies";


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

  const router = useRouter();

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

  const cookieDomains = React.useMemo(() => {
    return buildCookieOrigins({
      cookieLinks: uniCfg?.cookieLinks ?? [],
      loginUrl: uniCfg?.loginUrl ?? null,
      includeMicrosoftDefaults: true,
    });
  }, [uniCfg?.cookieLinks, uniCfg?.loginUrl]);


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
        checkingRef.current = true;

        const cookiesByOrigin: CookiesByOrigin = await collectCookiesByOrigin(cookieDomains);
        if (Object.keys(cookiesByOrigin).length === 0) return;

        const fp = cookieFingerprint(cookiesByOrigin);
        if (fp === lastFpRef.current) return;
        lastFpRef.current = fp;

        const cookies = flattenToCookiesJson(cookiesByOrigin);

        const result = await checkLoginWithBackend(String(university.id), cookies);

        if ("status" in result && result.status === 1 && result.authenticated) {
          stopPolling();
          router.canGoBack() && router.back();
          requestAnimationFrame(() => {
            acknowledgeLogin();
          });
        }
      } catch (e: any) {
        console.warn("Polling/check-login failed:", e?.message || String(e));
      } finally {
        checkingRef.current = false;
      }
    };


    runOnce();
    pollTimerRef.current = setInterval(runOnce, 1200);
  }, [
    university?.id,
    cookieDomains,
    acknowledgeLogin,
    stopPolling,
    router,
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
        setError(null);
        setLoading(false);
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
        setError(null);
        setLoading(false);
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

    await clearAllCookies();

    // reset browser
    setBrowserResetToken((x) => x + 1);

    router.push({
      pathname: "/(app)/(stack)/embedded-browser",
      params: {
        url: uniCfg.loginUrl,
        title: "FH Login",
        resetToken: String(browserResetToken + 1),
      },
    });

    startPolling();
  }, [router, startPolling, uniCfg?.loginUrl, browserResetToken]);

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
              </Card.Content>
            </Card>
          </View>
        </Animated.View>
      </View>

      <Divider />
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
