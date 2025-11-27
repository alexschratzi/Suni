// i18n/i18n.ts
/* eslint-disable import/no-named-as-default-member */
/* eslint-disable import/no-named-as-default */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import de from "../locales/de.json";
import en from "../locales/en.json";

const deviceLanguage =
  Localization.getLocales()[0]?.languageCode?.startsWith("de") ? "de" : "en";

async function loadStoredLanguage() {
  try {
    const stored = await AsyncStorage.getItem("appLanguage");
    return stored || null;
  } catch {
    return null;
  }
}

i18next.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: deviceLanguage,
  fallbackLng: "de",
  interpolation: {
    escapeValue: false,
  },
});

loadStoredLanguage().then((lang) => {
  if (lang) {
    i18next.changeLanguage(lang);
  }
});

export default i18next;
