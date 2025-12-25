// app/(auth)/index.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Platform, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Text, Button, useTheme, ActivityIndicator } from "react-native-paper";
import { useTranslation } from "react-i18next";
import rnAuth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

import { auth, db } from "../../firebase";

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  type ConfirmationResult,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  addDoc,
} from "firebase/firestore";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);


  useEffect(() => setLoading(false), []);

  const checkExistingProfile = async (cleanPhone: string) => {
    try {
      const q = query(collection(db, "users"), where("phone", "==", cleanPhone));
      const snap = await getDocs(q);
      setHasProfile(!snap.empty);
    } catch (err) {
      console.log("checkExistingProfile error:", err);
      setHasProfile(false);
    }
  };

  const sendCode = async () => {
    try {
      const cleanPhone = phone.replace(/\s+/g, "");

      if (!cleanPhone.startsWith("+")) {
        Alert.alert(t("auth.error"), t("auth.phoneFormat"));
        return;
      }

      if (Platform.OS === "web") {
        Alert.alert(t("auth.error"), "Phone login is disabled on web.");
        return;
      }

      const confirmationResult = await rnAuth().signInWithPhoneNumber(cleanPhone);
      setConfirmation(confirmationResult);

      await checkExistingProfile(cleanPhone);
      Alert.alert(t("auth.codeSentTitle"), t("auth.codeSentMsg"));
    } catch (err: any) {
      console.log("sendCode error:", err);
      Alert.alert(t("auth.error"), err?.message || String(err));
    }
  };

  const confirmCode = async () => {
    try {
      if (!confirmation) {
        Alert.alert(t("auth.error"), t("auth.noConfirmation"));
        return;
      }

      const cleanPhone = phone.replace(/\s+/g, "");
      const userCred = await confirmation.confirm(code);
      const uid = userCred.user.uid;

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      const existingUsername = snap.data()?.username;

      if (snap.exists() && existingUsername) {
        Alert.alert(t("auth.successTitle"), t("auth.successMsg"));
        router.replace("../(tabs)");
        return;
      }

      setHasProfile(false);

      if (!username.trim()) {
        Alert.alert(t("auth.error"), t("auth.enterUsername"));
        return;
      }

      const usernameQ = query(
        collection(db, "usernames"),
        where("username", "==", username.trim())
      );
      const existing = await getDocs(usernameQ);

      if (!existing.empty) {
        Alert.alert(t("auth.error"), t("auth.usernameTaken"));
        return;
      }

      await addDoc(collection(db, "usernames"), { username: username.trim(), uid });

      await setDoc(
        userRef,
        { phone: cleanPhone, username: username.trim(), role: "student" },
        { merge: true }
      );

      Alert.alert(t("auth.successTitle"), t("auth.successMsg"));
      router.replace("../(tabs)");
    } catch (err: any) {
      console.log("confirmCode error:", err);
      Alert.alert(t("auth.error"), err?.message || String(err));
    }
  };

  const testLogin = async () => {
    try {
      const userCred = await signInAnonymously(auth);
      console.log("Test-User:", userCred.user.uid);
      Alert.alert(t("auth.testSuccessTitle"), t("auth.testSuccessMsg"));
    } catch (err: any) {
      Alert.alert(t("auth.error"), err?.message || String(err));
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" />
        <Text style={{ marginTop: 12 }}>{t("auth.loading")}</Text>
      </View>
    );
  }

  const inputStyle = {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    color: theme.colors.onSurface,
  } as const;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Web container for RecaptchaVerifier */}
      {Platform.OS === "web" &&
        typeof document !== "undefined" &&
        React.createElement("div", { id: "recaptcha-container" })}

      <Text variant="headlineSmall" style={styles.title}>
        {t("auth.title")}
      </Text>

      {!confirmation ? (
        <>
          <TextInput
            style={inputStyle}
            placeholder={t("auth.phonePlaceholder")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Button mode="contained" onPress={sendCode} style={styles.button}>
            {t("auth.sendCode")}
          </Button>

          <Button mode="outlined" onPress={testLogin} style={styles.button}>
            {t("auth.testLogin")}
          </Button>
        </>
      ) : (
        <>
          <TextInput
            style={inputStyle}
            placeholder={t("auth.codePlaceholder")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />

          {hasProfile === false && (
            <TextInput
              style={inputStyle}
              placeholder={t("auth.usernamePlaceholder")}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={username}
              onChangeText={setUsername}
            />
          )}

          <Button mode="contained" onPress={confirmCode} style={styles.button}>
            {t("auth.confirm")}
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  button: { marginTop: 8 },
});
