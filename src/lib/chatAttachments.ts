import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import { Platform } from "react-native";

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
const normalizeBaseUrl = (value: string) => value.replace(/\/+$/g, "");
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
    if (Platform.OS === "web" && typeof Blob !== "undefined") {
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

  const uploadType =
    (FileSystemLegacy as any).FileSystemUploadType?.BINARY_CONTENT ??
    (FileSystemLegacy as any).UploadType?.BINARY_CONTENT ??
    0;
  const mimeType = attachment.mimeType || "application/octet-stream";

  const trySignedNativeUpload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from(CHAT_ATTACHMENTS_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data?.signedUrl) {
        console.warn(
          "Attachment signed upload URL failed:",
          error?.message || "missing signed URL"
        );
        return false;
      }

      const result = await FileSystemLegacy.uploadAsync(
        data.signedUrl,
        attachment.uri,
        {
          httpMethod: "PUT",
          uploadType,
          headers: {
            "Content-Type": mimeType,
            "x-upsert": "false",
          },
        }
      );

      if (result.status >= 400) {
        console.warn(
          "Attachment signed upload failed:",
          result.status,
          result.body?.slice(0, 300) || ""
        );
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Attachment signed upload error:", err);
      return false;
    }
  };

  const tryNativeUpload = async () => {
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) return false;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("Attachment upload session error:", error.message);
      return false;
    }
    const token = data.session?.access_token;
    if (!token) return false;

    const url = `${normalizeBaseUrl(baseUrl)}/storage/v1/object/${CHAT_ATTACHMENTS_BUCKET}/${path}`;

    const result = await FileSystemLegacy.uploadAsync(url, attachment.uri, {
      httpMethod: "POST",
      uploadType,
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
    });

    if (result.status >= 400) {
      console.warn(
        "Attachment upload failed:",
        result.status,
        result.body?.slice(0, 300) || ""
      );
      return false;
    }
    return true;
  };

  if (Platform.OS !== "web") {
    const signedOk = await trySignedNativeUpload();
    if (signedOk) {
      return {
        path,
        name: attachment.name || safeName,
        mimeType: attachment.mimeType || null,
        size: typeof attachment.size === "number" ? attachment.size : null,
      };
    }

    const nativeOk = await tryNativeUpload();
    if (nativeOk) {
      return {
        path,
        name: attachment.name || safeName,
        mimeType: attachment.mimeType || null,
        size: typeof attachment.size === "number" ? attachment.size : null,
      };
    }
  }

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
  try {
    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch (err) {
    console.warn("Attachment signed URL request failed:", err);
    return null;
  }
}
