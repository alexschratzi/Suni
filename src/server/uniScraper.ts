import { CookiesByOrigin } from "@/components/university/Onboarding";
import { StudentProfile } from "../dto/uniScraperDTO";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_TIME_VALID = 60*60*60*24*14; // 14 days valid

export type CookieJsonRecord = {
    httpOnly: boolean;
    path: string;
    value: string;
    secure: boolean;
    domain: string | null;
    name: string;
};

export interface ScrapeStudentProfileArgs {
    university_id: string;
    cookies: Record<string, CookieJsonRecord>;
}

const BASE_URL = "https://uni-scraper.eliasbader.de";
const STUDENT_PROFILE_CACHE_KEY = "StudentProfile"

export async function scrapeStudentProfile(
    args: ScrapeStudentProfileArgs,
    useCached: boolean = false
): Promise<StudentProfile> {
    let sp_cached = await readStudentProfileCache();
    if(sp_cached && useCached) return sp_cached;

    const resp = await fetch(`${BASE_URL}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
    });

    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
            `Scraper request failed (${resp.status} ${resp.statusText})` +
                (text ? `: ${text}` : "")
        );
    }

    // Assuming your scraper returns a JSON body following StudentProfile shape
    const data = (await resp.json()) as StudentProfile;

    // Optional: minimal runtime validation
    if (!data || typeof data !== "object" || !data.university_id) {
        throw new Error("Invalid scraper response: missing university_id");
    }

    cacheStudentProfile(data);

    return data;
}


export function cacheStudentProfile(sp: StudentProfile) {
    const current_timestamp = Date.now();

    const data = {"timestamp": current_timestamp, "data": sp}
    AsyncStorage.setItem(STUDENT_PROFILE_CACHE_KEY, JSON.stringify(data));
}

async function readStudentProfileCache() {
    let data = await AsyncStorage.getItem(STUDENT_PROFILE_CACHE_KEY);

    if(!data) return null;

    data = JSON.parse(data);

    if(!data) return null;

    if(data["timestamp"] >= Date.now() - CACHE_TIME_VALID) {
        return data["data"]["data"]
    }

    return null;
}

export async function getCachedStudentProfile(): Promise<StudentProfile | null> {
  return await readStudentProfileCache();
}

export async function clearStudentProfileCache(): Promise<void> {
  await AsyncStorage.removeItem(STUDENT_PROFILE_CACHE_KEY);
}

export async function checkLoginWithBackend(
  universityId: string,
  cookiesByOrigin: CookiesByOrigin
) {
  const resp = await fetch("https://uni-scraper.eliasbader.de/check-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      university_id: universityId,
      cookies_by_origin: cookiesByOrigin,
    }),
  });

  if (!resp.ok) throw new Error(`check-login HTTP ${resp.status}`);
  return (await resp.json()) as { status: 1; authenticated: boolean } | { status: 0; error: string };
}