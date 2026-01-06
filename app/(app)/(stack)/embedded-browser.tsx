// app/(app)/(stack)/embedded-browser.tsx
import * as React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import EmbeddedBrowser from "@/components/EmbeddedBrowser/EmbeddedBrowser";
import type { LoginDetectionConfig, UniConfig } from "@/components/university/uni-login";
import CookieManager from "@react-native-cookies/cookies";
import { useUniversity } from "@/components/university/UniversityContext";

type CookieJsonRecord = {
  httpOnly: boolean;
  path: string;
  value: string;
  secure: boolean;
  domain: string | null;
  name: string;
};

export default function EmbeddedBrowserScreen() {
  const router = useRouter();
  const { university, acknowledgeLogin } = useUniversity();

  const params = useLocalSearchParams<{
    url?: string;
    title?: string;
    loginDetection?: string; // JSON
    loginUrlOrigin?: string; // optional, to derive cookie domain reliably
  }>();

  const url = typeof params.url === "string" ? params.url : "";
  const title = typeof params.title === "string" ? params.title : "Browser";

  const loginDetection: LoginDetectionConfig | undefined = React.useMemo(() => {
    if (typeof params.loginDetection !== "string") return undefined;
    try {
      return JSON.parse(params.loginDetection) ?? undefined;
    } catch {
      return undefined;
    }
  }, [params.loginDetection]);

  const cookieDomains = React.useMemo(() => {
    const base = [
      "https://login.microsoftonline.com",
      "https://login.microsoft.com",
      "https://sts.windows.net",
    ];

    // try to include the university login origin
    const origin =
      typeof params.loginUrlOrigin === "string"
        ? params.loginUrlOrigin
        : (() => {
            try {
              return url ? new URL(url).origin : null;
            } catch {
              return null;
            }
          })();

    if (origin) base.push(origin);
    return base;
  }, [params.loginUrlOrigin, url]);

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

  const sendCookiesToScraper = React.useCallback(
    async (cookiesJson: Record<string, CookieJsonRecord>) => {
      const payload = {
        university_id: String(university?.id ?? ""),
        cookies: cookiesJson,
      };

      const resp = await fetch("https://uni-scraper.eliasbader.de/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await resp.text();
      console.log("uni-scraper response:", txt);
    },
    [university?.id]
  );

  const handleLoginDetected = React.useCallback(
    async (finalUrl: string) => {
      console.log("Login detected at", finalUrl);

      try {
        const merged = await collectCookies();
        const cookiesJson = buildCookiesJson(merged, true);
        await sendCookiesToScraper(cookiesJson);
      } catch (e: any) {
        console.warn("Failed to collect/send cookies:", e?.message || String(e));
      } finally {
        await acknowledgeLogin();
        router.back();
      }
    },
    [acknowledgeLogin, buildCookiesJson, collectCookies, router, sendCookiesToScraper]
  );

  return (
    <EmbeddedBrowser
      initialUrl={url}
      title={title}
      loginDetection={loginDetection}
      onClose={() => router.back()}
      onLoginDetected={handleLoginDetected}
    />
  );
}

