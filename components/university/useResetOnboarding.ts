// components/university/useResetOnboarding.ts
import * as React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {useUniversity} from "./UniversityContext";
import {clearUniApiClientCache} from "./uni-login";

// Optional: npm i @react-native-cookies/cookies
let CookieManager: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    CookieManager = require("@react-native-cookies/cookies").default;
} catch {
    CookieManager = null;
}

const STORAGE_KEYS = {
    country: "uc.country",
    university: "uc.university",
    program: "uc.program",
    loginAck: "uc.loginAcknowledged",
};

type ResetOpts = {
    /** Clear all WebView cookies (recommended for login reset). Default: true */
    clearCookies?: boolean;
    /** Extra storage keys you might want to wipe (e.g., 'uc.webToken'). */
    extraKeys?: string[];
};

export function useResetOnboarding() {
    const {setCountry, setUniversity, setProgram, resetLoginAck} = useUniversity();

    return React.useCallback(
        async (opts: ResetOpts = {clearCookies: true}) => {
            const {clearCookies = true, extraKeys = []} = opts;

            // 1) Clear local storage for onboarding
            const keys = [
                STORAGE_KEYS.country,
                STORAGE_KEYS.university,
                STORAGE_KEYS.program,
                STORAGE_KEYS.loginAck,
                ...extraKeys,
            ];
            await AsyncStorage.multiRemove(keys);

            // 2) Reset in-memory client cache (ETags, payloads)
            clearUniApiClientCache();

            // 3) Clear cookies (WebView session, IdP tokens)
            if (clearCookies && CookieManager) {
                try {
                    // true => also for WebView (Android), no-op if not supported
                    await CookieManager.clearAll(true);
                } catch {
                    // ignore cookie errors on platforms without cookies module
                }
            }

            // 4) Reset React state to step 1
            await resetLoginAck();
            await setProgram(null);
            await setUniversity(null);
            await setCountry(null);
        },
        [setCountry, setUniversity, setProgram, resetLoginAck]
    );
}
