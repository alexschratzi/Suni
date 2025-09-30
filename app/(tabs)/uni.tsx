// app/(tabs)/uni/OnboardingOrLinks.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
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
import EmbeddedBrowser, { LoginDetectionConfig } from "../screens/EmbeddedBrowser";

// ===== Types =====
type Country = { id: number; name: string };
type University = { id: number; name: string; countryId: number };
type Program = { id: number; name: string; universityId: number };

type NavLike = { navigate?: (route: string) => void };
type Props = { navigation?: NavLike };

// ===== Static Data =====
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
  { id: 1231, name: "Informationstechnik und Systemmanagement BSc", universityId: 123 },
] as const;

const STORAGE_KEYS = {
  country: "uc.country",
  university: "uc.university",
  program: "uc.program",
  loginAck: "uc.loginAcknowledged", // generalized key
} as const;

// ===== Quick-Link Dictionary =====
type LinkItem = { id: string; title: string; url: string };
type UniConfig = { uniId: number; loginUrl?: string; links: LinkItem[]; loginDetection: LoginDetectionConfig };

const UNI_CONFIG_BY_ID: Record<number, UniConfig> = {
  // FH Salzburg
  123: {
    uniId: 123,
    loginUrl: "https://login.fh-salzburg.ac.at/",
    links: [
      { id: "outlook",   title: "Outlook",  url: "https://outlook.office.com/mail/" },
      { id: "myfhs",     title: "myFHS",    url: "https://myfhs.fh-salzburg.ac.at/#all-updates" },
      { id: "jobrouter", title: "JobRouter",url: "https://jobrouter.fhs.fh-salzburg.ac.at/" },
      { id: "moodle",    title: "Moodle",   url: "https://elearn.fh-salzburg.ac.at/my/" },
      { id: "fhsys",     title: "FHSYS",    url: "https://fhsys.fh-salzburg.ac.at/" },
    ],
    // Detect success when we reach any FH Salzburg (or Office) host,
    // but *not* while we're still on Microsoft's IdP host:
    loginDetection: {
      successHostSuffixes: [
        "fh-salzburg.ac.at",
        "office.com",            // Outlook/Calendar post-login
        "microsoft.com",         // sometimes ends on *.microsoft.com after redirect
      ],
      idpHosts: ["login.microsoftonline.com"],
    },
  },

  // Placeholder for Universität Salzburg
  124: {
    uniId: 124,
    links: [],
    loginUrl: undefined,
    loginDetection: {
      successHostSuffixes: [],
    },
  },
};

