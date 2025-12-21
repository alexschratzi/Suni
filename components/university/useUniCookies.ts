import * as React from "react";
import CookieManager from "@react-native-cookies/cookies";
import type { CookieJsonRecord } from "../../src/server/uniScraper";
import type { UniConfig } from "./uni-login";

export function useUniCookies(uniCfg: UniConfig | null) {
  const cookieDomains = React.useMemo(() => {
    const base: string[] = [
      "https://login.microsoftonline.com",
      "https://login.microsoft.com",
      "https://sts.windows.net",
    ];

    if (uniCfg?.loginUrl) {
      try {
        base.push(new URL(uniCfg.loginUrl).origin);
      } catch {
        // ignore
      }
    }
    return base;
  }, [uniCfg?.loginUrl]);

  const relevantName = React.useCallback((name: string) => {
    const n = name.toLowerCase();
    return (
      n.startsWith("_shibsession_") ||
      n.startsWith("_shibstate_") ||
      n.startsWith("estsauth") ||
      n.startsWith("esctx") ||
      n === "buid" ||
      n === "msfpc" ||
      n === "mc1" ||
      n === "ms0" ||
      n === "portal_version"
    );
  }, []);

  const collectCookies = React.useCallback(async (): Promise<Record<string, CookieJsonRecord>> => {
    const merged: Record<string, CookieJsonRecord> = {};

    for (const d of cookieDomains) {
      try {
        const got = await CookieManager.get(d);
        if (!got) continue;

        for (const [name, c] of Object.entries(got)) {
          const cookieAny = c as any;
          merged[name] = {
            name,
            value: String(cookieAny?.value ?? ""),
            path: cookieAny?.path ?? "/",
            secure: Boolean(cookieAny?.secure ?? true),
            httpOnly: Boolean(cookieAny?.httpOnly ?? true),
            domain: cookieAny?.domain ?? null,
          };
        }
      } catch (err) {
        console.warn("Cookie fetch error for", d, err);
      }
    }

    return merged;
  }, [cookieDomains]);

  const buildCookiesJson = React.useCallback(
    (src: Record<string, CookieJsonRecord>, onlyRelevant: boolean) => {
      const out: Record<string, CookieJsonRecord> = {};
      for (const [name, rec] of Object.entries(src)) {
        if (!onlyRelevant || relevantName(name)) {
          out[name] = {
            httpOnly: Boolean(rec.httpOnly),
            path: rec.path ?? "/",
            value: String(rec.value ?? ""),
            secure: Boolean(rec.secure),
            domain: rec.domain ?? null,
            name,
          };
        }
      }
      return out;
    },
    [relevantName]
  );

  return { cookieDomains, collectCookies, buildCookiesJson };
}
