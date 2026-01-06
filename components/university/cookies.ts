// src/utils/cookies.ts
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
          const head = v.slice(0, 8);
          return `${name}:${v.length}:${head}`;
        })
        .join(",");

      return `${origin}=>${fpPart}`;
    })
    .join("|");
}

/**
 * Collect cookies grouped by origin.
 * - We intentionally ignore cookieAny.domain and keep domain=null, because CookieManager.get(origin)
 *   already scopes them to that origin.
 */
export async function collectCookiesByOrigin(
  origins: string[],
): Promise<CookiesByOrigin> {
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
          domain: null,
        };
      }

      if (Object.keys(bucket).length > 0) {
        out[origin] = bucket;
      }
    } catch (err) {
      console.warn("Cookie fetch error for", origin, err);
    }
  }

  return out;
}

/**
 * Convenience: count cookies across all origins.
 */
export function countCookies(cookiesByOrigin: CookiesByOrigin): number {
  let n = 0;
  for (const origin of Object.keys(cookiesByOrigin)) {
    n += Object.keys(cookiesByOrigin[origin] || {}).length;
  }
  return n;
}
