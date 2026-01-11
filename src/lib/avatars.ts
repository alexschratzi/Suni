import * as DocumentPicker from "expo-document-picker";

import { supabase } from "@/src/lib/supabase";

export type AvatarDraft = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export type AvatarMeta = {
  path: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

// Match this bucket name in Supabase Storage.
export const AVATAR_BUCKET = "avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24;

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, "_");
const normalizePrefix = (prefix: string) => prefix.replace(/\/+$/g, "");

export async function pickAvatar(): Promise<AvatarDraft | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "image/*",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    name: asset.name || "avatar",
    mimeType: asset.mimeType || null,
    size: typeof asset.size === "number" ? asset.size : null,
  };
}

export async function uploadAvatar(
  avatar: AvatarDraft,
  userId: string
): Promise<AvatarMeta> {
  const safeName = sanitizeFileName(avatar.name || "avatar");
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const fileName = `${Date.now()}-${randomSuffix}-${safeName}`;
  const path = `${normalizePrefix(userId)}/${fileName}`;

  const response = await fetch(avatar.uri);
  if (!response.ok) {
    throw new Error(`Avatar read failed (${response.status})`);
  }
  const blob = await response.blob();

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: avatar.mimeType || "image/jpeg",
    upsert: true,
  });

  if (error) throw error;

  return {
    path,
    name: avatar.name || safeName,
    mimeType: avatar.mimeType || null,
    size: typeof avatar.size === "number" ? avatar.size : null,
  };
}

export async function createAvatarUrl(
  path?: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
