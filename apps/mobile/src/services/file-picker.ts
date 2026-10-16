import * as DocumentPicker from "expo-document-picker";
import {
  ALLOWED_STORY_MEDIA_MIME_TYPES,
  resolveBoundedMimeType,
  verifyFileContentSignature,
  type AllowedStoryMediaMimeType,
  type StoryMediaSelectedFile
} from "../domain/models";

/**
 * Cross-platform Expo file picker adapter for Newsroom Story Media.
 * Enforces real file selection, exact byte reading, filename presence,
 * bounded canonical MIME resolution, and byte-level signature verification.
 */
export async function pickStoryMediaFile(): Promise<StoryMediaSelectedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    type: [...ALLOWED_STORY_MEDIA_MIME_TYPES]
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset) {
    return null;
  }
  const rawName = asset.name?.trim();
  if (!rawName) {
    throw new Error("File selection failed: document picker returned no usable filename.");
  }
  const filename = rawName;

  // 1. Resolve exact bytes across Web and Native
  let bytes: Uint8Array;
  if ((asset as any).file && typeof (asset as any).file.arrayBuffer === "function") {
    // Web: DocumentPicker provides Web File/Blob object
    const buffer = await (asset as any).file.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else if (asset.uri) {
    // Native (iOS/Android): fetch local file:// or content:// URI to ArrayBuffer
    const response = await fetch(asset.uri);
    const buffer = await response.arrayBuffer();
    bytes = new Uint8Array(buffer);
  } else {
    throw new Error(`Failed to read bytes for selected file "${filename}".`);
  }

  const byteSize = bytes.byteLength;

  // 2. Resolve canonical MIME type safely with conflict check
  const resolvedMime = resolveBoundedMimeType(asset.mimeType, filename);
  if (!resolvedMime) {
    throw new Error(
      `Unsupported or unverified file type for "${filename}". Allowed types: JPEG, PNG, WebP, PDF, Plain Text, DOCX.`
    );
  }

  // 3. Verify byte-level signature against resolved MIME
  if (!verifyFileContentSignature(bytes, resolvedMime)) {
    throw new Error(
      `File content signature verification failed: bytes do not match expected format for ${resolvedMime} ("${filename}").`
    );
  }

  return {
    filename,
    mimeType: resolvedMime,
    byteSize,
    bytes,
    sourceUri: asset.uri
  };
}

/**
 * Helper to construct a validated StoryMediaSelectedFile from known bytes.
 * Used for deterministic testing and preview simulation.
 */
export function createSelectedFileFromBytes(
  paramsOrFilename:
    | string
    | {
        filename: string;
        bytes: Uint8Array;
        mimeType?: string | null;
        sourceUri?: string;
      },
  maybeBytes?: Uint8Array,
  maybeMimeType?: string | null,
  maybeSourceUri?: string
): StoryMediaSelectedFile {
  let filename = "";
  let bytes: Uint8Array;
  let rawMime: string | null | undefined = null;
  let sourceUri: string | undefined = undefined;

  if (typeof paramsOrFilename === "string") {
    filename = paramsOrFilename.trim();
    bytes = maybeBytes ?? new Uint8Array(0);
    rawMime = maybeMimeType;
    sourceUri = maybeSourceUri;
  } else {
    filename = (paramsOrFilename.filename || "").trim();
    bytes = paramsOrFilename.bytes;
    rawMime = paramsOrFilename.mimeType;
    sourceUri = paramsOrFilename.sourceUri;
  }

  if (!filename) {
    throw new Error("File creation failed: filename is required and cannot be empty.");
  }

  const resolvedMime = resolveBoundedMimeType(rawMime, filename);
  if (!resolvedMime) {
    throw new Error(
      `Unsupported or unverified file type for "${filename}". Allowed types: JPEG, PNG, WebP, PDF, Plain Text, DOCX.`
    );
  }

  if (!verifyFileContentSignature(bytes, resolvedMime)) {
    throw new Error(
      `File content signature verification failed: bytes do not match expected format for ${resolvedMime} ("${filename}").`
    );
  }

  return {
    filename,
    mimeType: resolvedMime,
    byteSize: bytes.byteLength,
    bytes,
    sourceUri
  };
}
