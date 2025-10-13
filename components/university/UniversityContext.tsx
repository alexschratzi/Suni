// components/university/UniversityContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as React from "react";

export type Country = { id: number; name: string };
export type University = { id: number; name: string; countryId: number };
export type Program = { id: number; name: string; universityId: number };

type Ctx = {
    country: Country | null;
    university: University | null;
    program: Program | null;
    setCountry: (c: Country | null) => void;
    setUniversity: (u: University | null) => void;
    setProgram: (p: Program | null) => void;

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

export function UniversityProvider({children}: { children: React.ReactNode }) {
    const [country, setCountryState] = React.useState<Country | null>(null);
    const [university, setUniversityState] = React.useState<University | null>(null);
    const [program, setProgramState] = React.useState<Program | null>(null);
    const [loginAcknowledged, setLoginAcknowledged] = React.useState(false);

    // Restore
    React.useEffect(() => {
        (async () => {
            const [c, u, p, ack] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.country),
                AsyncStorage.getItem(STORAGE_KEYS.university),
                AsyncStorage.getItem(STORAGE_KEYS.program),
                AsyncStorage.getItem(STORAGE_KEYS.loginAck),
            ]);
            if (c) setCountryState(JSON.parse(c));
            if (u) setUniversityState(JSON.parse(u));
            if (p) setProgramState(JSON.parse(p));
            setLoginAcknowledged(ack === "1");
        })();
    }, []);

    // Persist
    const setCountry = React.useCallback(async (c: Country | null) => {
        setCountryState(c);
        if (c) await AsyncStorage.setItem(STORAGE_KEYS.country, JSON.stringify(c));
        else await AsyncStorage.removeItem(STORAGE_KEYS.country);
        // cascading resets
        setUniversity(null);
        setProgram(null);
    }, []);

    const setUniversity = React.useCallback(async (u: University | null) => {
        setUniversityState(u);
        if (u) await AsyncStorage.setItem(STORAGE_KEYS.university, JSON.stringify(u));
        else await AsyncStorage.removeItem(STORAGE_KEYS.university);
        // reset program if uni changes
        setProgram(null);
    }, []);

    const setProgram = React.useCallback(async (p: Program | null) => {
        setProgramState(p);
        if (p) await AsyncStorage.setItem(STORAGE_KEYS.program, JSON.stringify(p));
        else await AsyncStorage.removeItem(STORAGE_KEYS.program);
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
        if (!program) return 3;
        return 4;
    }, [country, university, program]);

    const shouldShowLinks = React.useMemo(
        () => step === 4 && loginAcknowledged && !!university,
        [step, loginAcknowledged, university]
    );

    const value: Ctx = {
        country, university, program,
        setCountry, setUniversity, setProgram,
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
