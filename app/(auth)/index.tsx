// app/(auth)/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert, Platform, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { signInWithPhoneNumber, signInAnonymously } from "firebase/auth";
import { auth, db, firebaseConfig } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {
  Text,
  Button,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

// @ts-ignore
declare global {
  interface Window {
    recaptchaVerifier?: any;
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
  const [confirmation, setConfirmation] = useState<any>(null);

  // Recaptcha für Mobile
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (__DEV__ && auth.settings) {
          auth.settings.appVerificationDisabledForTesting = true;
          console.log("Testmode aktiv");
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const sendCode = async () => {
    try {
      const cleanPhone = phone.replace(/\s+/g, "");

      if (!cleanPhone.startsWith("+")) {
        Alert.alert(t("auth.error"), t("auth.phoneFormat"));
        return;
      }

      let confirmationResult;

      if (Platform.OS === "web") {
        // Dynamischer Import für Web
        // @ts-ignore
        const { RecaptchaVerifier } = await import("firebase/auth");

        const container = document.getElementById("recaptcha-container");
        if (!container) {
          throw new Error("recaptcha-container not found in DOM");
        }

        if (!window.recaptchaVerifier) {
          // @ts-ignore
          window.recaptchaVerifier = new RecaptchaVerifier(
            auth, // v10: zuerst Auth
            container, // dann Container
            { size: "invisible" }
          );
        }

        confirmationResult = await signInWithPhoneNumber(
          auth,
          cleanPhone,
          window.recaptchaVerifier
        );
      } else {
        // Mobile (Expo / iOS / Android) mit FirebaseRecaptchaVerifierModal
        if (!recaptchaVerifier.current) {
          Alert.alert(t("auth.error"), "reCAPTCHA nicht bereit.");
          return;
        }

        confirmationResult = await signInWithPhoneNumber(
          auth,
          cleanPhone,
          // @ts-ignore – Modal liefert intern den richtigen Verifier
          recaptchaVerifier.current
        );
      }

      setConfirmation(confirmationResult);
      Alert.alert(t("auth.codeSentTitle"), t("auth.codeSentMsg"));
    } catch (err: any) {
      console.log("sendCode error:", err);
      Alert.alert(t("auth.error"), err.message || String(err));
    }
  };

  const confirmCode = async () => {
    try {
      if (!confirmation) {
        Alert.alert(t("auth.error"), t("auth.noConfirmation"));
        return;
      }

      const userCred = await confirmation.confirm(code);
      const uid = userCred.user.uid;
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        if (!username.trim()) {
          Alert.alert(t("auth.error"), t("auth.enterUsername"));
          return;
        }

        const q = query(
          collection(db, "usernames"),
          where("username", "==", username.trim())
        );
        const existing = await getDocs(q);

        if (!existing.empty) {
          Alert.alert(t("auth.error"), t("auth.usernameTaken"));
          return;
        }

        await addDoc(collection(db, "usernames"), {
          username: username.trim(),
          uid,
        });

        await setDoc(userRef, {
          phone: phone.replace(/\s+/g, ""),
          username: username.trim(),
          role: "student",
        });
      }

      Alert.alert(t("auth.successTitle"), t("auth.successMsg"));
      router.replace("../(tabs)");
    } catch (err: any) {
      console.log("confirmCode error:", err);
      Alert.alert(t("auth.error"), err.message || String(err));
    }
  };

  const testLogin = async () => {
    try {
      const userCred = await signInAnonymously(auth);
      console.log("Test-User:", userCred.user.uid);
      Alert.alert(t("auth.testSuccessTitle"), t("auth.testSuccessMsg"));
    } catch (err: any) {
      Alert.alert(t("auth.error"), err.message || String(err));
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: theme.colors.background },
        ]}
      >
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
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {/* Recaptcha für Mobile */}
      {Platform.OS !== "web" && (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification
        />
      )}

      {/* Recaptcha für Web */}
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

          <TextInput
            style={inputStyle}
            placeholder={t("auth.usernamePlaceholder")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={username}
            onChangeText={setUsername}
          />

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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
  },
});
