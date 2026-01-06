// components/university/UniversityContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

export type Country = { id: number; name: string };
export type University = { id: number; name: string; countryId: number };

type Ctx = {
    country: Country | null;
    university: University | null;
    setCountry: (c: Country | null) => void;
    setUniversity: (u: University | null) => void;

    loginAcknowledged: boolean;
    acknowledgeLogin: () => Promise<void>;
    resetLoginAck: () => Promise<void>;

    step: number;             // 1..4
    shouldShowLinks: boolean; // true if step===4 and loginAck and university
};

const STORAGE_KEYS = {
    country: "uc.country",
    university: "uc.university",
    program: "uc.program",
    loginAck: "uc.loginAcknowledged",
} as const;

const UniversityContext = React.createContext<Ctx | undefined>(undefined);

export function UniversityProvider({ children }: { children: React.ReactNode }) {
    const [country, setCountryState] = React.useState<Country | null>(null);
    const [university, setUniversityState] = React.useState<University | null>(null);
    const [loginAcknowledged, setLoginAcknowledged] = React.useState(false);

    // Restore
    React.useEffect(() => {
        (async () => {
            const [c, u, ack] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.country),
                AsyncStorage.getItem(STORAGE_KEYS.university),
                AsyncStorage.getItem(STORAGE_KEYS.loginAck),
            ]);

            if (c) setCountryState(JSON.parse(c));
            if (u) setUniversityState(JSON.parse(u));
            setLoginAcknowledged(ack === "1");
        })();
    }, []);

    // Persist
    const setCountry = React.useCallback(async (c: Country | null) => {
        setCountryState(c);
        if (c) await AsyncStorage.setItem(STORAGE_KEYS.country, JSON.stringify(c));
        else await AsyncStorage.removeItem(STORAGE_KEYS.country);

        setUniversity(null);
        await resetLoginAck();
    }, []);

    const setUniversity = React.useCallback(async (u: University | null) => {
        setUniversityState(u);
        if (u) await AsyncStorage.setItem(STORAGE_KEYS.university, JSON.stringify(u));
        else await AsyncStorage.removeItem(STORAGE_KEYS.university);

        await resetLoginAck();
    }, []);

    const acknowledgeLogin = React.useCallback(async () => {
        setLoginAcknowledged(true);
        await AsyncStorage.setItem(STORAGE_KEYS.loginAck, "1");
    }, []);
    const resetLoginAck = React.useCallback(async () => {
        setLoginAcknowledged(false);
        await AsyncStorage.removeItem(STORAGE_KEYS.loginAck);
    }, []);

    const step = React.useMemo(() => {
        if (!country) return 1;
        if (!university) return 2;
        return 3;
    }, [country, university]);

    const shouldShowLinks = React.useMemo(
        () => !!country && !!university && loginAcknowledged,
        [country, university, loginAcknowledged]
    );

    const value: Ctx = {
        country, university,
        setCountry, setUniversity,
        loginAcknowledged, acknowledgeLogin, resetLoginAck,
        step, shouldShowLinks,
    };

    return <UniversityContext.Provider value={value}>{children}</UniversityContext.Provider>;
}

export function useUniversity() {
    const ctx = React.useContext(UniversityContext);
    if (!ctx) throw new Error("useUniversity must be used within UniversityProvider");
    return ctx;
}
