// src/lib/avatars.ts
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/src/lib/supabase";

export type AvatarDraft = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  base64?: string | null;
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

const guessFileName = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.fileName) return asset.fileName;
  const uri = asset.uri || "";
  const last = uri.split("/").pop();
  if (last) return last;
  return `avatar-${Date.now()}.jpg`;
};

const base64ToUint8Array = (value: string) => {
  const atobFn = (globalThis as any).atob;
  if (typeof atobFn !== "function") {
    throw new Error("Base64 decode not available on this platform.");
  }
  const binary = atobFn(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export async function pickAvatar(): Promise<AvatarDraft | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const mediaTypes = (ImagePicker as any).MediaType?.Images;
  const options: ImagePicker.ImagePickerOptions = {
    allowsEditing: false,
    base64: true,
    quality: 0.85,
  };
  if (mediaTypes) {
    options.mediaTypes = mediaTypes;
  }

  const result = await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    name: guessFileName(asset),
    mimeType: asset.mimeType || "image/jpeg",
    size: typeof asset.fileSize === "number" ? asset.fileSize : null,
    base64: asset.base64 || null,
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

  let body: Uint8Array | Blob;
  if (avatar.base64) {
    body = base64ToUint8Array(avatar.base64);
  } else {
    const response = await fetch(avatar.uri);
    if (!response.ok) {
      throw new Error(`Avatar read failed (${response.status})`);
    }
    body = await response.blob();
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, {
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
  try {
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.warn("Avatar signed URL failed:", error?.message ?? error);
      const fallback = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      return fallback?.data?.publicUrl ?? null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("Avatar signed URL request failed:", err);
    const fallback = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    return fallback?.data?.publicUrl ?? null;
  }
}
