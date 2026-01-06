// /src/server/uniScraper.ts
import { StudentProfile } from "../dto/uniScraperDTO";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CookieJsonRecord } from "@/components/university/cookies";

const CACHE_TIME_VALID = 60 * 60 * 60 * 24 * 14; // 14 days valid
const BASE_URL = "https://uni-scraper.eliasbader.de";
const STUDENT_PROFILE_CACHE_KEY = "StudentProfile";

export interface ScrapeStudentProfileArgs {
  university_id: string;
  cookies: Record<string, CookieJsonRecord>;
}

export async function scrapeStudentProfile(
  args: ScrapeStudentProfileArgs,
  useCached: boolean = false
): Promise<StudentProfile> {
  const sp_cached = await readStudentProfileCache();
  if (sp_cached && useCached) return sp_cached;

  const resp = await fetch(`${BASE_URL}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Scraper request failed (${resp.status} ${resp.statusText})` + (text ? `: ${text}` : "")
    );
  }

  const data = (await resp.json()) as any;

  // Your backend returns {status, university_id, data: profile}
  if (!data || data.status !== 1 || !data.data) {
    throw new Error("Invalid scraper response");
  }

  cacheStudentProfile(data);
  return data;
}

export function cacheStudentProfile(sp: any) {
  const current_timestamp = Date.now();
  AsyncStorage.setItem(
    STUDENT_PROFILE_CACHE_KEY,
    JSON.stringify({ timestamp: current_timestamp, data: sp })
  );
}

async function readStudentProfileCache() {
  const raw = await AsyncStorage.getItem(STUDENT_PROFILE_CACHE_KEY);
  if (!raw) return null;

  const data = JSON.parse(raw);
  if (!data) return null;

  if (data.timestamp >= Date.now() - CACHE_TIME_VALID) {
    return data.data?.data ?? null;
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
  cookies: Record<string, CookieJsonRecord>
) {
  const resp = await fetch(`${BASE_URL}/check-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      university_id: universityId,
      cookies, // <-- flat cookies only
    }),
  });

  if (!resp.ok) throw new Error(`check-login HTTP ${resp.status}`);
  return (await resp.json()) as { status: 1; authenticated: boolean } | { status: 0; error: string };
}
