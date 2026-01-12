// /src/server/uniScraper.ts
import { StudentProfile } from "../dto/uniScraperDTO";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CookieJsonRecord } from "@/components/university/cookies";
import { addCourseCalender, removeCourseCalenderByUrl } from "@/src/timetable/utils/courseCalendars";

const CACHE_TIME_VALID = 60 * 60 * 60 * 24 * 14; // 14 days valid
const BASE_URL = "https://uni-scraper.eliasbader.de";
const STUDENT_PROFILE_CACHE_KEY = "StudentProfile";

export interface ScrapeStudentProfileArgs {
  university_id: string;
  cookies: Record<string, CookieJsonRecord>;
}

type ScrapeResponse = {
  status: 1;
  university_id: string;
  data: StudentProfile;
} | {
  status: 0;
  error: string;
};

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

  const data = (await resp.json()) as ScrapeResponse;

  if (!data || data.status !== 1 || !data.data) {
    throw new Error("Invalid scraper response");
  }

  const profile: StudentProfile = data.data;

  // 1) cache the fresh profile
  await cacheStudentProfile(profile);

  // 2) if backend returned a calendar_url, add it as a course calendar subscription
  //    (first step: just add if present; your addCourseCalender already dedupes by URL)
  const url = String(profile.calendar_url ?? "").trim();
  if (url) {
    try {
      // Use whatever you want as the display name; this is a safe default.
      await addCourseCalender(profile.universtiy_name, url);
    } catch (e: any) {
      // Do NOT fail the scrape if calendar add fails; keep it best-effort
      console.warn("Failed to add course iCal subscription:", e?.message || String(e));
    }
  }

  return profile;
}

export async function cacheStudentProfile(profile: StudentProfile): Promise<void> {
  const current_timestamp = Date.now();
  await AsyncStorage.setItem(
    STUDENT_PROFILE_CACHE_KEY,
    JSON.stringify({ timestamp: current_timestamp, data: profile })
  );
}

async function readStudentProfileCache(): Promise<StudentProfile | null> {
  const raw = await AsyncStorage.getItem(STUDENT_PROFILE_CACHE_KEY);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  if (!parsed) return null;

  if (parsed.timestamp >= Date.now() - CACHE_TIME_VALID) {
    return (parsed.data ?? null) as StudentProfile | null;
  }
  return null;
}

export async function getCachedStudentProfile(): Promise<StudentProfile | null> {
  return await readStudentProfileCache();
}

export async function clearStudentProfileCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STUDENT_PROFILE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const profile: StudentProfile | null = parsed?.data ?? null;

      const url = String(profile?.calendar_url ?? "").trim();
      if (url) {
        await removeCourseCalenderByUrl(url);
      }
    }
  } catch (e) {
    // best-effort cleanup, never fail the clear
    console.warn("Failed to remove course calendar during cache clear:", e);
  }

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
      cookies,
    }),
  });

  if (!resp.ok) throw new Error(`check-login HTTP ${resp.status}`);
  return (await resp.json()) as { status: 1; authenticated: boolean } | { status: 0; error: string };
}