// ===== Screen =====
export default function OnboardingOrLinks({ navigation }: Props): JSX.Element {
  const { width } = useWindowDimensions();

  const [country, setCountry] = React.useState<Country | null>(null);
  const [university, setUniversity] = React.useState<University | null>(null);
  const [program, setProgram] = React.useState<Program | null>(null);

  const [loginAcknowledged, setLoginAcknowledged] = React.useState<boolean>(false);
  const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);

  // Derived step (onboarding) vs. link hub:
  const step: number = React.useMemo(() => {
    if (!country) return 1;
    if (!university) return 2;
    if (!program) return 3;
    return 4;
  }, [country, university, program]);

  // If we have login acknowledged, we skip onboarding UI entirely.
  const shouldShowLinks = React.useMemo(
    () => step === 4 && loginAcknowledged && !!university,
    [step, loginAcknowledged, university]
  );

  // Animation between onboarding pages
  const pagerPos = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const visibleIndex = Math.min(step, 4) - 1;
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
      const [c, u, p, ack] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.country),
        AsyncStorage.getItem(STORAGE_KEYS.university),
        AsyncStorage.getItem(STORAGE_KEYS.program),
        AsyncStorage.getItem(STORAGE_KEYS.loginAck),
      ]);
      if (c) setCountry(JSON.parse(c) as Country);
      if (u) setUniversity(JSON.parse(u) as University);
      if (p) setProgram(JSON.parse(p) as Program);
      setLoginAcknowledged(ack === "1");
    })();
  }, []);

  // Persist changes
  React.useEffect(() => {
    if (country) AsyncStorage.setItem(STORAGE_KEYS.country, JSON.stringify(country));
  }, [country]);
  React.useEffect(() => {
    if (university) AsyncStorage.setItem(STORAGE_KEYS.university, JSON.stringify(university));
  }, [university]);
  React.useEffect(() => {
    if (program) AsyncStorage.setItem(STORAGE_KEYS.program, JSON.stringify(program));
  }, [program]);

  const universitiesForCountry = React.useMemo(
    () => UNIVERSITIES.filter((u) => country && u.countryId === country.id),
    [country]
  );
  const programsForUniversity = React.useMemo(
    () => PROGRAMS.filter((p) => university && p.universityId === university.id),
    [university]
  );

  function goBack(): void {
    if (program) { setProgram(null); return; }
    if (university) { setUniversity(null); return; }
    if (country) { setCountry(null); return; }
  }

  // ===== Link Hub (shown when loginAcknowledged === true) =====
  if (shouldShowLinks) {
    const uniCfg = UNI_CONFIG_BY_ID[university!.id];
    const links = uniCfg?.links ?? [];

    return (
      <View style={styles.root}>
        <Header title={`${university!.name}: Schnellzugriff`} />

        <FlatList
          data={links}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 10 }}
          contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setBrowserUrl(item.url)} style={styles.tilePressable}>
              <View style={styles.tile}>
                <Text style={styles.tileText}>{item.title}</Text>
              </View>
            </Pressable>
          )}
        />

        {/* Embedded Browser Modal */}
        <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
          {browserUrl ? (
            <EmbeddedBrowser
              initialUrl={browserUrl}
              title="FH Browser"
              onClose={() => setBrowserUrl(null)}
            />
          ) : null}
        </Modal>
      </View>
    );
  }

  // ===== Onboarding (until login is completed) =====
  const translateX = pagerPos.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, -width, -2 * width, -3 * width],
  });
  const activeLetter: string = Math.min(step, 4).toString();
  const uniCfg = university ? UNI_CONFIG_BY_ID[university.id] : undefined;

  return (
    <View style={styles.root}>
      <Header title={`Schritt ${activeLetter} von 4`} canGoBack={step > 1} onBack={goBack} />
      <Progress step={step} total={4} />

      <View style={[styles.pagerFrame, { width }]}>
        <Animated.View style={[styles.pagerRow, { width: width * 4, transform: [{ translateX }] }]}>
          {/* Step 1: Country */}
          <View style={[styles.page, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title title="1) Land wählen" />
              <Card.Content>
                {COUNTRIES.map((c) => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    left={(props) => <List.Icon {...props} icon={country?.id === c.id ? "check-circle" : "map"} />}
                    onPress={() => { setCountry(c); setUniversity(null); setProgram(null); }}
                  />
                ))}
              </Card.Content>
            </Card>
          </View>

          {/* Step 2: University */}
          <View style={[styles.page, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title title="2) Universität wählen" subtitle={country?.name ?? ""} />
              <Card.Content>
                {universitiesForCountry.map((u) => (
                  <List.Item
                    key={u.id}
                    title={u.name}
                    left={(props) => <List.Icon {...props} icon={university?.id === u.id ? "check-circle" : "school"} />}
                    onPress={() => { setUniversity(u); setProgram(null); }}
                  />
                ))}
                {universitiesForCountry.length === 0 && <Text>Keine Universitäten hinterlegt.</Text>}
              </Card.Content>
            </Card>
          </View>

          {/* Step 3: Program */}
          <View style={[styles.page, { width }]}>
            <Card style={styles.card} mode="elevated" theme={{ colors: { surface: "transparent" } }}>
              <Card.Title title="3) Studiengang wählen" subtitle={university?.name ?? ""} />
              <Card.Content>
                {programsForUniversity.map((p) => (
                  <List.Item
                    key={p.id}
                    title={p.name}
                    left={(props) => <List.Icon {...props} icon={program?.id === p.id ? "check-circle" : "book"} />}
                    onPress={() => { setProgram(p); }}
                  />
                ))}
                {programsForUniversity.length === 0 && <Text>Keine Studiengänge hinterlegt.</Text>}
              </Card.Content>
            </Card>
          </View>

          {/* Step 4: Login card (embedded browser) */}
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
                  onPress={() => {
                    if (uniCfg?.loginUrl) setBrowserUrl(uniCfg.loginUrl);
                  }}
                >
                  Anmelden ({university?.name})
                </Button>
              </Card.Content>
            </Card>
          </View>
        </Animated.View>
      </View>

      <Divider />

      {/* Embedded Browser Modal for login */}
      <Modal visible={!!browserUrl} animationType="slide" onRequestClose={() => setBrowserUrl(null)}>
        {browserUrl && uniCfg ? (
          <EmbeddedBrowser
            initialUrl={browserUrl}
            title="FH Login"
            onClose={() => setBrowserUrl(null)}
            loginDetection={uniCfg.loginDetection}
            onLoginDetected={async () => {
              setBrowserUrl(null);
              setLoginAcknowledged(true);
              await AsyncStorage.setItem(STORAGE_KEYS.loginAck, "1");
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}

// ===== UI Bits =====
function Header({ title, canGoBack, onBack }: { title: string; canGoBack?: boolean; onBack?: () => void; }) {
  return (
    <Appbar.Header mode="small" elevated={false} statusBarHeight={0} style={styles.header}>
      {canGoBack ? <Appbar.BackAction onPress={onBack} /> : null}
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}
function Progress({ step, total }: { step: number; total: number; }) {
  const pct = Math.min(step - 1, total) / total;
  return <View style={styles.progressWrap}><ProgressBar progress={pct} /></View>;
}

// ===== Styles =====
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginTop: 0, paddingTop: 0 },
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
});
