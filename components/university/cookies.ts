// components/university/cookies.ts
import CookieManager from "@react-native-cookies/cookies";

export type CookieJsonRecord = {
  httpOnly: boolean;
  path: string;
  value: string;
  secure: boolean;
  domain: string | null;
  name: string;
};

export type CookiesByOrigin = Record<string, Record<string, CookieJsonRecord>>;

export function cookieFingerprint(cookiesByOrigin: CookiesByOrigin): string {
  const origins = Object.keys(cookiesByOrigin).sort();

  return origins
    .map((origin) => {
      const cookies = cookiesByOrigin[origin] || {};
      const names = Object.keys(cookies).sort();

      const fpPart = names
        .map((name) => {
          const v = cookies[name]?.value ?? "";
          return `${name}:${v.length}:${v.slice(0, 8)}`;
        })
        .join(",");

      return `${origin}=>${fpPart}`;
    })
    .join("|");
}

export function countCookies(cookiesByOrigin: CookiesByOrigin): number {
  let n = 0;
  for (const origin of Object.keys(cookiesByOrigin)) {
    n += Object.keys(cookiesByOrigin[origin] || {}).length;
  }
  return n;
}

export async function collectCookiesByOrigin(origins: string[]): Promise<CookiesByOrigin> {
  const out: CookiesByOrigin = {};

  for (const origin of origins) {
    try {
      const got = await CookieManager.get(origin);
      if (!got) continue;

      const bucket: Record<string, CookieJsonRecord> = {};
      for (const [name, c] of Object.entries(got)) {
        const cookieAny = c as any;
        bucket[name] = {
          name,
          value: String(cookieAny?.value ?? ""),
          path: cookieAny?.path ?? "/",
          secure: Boolean(cookieAny?.secure ?? true),
          httpOnly: Boolean(cookieAny?.httpOnly ?? true),
          domain: cookieAny?.domain ?? null,
        };
      }

      if (Object.keys(bucket).length > 0) out[origin] = bucket;
    } catch (err) {
      console.warn("Cookie fetch error for", origin, err);
    }
  }

  return out;
}

/**
 * Convert CookiesByOrigin -> flat cookies object expected by backend.
 * Domain is derived from origin hostname: ".login.microsoftonline.com" etc.
 *
 * If same name exists on multiple origins, LAST origin wins (origins are sorted).
 */
export function flattenToCookiesJson(cookiesByOrigin: CookiesByOrigin): Record<string, CookieJsonRecord> {
  const flat: Record<string, CookieJsonRecord> = {};

  const origins = Object.keys(cookiesByOrigin).sort();
  for (const origin of origins) {
    const host = safeHostname(origin);
    const domain = host ? `.${host}` : null;

    const cookies = cookiesByOrigin[origin] || {};
    const names = Object.keys(cookies).sort();

    for (const name of names) {
      const c = cookies[name];
      flat[name] = {
        name,
        value: String(c.value ?? ""),
        path: c.path ?? "/",
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        domain,
      };
    }
  }

  return flat;
}

function safeHostname(origin: string): string | null {
  try {
    return new URL(origin).hostname || null;
  } catch {
    return null;
  }
}

export async function clearAllCookies(): Promise<void> {
  try {
    await CookieManager.clearAll(true);
  } catch (err) {
    console.warn("clearAllCookies failed:", err);
  }
}