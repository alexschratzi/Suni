import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as React from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Appbar,
  Button,
  Card,
  Divider,
  List,
  ProgressBar,
  Text,
} from "react-native-paper";

import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

// ===== Types =====
type Country = { id: number; name: string };
type University = { id: number; name: string; countryId: number };
type Program = { id: number; name: string; universityId: number };
type ConnectionInfo = { connection_id: string; status: string };

type NavLike = { navigate?: (route: string) => void };
type Props = { navigation?: NavLike };

// ===== Config / Static Data =====
const API_URL = "http://localhost:8000"; // TODO: set your backend base URL

const COUNTRIES: readonly Country[] = [
  { id: 1, name: "Österreich" },
  { id: 2, name: "Deutschland" },
  { id: 3, name: "Schweiz" },
] as const;

const UNIVERSITIES: readonly University[] = [
  { id: 123, name: "FH Salzburg", countryId: 1 },
  { id: 124, name: "Universität Salzburg", countryId: 1 },
] as const;

const PROGRAMS: readonly Program[] = [
  {
    id: 1231,
    name: "Informationstechnik und Systemmanagement BSc",
    universityId: 123,
  },
] as const;

const STORAGE_KEYS = {
  country: "uc.country",
  university: "uc.university",
  program: "uc.program",
  connection: "uc.connection",
} as const;


