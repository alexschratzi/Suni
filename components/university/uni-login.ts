// components/university/uni-login.ts
// A tiny client for the uni-service with ETag-based in-memory caching.

export type Country = { id: number; name: string };
export type University = { id: number; name: string; countryId: number };
export type Program = { id: number; name: string; universityId: number };

export type LinkItem = { id: string; title: string; url: string };
export type LoginDetectionConfig = {
    successHostSuffixes?: string[];
    idpHosts?: string[];
};
export type UniConfig = {
    uniId: number;
    loginUrl?: string;
    links?: LinkItem[];
    loginDetection?: LoginDetectionConfig;
};

const BASE = process.env.EXPO_PUBLIC_UNI_API_BASE ?? "http://10.0.2.2:8000";
type CacheEntry<T> = { etag?: string; payload?: T; lastFetched?: number };
const cache: Record<string, CacheEntry<any>> = {};

export function clearUniApiClientCache(): void {
    for (const k of Object.keys(cache)) delete cache[k];
}

async function getJson<T>(path: string, fallback?: () => Promise<T> | T): Promise<T> {
    const url = `${BASE}${path}`;
    const entry = cache[url] || {};
    const headers: Record<string, string> = {};
    if (entry.etag) headers["If-None-Match"] = entry.etag;

    try {
        const res = await fetch(url, { headers });
        if (res.status === 304 && entry.payload) {
            return entry.payload as T;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const etag = res.headers.get("etag") ?? undefined;
        const data = (await res.json()) as T;
        cache[url] = { etag, payload: data, lastFetched: Date.now() };
        return data;
    } catch (e) {
        // graceful fallback
        if (entry.payload) return entry.payload as T;
        if (fallback) return await Promise.resolve(fallback());
        throw e;
    }
}

/** API surface */
export function fetchCountries(fallback?: () => Promise<Country[]> | Country[]) {
    return getJson<Country[]>("/v1/countries", fallback);
}
export function fetchUniversities(countryId: number, fallback?: () => Promise<University[]> | University[]) {
    const q = encodeURI(`/v1/universities?countryId=${countryId}`);
    return getJson<University[]>(q, fallback);
}
export function fetchPrograms(universityId: number, fallback?: () => Promise<Program[]> | Program[]) {
    const q = encodeURI(`/v1/programs?universityId=${universityId}`);
    return getJson<Program[]>(q, fallback);
}
export function fetchUniConfig(uniId: number, fallback?: () => Promise<UniConfig> | UniConfig) {
    return getJson<UniConfig>(`/v1/unis/${uniId}/config`, fallback);
}
export function fetchUniLinks(uniId: number, fallback?: () => Promise<{ links: LinkItem[] }> | { links: LinkItem[] }) {
    return getJson<{ links: LinkItem[] }>(`/v1/unis/${uniId}/links`, fallback);
}
