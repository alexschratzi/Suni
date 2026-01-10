import * as React from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Divider, List, Modal, Portal, Text } from "react-native-paper";
import { BarChart } from "react-native-chart-kit";

import { useUniversity } from "./UniversityContext";
import { getCachedStudentProfile } from "../../src/server/uniScraper";
import type { StudentProfile, StudyProgram, UniCourse } from "../../src/dto/uniScraperDTO";
import { useRouter } from "expo-router";


function toNumberGrade(grade?: string): number | null {
    if (!grade) return null;
    const g = grade.replace(",", ".").trim();
    const n = Number(g);
    return Number.isFinite(n) ? n : null;
}

function semesterKey(s?: string): string {
    return (s ?? "").trim();
}

function sortSemesters(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export default function Grades() {
  const router = useRouter();
    const { university, shouldShowLinks } = useUniversity();

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [profile, setProfile] = React.useState<StudentProfile | null>(null);

    const [programPickerOpen, setProgramPickerOpen] = React.useState(false);

    const [selectedProgramIdx, setSelectedProgramIdx] = React.useState(0);

    const screenW = Dimensions.get("window").width;
    const chartInnerW = Math.max(320, screenW - 24 - 24); // 12*2 outer + 12*2 card

    const loadProfileFromCache = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const cached = await getCachedStudentProfile();

            if (!cached) {
                setProfile(null);
                setError("Kein gecachtes Profil gefunden. Bitte im LinkHub einmal 'Scraping starten' ausführen.");
                return;
            }

            setProfile(cached);
            setSelectedProgramIdx(0);
        } catch (e: any) {
            setError(e?.message ?? String(e));
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (!shouldShowLinks || !university) {
            setProfile(null);
            setError(null);
            setLoading(false);
            return;
        }
        loadProfileFromCache();
    }, [shouldShowLinks, university, loadProfileFromCache]);

    const programs: StudyProgram[] = React.useMemo(() => profile?.study_programs ?? [], [profile]);

    const selectedProgram: StudyProgram | null = React.useMemo(() => {
        if (!programs.length) return null;
        return programs[Math.min(selectedProgramIdx, programs.length - 1)] ?? null;
    }, [programs, selectedProgramIdx]);

    // 1) completed: numeric grade exists, includes 0.0 (pass/fail)
    const completedCourses: UniCourse[] = React.useMemo(() => {
        const c = selectedProgram?.courses ?? [];
        return c.filter((x) => {
            const ects = x.ects ?? 0;
            const n = toNumberGrade(x.grade);
            return ects > 0 && n !== null; // includes 0.0
        });
    }, [selectedProgram]);

    // 2) graded for average: numeric grade > 0 (exclude 0.0 pass/fail)
    const gradedCoursesForAverage: UniCourse[] = React.useMemo(() => {
        return completedCourses.filter((x) => {
            const n = toNumberGrade(x.grade);
            return n !== null && n > 0;
        });
    }, [completedCourses]);

    // ECTS sum should be based on completed courses (includes 0.0)
    const ectsCompletedSum = React.useMemo(() => {
        return completedCourses.reduce((sum, c) => sum + (c.ects ?? 0), 0);
    }, [completedCourses]);

    // Average only from gradedCoursesForAverage (exclude 0.0)
    const average = React.useMemo(() => {
        let sum = 0;
        let w = 0;

        for (const c of gradedCoursesForAverage) {
            const g = toNumberGrade(c.grade);
            const ects = c.ects ?? 0;
            if (g == null || ects <= 0) continue;

            sum += g * ects;
            w += ects;
        }

        return w > 0 ? sum / w : null;
    }, [gradedCoursesForAverage]);

    // Bar chart should be based on completed courses (includes 0.0)
    const gradeBarData = React.useMemo(() => {
        const counts: Record<string, number> = {};

        for (const c of completedCourses) {
            const raw = (c.grade ?? "").trim();
            if (!raw) continue;

            // Optional: show 0.0 as "Bestanden" instead of confusing "0.0"
            const label = raw === "0.0" || raw === "0" ? "Bestanden" : raw;

            counts[label] = (counts[label] ?? 0) + 1;
        }

        const labels = Object.keys(counts).sort((a, b) => {
            // keep "Bestanden" at the end (or beginning) – adjust as you like
            if (a === "Bestanden") return 1;
            if (b === "Bestanden") return -1;

            const na = toNumberGrade(a);
            const nb = toNumberGrade(b);
            if (na != null && nb != null) return na - nb;
            return a.localeCompare(b);
        });

        const values = labels.map((l) => counts[l] ?? 0);

        return { labels, values };
    }, [completedCourses]);

    // Course list (all courses), sorted
    const coursesForList: UniCourse[] = React.useMemo(() => {
        const c = selectedProgram?.courses ?? [];
        return [...c].sort((a, b) => {
            const sa = semesterKey(a.semester);
            const sb = semesterKey(b.semester);
            const s = sortSemesters(sa || "", sb || "");
            if (s !== 0) return s;
            return (a.title ?? "").localeCompare(b.title ?? "");
        });
    }, [selectedProgram]);

    if (!shouldShowLinks) {
        return (
            <View style={styles.root}>
                <Card style={{ margin: 12, padding: 16 }}>
                    <Text>Bitte zuerst anmelden.</Text>
                </Card>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}>
                <View style={{ height: 12 }} />

                <Card style={{ padding: 12 }}>
                    <Text style={{ fontWeight: "700", fontSize: 16 }}>{university?.name ?? "Uni"}</Text>
                    <Text style={{ marginTop: 4, opacity: 0.75 }}>
                        {profile ? `${profile.name} ${profile.surname}` : "—"}
                    </Text>
                    <Text style={{ marginTop: 4, opacity: 0.75 }}>
                        MR: {profile ? `${profile.matrikel_nr ?? "—"}` : "—"}
                    </Text>
                </Card>

                <View style={{ height: 12 }} />

                {loading ? (
                    <View style={{ padding: 16 }}>
                        <ActivityIndicator />
                        <Text style={{ marginTop: 8 }}>Lade Cache…</Text>
                    </View>
                ) : error ? (
                    <Card style={{ padding: 16 }}>
                        <Text>Hinweis</Text>
                        <Text selectable style={{ opacity: 0.7, marginTop: 6 }}>
                            {error}
                        </Text>
                    </Card>
                ) : !selectedProgram ? (
                    <Card style={{ padding: 16 }}>
                        <Text>Keine Studienprogramme gefunden.</Text>
                    </Card>
                ) : (
                    <>
                        {/* Dropdown */}
                        <Card style={{ padding: 12 }}>
                            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Studienprogramm</Text>

                            <Button mode="outlined" onPress={() => setProgramPickerOpen(true)}>
                                {selectedProgram.title}
                            </Button>

                            <Portal>
                                <Modal
                                    visible={programPickerOpen}
                                    onDismiss={() => setProgramPickerOpen(false)}
                                    contentContainerStyle={styles.modalContainer}
                                >
                                    <Card>
                                        <Card.Title title="Studienprogramm auswählen" />
                                        <Divider />

                                        <ScrollView style={{ maxHeight: 420 }}>
                                            {programs.map((p, idx) => {
                                                const isSelected = idx === selectedProgramIdx;
                                                return (
                                                    <React.Fragment key={`${p.title}-${idx}`}>
                                                        <List.Item
                                                            title={p.title}
                                                            description={p.status ? `Status: ${p.status}` : undefined}
                                                            onPress={() => {
                                                                setSelectedProgramIdx(idx);
                                                                setProgramPickerOpen(false);
                                                            }}
                                                            left={(props) => (
                                                                <List.Icon {...props} icon={isSelected ? "check-circle" : "school"} />
                                                            )}
                                                        />
                                                        <Divider />
                                                    </React.Fragment>
                                                );
                                            })}
                                        </ScrollView>

                                        <Card.Actions>
                                            <Button onPress={() => setProgramPickerOpen(false)}>Schließen</Button>
                                        </Card.Actions>
                                    </Card>
                                </Modal>
                            </Portal>
                        </Card>

                        <View style={{ height: 12 }} />

                        {/* Stats + chart */}
                        <Card style={{ padding: 12 }}>
                            <Text style={{ fontWeight: "700", marginBottom: 8 }}>Notenübersicht</Text>

                            <View style={{ flexDirection: "row", gap: 12, marginEnd: 12 }}>
                                {/* Average */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: "700" }}>Durchschnitt</Text>
                                    <Text style={{ marginTop: 6, fontSize: 18 }}>
                                        {average == null ? "—" : average.toFixed(2)}
                                    </Text>
                                </View>

                                <View style={{ width: 1, backgroundColor: "rgba(0,0,0,0.12)" }} />

                                {/* ECTS */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: "700" }}>ECTS</Text>
                                    <Text style={{ marginTop: 6, fontSize: 18 }}>{ectsCompletedSum.toFixed(1)}</Text>
                                </View>
                            </View>

                            <View style={{ height: 12 }} />

                            {gradeBarData.values.length < 1 ? (
                                <Text style={{ opacity: 0.7 }}>Keine Noten vorhanden.</Text>
                            ) : (
                                <View style={{ overflow: "hidden", borderRadius: 8 }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <BarChart
                                            data={{
                                                labels: gradeBarData.labels,
                                                datasets: [{ data: gradeBarData.values }],
                                            }}
                                            width={Math.max(chartInnerW, gradeBarData.labels.length * 70)}
                                            height={240}
                                            fromZero
                                            yAxisLabel=""
                                            yAxisSuffix=""
                                            chartConfig={{
                                                backgroundGradientFrom: "#ffffff",
                                                backgroundGradientTo: "#ffffff",
                                                decimalPlaces: 0,
                                                color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                                                labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
                                            }}
                                            style={{ borderRadius: 8 }}
                                        />
                                    </ScrollView>
                                </View>
                            )}
                        </Card>

                        <View style={{ height: 12 }} />
                        <Divider />

                        {/* Course list */}
                        <Card style={{ marginTop: 12 }}>
                            {coursesForList.map((c, idx) => (
                                <View key={`${c.title}-${idx}`}>
                                    <List.Item
                                        title={() => <Text style={{ fontSize: 13, opacity: 0.9 }}>{c.title}</Text>}
                                        description={() => (
                                            <Text style={{ fontSize: 12, opacity: 0.7 }}>
                                                ECTS: {c.ects ?? "—"} {c.semester ? ` • ${c.semester}` : ""}
                                            </Text>
                                        )}
                                        right={() => (
                                            <View style={{ justifyContent: "center", paddingRight: 8 }}>
                                                <Text style={{ fontWeight: "700", fontSize: 14 }}>{c.grade ?? "—"}</Text>
                                            </View>
                                        )}
                                    />
                                    {idx < coursesForList.length - 1 ? <Divider /> : null}
                                </View>
                            ))}
                        </Card>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    modalContainer: {
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: "hidden",
    },
    card: {
        marginBottom: 12,
        backgroundColor: "transparent",
        elevation: 0,
        shadowColor: "transparent",
    },
});
