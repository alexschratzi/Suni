// app/(auth)/index.tsx
import React, {useEffect, useMemo, useState} from "react";
import {Alert, StyleSheet, TextInput, View} from "react-native";
import {useRouter} from "expo-router";
import {ActivityIndicator, Button, Text, useTheme} from "react-native-paper";
import {useTranslation} from "react-i18next";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {supabase} from "../../src/lib/supabase";

type Step = "email" | "code" | "username";

const DEV_AUTH_BYPASS_KEY = "DEV_AUTH_BYPASS_ENABLED";

export default function LoginScreen() {
    const theme = useTheme();
    const router = useRouter();
    const {t} = useTranslation();

    const [step, setStep] = useState<Step>("email");
    const [busy, setBusy] = useState(false);

    const [email, setEmail] = useState("");
    const [pendingEmail, setPendingEmail] = useState<string | null>(null);

    const [code, setCode] = useState("");
    const [username, setUsername] = useState("");

    // DEV bypass
    const [devBypassEnabled, setDevBypassEnabled] = useState(false);
    const [devBypassLoaded, setDevBypassLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!__DEV__) {
                setDevBypassEnabled(false);
                setDevBypassLoaded(true);
                return;
            }
            try {
                const v = await AsyncStorage.getItem(DEV_AUTH_BYPASS_KEY);
                setDevBypassEnabled(v === "1");
            } catch (e) {
                console.warn("Failed to read dev bypass:", e);
                setDevBypassEnabled(false);
            } finally {
                setDevBypassLoaded(true);
            }
        };
        load();
    }, []);

    const setBypass = async (next: boolean) => {
        if (!__DEV__) return;

        try {
            setBusy(true);
            setDevBypassEnabled(next);
            await AsyncStorage.setItem(DEV_AUTH_BYPASS_KEY, next ? "1" : "0");

            if (next) {
                // Optional: ensure you're not half-authed with a stale session
                // await supabase.auth.signOut();

                Alert.alert("DEV", "Auth bypass enabled. Routing to app.");
                router.replace("/(app)/(tabs)/timetable");
            } else {
                Alert.alert("DEV", "Auth bypass disabled.");
                // Stay on auth screen
            }
        } catch (e: any) {
            console.warn("Failed to set dev bypass:", e);
            Alert.alert("DEV", e?.message || String(e));
            setDevBypassEnabled(!next); // revert UI best-effort
        } finally {
            setBusy(false);
        }
    };

    const inputStyle = useMemo(
        () =>
            ({
                borderWidth: StyleSheet.hairlineWidth,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                backgroundColor: theme.colors.surface,
                color: theme.colors.onSurface,
            }) as const,
        [theme.colors.onSurface, theme.colors.surface]
    );

    const verifyEmailOtpWithFallback = async (email: string, token: string) => {
        const types = ["email", "magiclink", "signup"] as const;

        let lastError: any = null;

        for (const type of types) {
            const {data, error} = await supabase.auth.verifyOtp({
                email,
                token,
                type,
            });

            if (!error) return {data, type};
            lastError = error;
        }

        throw lastError;
    };

    const cleanEmail = (v: string) => v.trim().toLowerCase();
    const isOehEmail = (v: string) => cleanEmail(v).endsWith("@oeh.at");
    const computeRole = (v: string) => (isOehEmail(v) ? "oeh" : "student");

    const goHome = () => {
        router.replace("/(app)/(tabs)/timetable");
    };

    const sendOtp = async () => {
        try {
            setBusy(true);

            const e = cleanEmail(email);
            if (!/^\S+@\S+\.\S+$/.test(e)) {
                Alert.alert(t("auth.error"), t("auth.emailFormat") || "Invalid email format.");
                return;
            }

            const {error} = await supabase.auth.signInWithOtp({
                email: e,
                options: {shouldCreateUser: true},
            });
            if (error) throw error;

            setPendingEmail(e);
            setCode("");
            setStep("code");

            Alert.alert(t("auth.codeSentTitle"), t("auth.codeSentMsg") || "Code sent.");
        } catch (err: any) {
            console.log("sendOtp error:", err);
            Alert.alert(t("auth.error"), err?.message || String(err));
        } finally {
            setBusy(false);
        }
    };

    const verifyOtp = async () => {
        try {
            setBusy(true);

            if (!pendingEmail) {
                Alert.alert(t("auth.error"), t("auth.noConfirmation") || "Request a code first.");
                return;
            }

            const token = code.trim();
            if (token.length < 4 || token.length > 8) {
                Alert.alert(t("auth.error"), t("auth.codeInvalid") || "Invalid code.");
                return;
            }

            const {data} = await verifyEmailOtpWithFallback(pendingEmail, token);

            const userId = data.session?.user?.id;
            if (!userId) {
                Alert.alert(t("auth.error"), "No session returned. Please try again.");
                return;
            }

            const {data: prof, error: profErr} = await supabase
                .from("profiles")
                .select("id, username, role")
                .eq("id", userId)
                .maybeSingle();

            if (profErr) throw profErr;

            if (!prof || !prof.username || prof.username.trim().length === 0) {
                setStep("username");
                return;
            }

            goHome();
        } catch (err: any) {
            console.log("verifyOtp error:", err);
            Alert.alert(t("auth.error"), err?.message || String(err));
        } finally {
            setBusy(false);
        }
    };

    const saveUsernameAndFinish = async () => {
        try {
            setBusy(true);

            const u = username.trim();
            if (!u) {
                Alert.alert(t("auth.error"), t("auth.enterUsername") || "Please enter a username.");
                return;
            }

            const e = pendingEmail ? cleanEmail(pendingEmail) : null;
            if (!e) {
                Alert.alert(t("auth.error"), "Missing email context. Please restart login.");
                return;
            }

            const {data: userRes, error: userErr} = await supabase.auth.getUser();
            if (userErr) throw userErr;

            const userId = userRes.user?.id;
            if (!userId) {
                Alert.alert(t("auth.error"), "Not authenticated. Please verify the code again.");
                return;
            }

            const role = computeRole(e);

            const {error: upsertErr} = await supabase.from("profiles").upsert(
                {id: userId, username: u, role},
                {onConflict: "id"}
            );

            if (upsertErr) {
                const msg = (upsertErr.message || "").toLowerCase();
                if (msg.includes("duplicate") || msg.includes("unique")) {
                    Alert.alert(t("auth.error"), t("auth.usernameTaken") || "Username already taken.");
                    return;
                }
                throw upsertErr;
            }

            Alert.alert(t("auth.successTitle"), t("auth.successMsg"));
            goHome();
        } catch (err: any) {
            console.log("saveUsername error:", err);
            Alert.alert(t("auth.error"), err?.message || String(err));
        } finally {
            setBusy(false);
        }
    };

    const resetAll = () => {
        setStep("email");
        setEmail("");
        setPendingEmail(null);
        setCode("");
        setUsername("");
    };

    return (
        <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
            <Text variant="headlineSmall" style={styles.title}>
                {t("auth.title")}
            </Text>

            {/* DEV bypass toggle */}
            {__DEV__ && devBypassLoaded && (
                <View style={styles.devRow}>
                    <View style={{flex: 1}}>
                        <Text style={styles.devTitle}>DEV: Auth Bypass</Text>
                        <Text style={styles.devHint}>
                            {devBypassEnabled ? "Currently ON (bypassing auth)." : "Currently OFF."}
                        </Text>
                    </View>

                    <Button
                        mode={devBypassEnabled ? "contained" : "outlined"}
                        onPress={() => setBypass(!devBypassEnabled)}
                        disabled={busy}
                        compact
                    >
                        {devBypassEnabled ? "Disable" : "Enable"}
                    </Button>
                </View>
            )}


            {busy && (
                <View style={{marginBottom: 12, alignItems: "center"}}>
                    <ActivityIndicator/>
                </View>
            )}

            {step === "email" && (
                <>
                    <TextInput
                        style={inputStyle}
                        placeholder={t("auth.emailPlaceholder") || "Email"}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Button mode="contained" onPress={sendOtp} disabled={busy}>
                        {t("auth.sendCode")}
                    </Button>
                </>
            )}

            {step === "code" && (
                <>
                    <Text style={{marginBottom: 8}}>
                        {t("auth.codeSentTo") || "Enter the code sent to:"} {pendingEmail}
                    </Text>

                    <TextInput
                        style={inputStyle}
                        placeholder={t("auth.codePlaceholder") || "Code"}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        keyboardType="number-pad"
                        value={code}
                        onChangeText={setCode}
                    />

                    <Button mode="contained" onPress={verifyOtp} disabled={busy}>
                        {t("auth.confirm")}
                    </Button>

                    <Button mode="outlined" onPress={resetAll} disabled={busy} style={{marginTop: 8}}>
                        {t("auth.changeEmail") || "Use a different email"}
                    </Button>
                </>
            )}

            {step === "username" && (
                <>
                    <Text style={{marginBottom: 8}}>
                        {t("auth.usernameOnboarding") || "Choose a username to finish setup."}
                    </Text>

                    <TextInput
                        style={inputStyle}
                        placeholder={t("auth.usernamePlaceholder") || "Username"}
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={username}
                        onChangeText={setUsername}
                    />

                    <Button mode="contained" onPress={saveUsernameAndFinish} disabled={busy}>
                        {t("auth.confirm") || "Finish"}
                    </Button>

                    <Button mode="outlined" onPress={resetAll} disabled={busy} style={{marginTop: 8}}>
                        {t("auth.cancel") || "Cancel"}
                    </Button>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, justifyContent: "center", padding: 20},
    title: {fontSize: 22, fontWeight: "bold", marginBottom: 16, textAlign: "center"},

    devRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    devTitle: {fontWeight: "700"},
    devHint: {opacity: 0.7, marginTop: 2, fontSize: 12},
});
