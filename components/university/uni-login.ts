// components/university/uni-login.ts
import { supabase } from "@/src/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";


export type Country = { id: number; name: string };
export type University = { id: number; name: string; countryId: number };

export type LinkHubLink = { title: string; link: string };

export type UniConfig = {
  uniId: number;
  loginUrl: string;                 
  linkhubLinks: LinkHubLink[];          
  cookieLinks: string[];             
};

function ensureArray<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

const UNI_CFG_KEY = "uni:config";

export async function saveActiveUniConfig(cfg: UniConfig): Promise<void> {
  await AsyncStorage.setItem(UNI_CFG_KEY, JSON.stringify(cfg));
}

/** Load currently selected uni config */
export async function loadActiveUniConfig(): Promise<UniConfig | null> {
  const raw = await AsyncStorage.getItem(UNI_CFG_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.uniId !== "number") return null;

    return {
      uniId: parsed.uniId,
      loginUrl: typeof parsed.loginUrl === "string" ? parsed.loginUrl : "",
      linkhubLinks: ensureArray<LinkHubLink>(parsed.linkhubLinks),
      cookieLinks: ensureArray<string>(parsed.cookieLinks),
    };
  } catch {
    return null;
  }
}

export async function clearActiveUniConfig(): Promise<void> {
  await AsyncStorage.removeItem(UNI_CFG_KEY);
}

export async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .schema("uni")
    .from("countries")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Country[];
}

export async function fetchUniversities(countryId: number): Promise<University[]> {
  const { data, error } = await supabase
    .schema("uni")
    .from("universities")
    .select("id, name, country_id")
    .eq("country_id", countryId)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    countryId: r.country_id,
  }));
}

export async function fetchUniConfig(uniId: number): Promise<UniConfig> {
  const { data, error } = await supabase
    .schema("uni")
    .from("config")
    .select("uni_id, login_link, linkhub_links, cookie_links")
    .eq("uni_id", uniId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const cfg: UniConfig = {
    uniId: data?.uni_id ?? uniId,
    loginUrl: data?.login_link ?? "",
    linkhubLinks: data?.linkhub_links ?? [],
    cookieLinks: ensureArray<string>(data?.cookie_links),
  };

  await saveActiveUniConfig(cfg);
  return cfg;
}

export async function fetchActiveUniConfig(): Promise<UniConfig | null> {
  return await loadActiveUniConfig();
}