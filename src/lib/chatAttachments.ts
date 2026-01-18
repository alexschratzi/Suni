import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { supabase } from "@/src/lib/supabase";

export type AttachmentDraft = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

export type AttachmentMeta = {
  path: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};

// Match this bucket name in Supabase Storage.
export const CHAT_ATTACHMENTS_BUCKET = "chat_attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, "_");
const normalizePrefix = (prefix: string) => prefix.replace(/\/+$/g, "");
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

const readFileBody = async (uri: string, mimeType?: string | null) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToUint8Array(base64);
    if (typeof Blob !== "undefined") {
      return new Blob([bytes], { type: mimeType || "application/octet-stream" });
    }
    return bytes;
  } catch (err) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Attachment read failed (${response.status})`);
    }
    return await response.blob();
  }
};

export async function pickAttachment(): Promise<AttachmentDraft | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  const uri = (asset as any)?.fileCopyUri || asset?.uri;
  if (!uri) return null;

  return {
    uri,
    name: asset.name || "file",
    mimeType: asset.mimeType || null,
    size: typeof asset.size === "number" ? asset.size : null,
  };
}

export async function uploadAttachment(
  attachment: AttachmentDraft,
  pathPrefix: string
): Promise<AttachmentMeta> {
  const safeName = sanitizeFileName(attachment.name || "file");
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const fileName = `${Date.now()}-${randomSuffix}-${safeName}`;
  const path = `${normalizePrefix(pathPrefix)}/${fileName}`;

  const body = await readFileBody(attachment.uri, attachment.mimeType);

  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, body, {
      contentType: attachment.mimeType || "application/octet-stream",
      upsert: false,
    });

  if (error) throw error;

  return {
    path,
    name: attachment.name || safeName,
    mimeType: attachment.mimeType || null,
    size: typeof attachment.size === "number" ? attachment.size : null,
  };
}

export async function createAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
