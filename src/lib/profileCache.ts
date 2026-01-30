import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "@/src/lib/supabase";
import { TABLES, COLUMNS } from "@/src/lib/supabaseTables";
import { createAvatarUrl } from "@/src/lib/avatars";

export type CachedProfile = {
  id: string;
  username?: string | null;
  role?: string | null;
  avatarPath?: string | null;
  avatarUrl?: string | null;
  updatedAt: number;
  avatarUrlExpiresAt?: number | null;
};

type CachedProfileMap = Record<string, CachedProfile>;

const PROFILE_CACHE_KEY = "profileCache.v1";
const PROFILE_TTL_MS = 12 * 60 * 60 * 1000;
const AVATAR_URL_TTL_MS = 20 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const memoryCache = new Map<string, CachedProfile>();
let hydratePromise: Promise<void> | null = null;

const now = () => Date.now();

const isStale = (entry: CachedProfile, timestamp: number) =>
  timestamp - entry.updatedAt > PROFILE_TTL_MS;

const needsAvatarRefresh = (entry: CachedProfile, timestamp: number) =>
  !!entry.avatarPath &&
  (!entry.avatarUrl || !entry.avatarUrlExpiresAt || entry.avatarUrlExpiresAt <= timestamp);

const hydrateCache = async () => {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CachedProfileMap;
      Object.values(parsed).forEach((entry) => {
        if (!entry?.id) return;
        memoryCache.set(entry.id, entry);
      });
    } catch (err) {
      console.warn("Profile cache hydrate failed:", err);
    }
  })();
  return hydratePromise;
};

const persistCache = async () => {
  try {
    const entries = Array.from(memoryCache.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    const trimmed = entries.slice(0, MAX_CACHE_ENTRIES);
    const payload: CachedProfileMap = {};
    trimmed.forEach((entry) => {
      payload[entry.id] = entry;
    });
    await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Profile cache persist failed:", err);
  }
};

export const getMemoryProfiles = (ids: string[]) => {
  const result: CachedProfileMap = {};
  ids.forEach((id) => {
    const entry = memoryCache.get(id);
    if (entry) result[id] = entry;
  });
  return result;
};

export const getCachedProfile = async (id: string) => {
  await hydrateCache();
  return memoryCache.get(id) ?? null;
};

export const upsertProfilesCache = async (
  entries: Array<Partial<CachedProfile> & { id: string }>
) => {
  if (!entries.length) return;
  await hydrateCache();
  const timestamp = now();
  entries.forEach((entry) => {
    const existing = memoryCache.get(entry.id);
    const avatarPath =
      entry.avatarPath ?? existing?.avatarPath ?? null;
    const reuseAvatar = existing && existing.avatarPath === avatarPath;
    const nextAvatarUrl =
      entry.avatarUrl ?? (reuseAvatar ? existing?.avatarUrl ?? null : null);
    const nextAvatarExpires =
      entry.avatarUrlExpiresAt ??
      (entry.avatarUrl ? timestamp + AVATAR_URL_TTL_MS : null) ??
      (reuseAvatar ? existing?.avatarUrlExpiresAt ?? null : null);

    memoryCache.set(entry.id, {
      id: entry.id,
      username: entry.username ?? existing?.username ?? null,
      role: entry.role ?? existing?.role ?? null,
      avatarPath,
      avatarUrl: nextAvatarUrl,
      avatarUrlExpiresAt: nextAvatarExpires,
      updatedAt: timestamp,
    });
  });
  await persistCache();
};

export const fetchProfilesWithCache = async (
  ids: string[],
  options?: { force?: boolean }
) => {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};

  await hydrateCache();
  const timestamp = now();
  const force = options?.force ?? false;

  const toFetch: string[] = [];
  const toRefreshAvatar: string[] = [];

  unique.forEach((id) => {
    const entry = memoryCache.get(id);
    if (!entry || force) {
      toFetch.push(id);
      return;
    }
    if (isStale(entry, timestamp)) {
      toFetch.push(id);
      return;
    }
    if (needsAvatarRefresh(entry, timestamp)) {
      toRefreshAvatar.push(id);
    }
  });

  if (toFetch.length > 0) {
    let data: any = null;
    let error: any = null;
    try {
      const response = await supabase
        .from(TABLES.profiles)
        .select(
          [
            COLUMNS.profiles.id,
            COLUMNS.profiles.username,
            COLUMNS.profiles.role,
            COLUMNS.profiles.avatarPath,
          ].join(",")
        )
        .in(COLUMNS.profiles.id, toFetch);
      data = response.data;
      error = response.error;
    } catch (err) {
      console.error("Profile cache load error:", err);
      error = err;
    }

    if (error) {
      if (error?.message) {
        console.error("Profile cache load error:", error.message);
      }
    } else {
      const seen = new Set<string>();
      const updates: CachedProfile[] = [];

      (data || []).forEach((row: any) => {
        const id = row?.[COLUMNS.profiles.id];
        if (!id) return;
        seen.add(id);

        const avatarPath = row?.[COLUMNS.profiles.avatarPath] ?? null;
        const existing = memoryCache.get(id);
        const reuseAvatar =
          existing && existing.avatarPath === avatarPath && !needsAvatarRefresh(existing, timestamp);

        updates.push({
          id,
          username: row?.[COLUMNS.profiles.username] ?? null,
          role: row?.[COLUMNS.profiles.role] ?? null,
          avatarPath,
          avatarUrl: reuseAvatar ? existing?.avatarUrl ?? null : null,
          avatarUrlExpiresAt: reuseAvatar ? existing?.avatarUrlExpiresAt ?? null : null,
          updatedAt: timestamp,
        });
      });

      toFetch.forEach((id) => {
        if (seen.has(id)) return;
        updates.push({
          id,
          username: null,
          role: null,
          avatarPath: null,
          avatarUrl: null,
          avatarUrlExpiresAt: null,
          updatedAt: timestamp,
        });
      });

      const resolved = await Promise.all(
        updates.map(async (entry) => {
          if (entry.avatarPath && !entry.avatarUrl) {
            try {
              const url = await createAvatarUrl(entry.avatarPath);
              return {
                ...entry,
                avatarUrl: url,
                avatarUrlExpiresAt: url ? timestamp + AVATAR_URL_TTL_MS : null,
              };
            } catch (err) {
              console.warn("Profile avatar URL load failed:", err);
              return entry;
            }
          }
          return entry;
        })
      );

      resolved.forEach((entry) => {
        memoryCache.set(entry.id, entry);
      });
    }
  }

  if (toRefreshAvatar.length > 0) {
    const refreshed = await Promise.all(
      toRefreshAvatar.map(async (id) => {
        const entry = memoryCache.get(id);
        if (!entry?.avatarPath) return null;
        let url: string | null = null;
        try {
          url = await createAvatarUrl(entry.avatarPath);
        } catch (err) {
          console.warn("Profile avatar refresh failed:", err);
        }
        return [
          id,
          {
            ...entry,
            avatarUrl: url,
            avatarUrlExpiresAt: url ? timestamp + AVATAR_URL_TTL_MS : null,
            updatedAt: timestamp,
          },
        ] as const;
      })
    );

    refreshed.forEach((entry) => {
      if (!entry) return;
      memoryCache.set(entry[0], entry[1]);
    });
  }

  if (toFetch.length > 0 || toRefreshAvatar.length > 0) {
    await persistCache();
  }

  const result: CachedProfileMap = {};
  unique.forEach((id) => {
    const entry = memoryCache.get(id);
    if (entry) result[id] = entry;
  });
  return result;
};