// ===== Secure storage helpers (Expo) =====
async function setSecure(key: string, value: string | null): Promise<void> {
  if (value == null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value, { keychainService: key });
}
async function getSecure(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

// ===== Screen =====
export default function OnboardingConnectorScreen({
  navigation,
}: Props): JSX.Element {
  const { width } = useWindowDimensions();

  const [country, setCountry] = React.useState<Country | null>(null);
  const [university, setUniversity] = React.useState<University | null>(null);
  const [program, setProgram] = React.useState<Program | null>(null);
  const [connection, setConnection] = React.useState<ConnectionInfo | null>(
    null
  );

  // Derived step: 1..4 (wizard) or 5 (done)
  const step: number = React.useMemo(() => {
    if (!country) return 1;
    if (!university) return 2;
    if (!program) return 3;
    if (!connection) return 4;
    return 5;
  }, [country, university, program, connection]);

  // Horizontal pager animation (right-to-left)
  const pagerPos = React.useRef(new Animated.Value(0)).current; // 0..3
  React.useEffect(() => {
    const visibleIndex = Math.min(step, 4) - 1; // clamp to 0..3
    Animated.timing(pagerPos, {
      toValue: visibleIndex,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, pagerPos]);

  // Restore persisted selections
  React.useEffect(() => {
    (async () => {
      const [c, u, p, conn] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.country),
        AsyncStorage.getItem(STORAGE_KEYS.university),
        AsyncStorage.getItem(STORAGE_KEYS.program),
        AsyncStorage.getItem(STORAGE_KEYS.connection),
      ]);
      if (c) setCountry(JSON.parse(c) as Country);
      if (u) setUniversity(JSON.parse(u) as University);
      if (p) setProgram(JSON.parse(p) as Program);
      if (conn) setConnection(JSON.parse(conn) as ConnectionInfo);
    })();
  }, []);

  // Persist changes
  React.useEffect(() => {
    if (country)
      AsyncStorage.setItem(STORAGE_KEYS.country, JSON.stringify(country));
  }, [country]);
  React.useEffect(() => {
    if (university)
      AsyncStorage.setItem(STORAGE_KEYS.university, JSON.stringify(university));
  }, [university]);
  React.useEffect(() => {
    if (program)
      AsyncStorage.setItem(STORAGE_KEYS.program, JSON.stringify(program));
  }, [program]);
  React.useEffect(() => {
    if (connection)
      AsyncStorage.setItem(STORAGE_KEYS.connection, JSON.stringify(connection));
  }, [connection]);

  const universitiesForCountry: University[] = React.useMemo(
    () =>
      UNIVERSITIES.filter(
        (u) => country !== null && u.countryId === country.id
      ),
    [country]
  );
  const programsForUniversity: Program[] = React.useMemo(
    () =>
      PROGRAMS.filter(
        (p) => university !== null && p.universityId === university.id
      ),
    [university]
  );

  // Back button clears the dependent state and slides one page back
  function goBack(): void {
    if (connection) {
      setConnection(null);
      return;
    }
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
  }

  function resetAll(): void {
    setCountry(null);
    setUniversity(null);
    setProgram(null);
    setConnection(null);
    AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  }

  // Server-assisted login (cookies stored server-side)
  function startLogin(): void {
    if (!program || !university) return;

    const redirectUri: string = makeRedirectUri({
      scheme: "suni",
      path: "auth-callback",
    });

    type StartResp = { session_id: string; auth_url: string };

    fetch(`${API_URL}/auth/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        university_id: university.id,
        program_id: program.id,
        redirect_uri: redirectUri,
      }),
    })
      .then((res) => res.json() as Promise<StartResp>)
      .then(({ session_id, auth_url }) =>
        WebBrowser.openAuthSessionAsync(auth_url, redirectUri).then((result) => ({
          session_id,
          result,
        }))
      )
      .then(({ session_id, result }) => {
        if (result.type !== "success" || !("url" in result) || !result.url) {
          // user canceled or no redirect — nothing to finalize
          return null as null | Promise<ConnectionInfo>;
        }

        // Extract ?session_id=... from returned URL (fallback to original session_id)
        let sid = session_id;
        try {
          const url = new URL(result.url);
          sid = url.searchParams.get("session_id") ?? session_id;
        } catch {
          // RN usually has URL, but in case of older runtimes keep fallback
        }

        return fetch(`${API_URL}/connections/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sid,
            university_id: university.id,
            program_id: program.id,
          }),
        }).then((r) => r.json() as Promise<ConnectionInfo>);
      })
      .then((data) => {
        if (data) setConnection(data);
      })
      .catch((err) => {
        console.warn("Auth flow error:", err);
      });
  }


  // Summary (step 5)
  if (step === 5) {
    return (
      <View style={styles.root}>
        <Header
          title="Verbunden"
          canGoBack
          onBack={goBack}
        />
        <ScrollView style={styles.scroller}>
          <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
            <Card.Title title="Verbindung aktiv" subtitle="Serverseitige Verbindung" />
            <Card.Content>
              <Text>
                {country?.name} • {university?.name} • {program?.name}
              </Text>
              <Text style={styles.smallTop}>
                Connection: {connection?.connection_id} ({connection?.status})
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="outlined" onPress={resetAll}>
                Zurücksetzen
              </Button>
              <Button
                mode="contained"
                onPress={() => navigation?.navigate?.("Home")}
              >
                Fertig
              </Button>
            </Card.Actions>
          </Card>
        </ScrollView>
      </View>
    );
  }

  // Wizard (steps A..D) with right-to-left slide
  const translateX = pagerPos.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, -width, -2 * width, -3 * width],
  });

  const activeLetter: string = Math.min(step, 4).toString();

  return (
    <View style={styles.root}>
      <Header
        title={`Schritt ${activeLetter} von 4`}
        canGoBack={step > 1}
        onBack={goBack}
      />
      <Progress step={step} total={4} />

      <View style={[styles.pagerFrame, { width }]}>
        <Animated.View
          style={[
            styles.pagerRow,
            { width: width * 4, transform: [{ translateX }] },
          ]}
        >
          {/* Step A */}
          <ScrollView style={[styles.scroller, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title title="1) Land wählen" />
              <Card.Content>
                {COUNTRIES.map((c) => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={country?.id === c.id ? "check-circle" : "map"}
                      />
                    )}
                    onPress={() => {
                      setCountry(c);
                      setUniversity(null);
                      setProgram(null);
                      setConnection(null);
                    }}
                  />
                ))}
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Step B */}
          <ScrollView style={[styles.scroller, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title
                title="2) Universität wählen"
                subtitle={country?.name ?? ""}
              />
              <Card.Content>
                {universitiesForCountry.map((u) => (
                  <List.Item
                    key={u.id}
                    title={u.name}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={university?.id === u.id ? "check-circle" : "school"}
                      />
                    )}
                    onPress={() => {
                      setUniversity(u);
                      setProgram(null);
                      setConnection(null);
                    }}
                  />
                ))}
                {universitiesForCountry.length === 0 && (
                  <Text>Keine Universitäten hinterlegt.</Text>
                )}
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Step C */}
          <ScrollView style={[styles.scroller, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title
                title="3) Studiengang wählen"
                subtitle={university?.name ?? ""}
              />
              <Card.Content>
                {programsForUniversity.map((p) => (
                  <List.Item
                    key={p.id}
                    title={p.name}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={program?.id === p.id ? "check-circle" : "book"}
                      />
                    )}
                    onPress={() => {
                      setProgram(p);
                      setConnection(null);
                    }}
                  />
                ))}
                {programsForUniversity.length === 0 && (
                  <Text>Keine Studiengänge hinterlegt.</Text>
                )}
              </Card.Content>
            </Card>
          </ScrollView>

          {/* Step D */}
          <ScrollView style={[styles.scroller, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title
                title="4) Login"
                subtitle="Sichere Anmeldung"
              />
              <Card.Content>
                <Button mode="contained" onPress={startLogin}>
                  Hochschul-Login starten
                </Button>
                <Text style={styles.smallTop}>
                  Wir öffnen den Login im Browser. Nach erfolgreicher Anmeldung
                  wirst du automatisch zurückgeleitet.
                </Text>
              </Card.Content>
            </Card>
          </ScrollView>
        </Animated.View>
      </View>
      <Divider />
    </View>
  );
}

// ===== UI Bits =====
function Header({
  title,
  canGoBack,
  onBack,
}: {
  title: string;
  canGoBack?: boolean;
  onBack?: () => void;
}): JSX.Element {
  return (
    <Appbar.Header
      mode="small"
      elevated={false}
      statusBarHeight={0}         // remove large top margin from header
      style={styles.header}       // ensures compact spacing
    >
      {canGoBack ? <Appbar.BackAction onPress={onBack} /> : null}
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

function Progress({ step, total }: { step: number; total: number }): JSX.Element {
  const pct = Math.min(step - 1, total) / total;
  return (
    <View style={styles.progressWrap}>
      <ProgressBar progress={pct} />
    </View>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    // compact header: adjust if you still see too much top space on certain devices
    marginTop: 0,
    paddingTop: 0,
  },
  scroller: { flex: 1, padding: 10 },
  card: {
    marginBottom: 12,
    backgroundColor: "transparent", // no color
    elevation: 0,                   // no shadow
    // iOS shadow off:
    shadowColor: "transparent",
  },
  smallTop: { marginTop: 8 },
  pagerFrame: { flex: 1, overflow: "hidden" },
  pagerRow: { flexDirection: "row", flex: 1 },
  progressWrap: { marginHorizontal: 12, marginBottom: 8 },
});
