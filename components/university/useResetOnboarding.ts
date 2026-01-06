// components/university/useResetOnboarding.ts
import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useUniversity} from "./UniversityContext";
import {clearActiveUniConfig} from "./uni-login";
import CookieManager from "@react-native-cookies/cookies";

const STORAGE_KEYS = {
  country: "uc.country",
  university: "uc.university",
  loginAck: "uc.loginAcknowledged",
  activeUniConfig: "uni:config",
};

type ResetOpts = {
  clearCookies?: boolean;
  extraKeys?: string[];
};

export function useResetOnboarding() {
  const { setCountry, setUniversity, resetLoginAck } = useUniversity();

  return React.useCallback(
    async (opts: ResetOpts = { clearCookies: true }) => {
      const { clearCookies = true, extraKeys = [] } = opts;

      // 1) Clear AsyncStorage (onboarding + active uni config)
      const keys = [
        STORAGE_KEYS.country,
        STORAGE_KEYS.university,
        STORAGE_KEYS.loginAck,
        STORAGE_KEYS.activeUniConfig,
        ...extraKeys,
      ];
      await AsyncStorage.multiRemove(keys);

      // 2) Clear cached UniConfig explicitly (safety)
      await clearActiveUniConfig();

      // 3) Clear cookies (auth / IdP session)
      if (clearCookies && CookieManager) {
        try {
          await CookieManager.clearAll(true);
        } catch {
          // ignore platform limitations
        }
      }

      // 4) Reset React state (back to step 1)
      await resetLoginAck();
      await setUniversity(null);
      await setCountry(null);
    },
    [setCountry, setUniversity, resetLoginAck]
  );
}