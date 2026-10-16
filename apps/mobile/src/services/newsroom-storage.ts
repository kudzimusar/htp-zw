import { getStagingSupabaseClient } from "../platform/supabase";
import { isValidSha256Checksum } from "../domain/models";

/**
 * Compute SHA-256 hexadecimal hash across exact file bytes.
 * Universal support across modern browsers (SubtleCrypto) and Node.js test runners.
 */
export async function computeSha256Hex(
  bytes: Uint8Array | ArrayBuffer | Blob
): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (bytes instanceof ArrayBuffer) {
    arrayBuffer = bytes;
  } else if (bytes instanceof Uint8Array) {
    arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
  } else if (typeof Blob !== "undefined" && bytes instanceof Blob) {
    arrayBuffer = await bytes.arrayBuffer();
  } else {
    throw new Error("Invalid byte input for SHA-256 computation.");
  }

  // 1. Try modern Web Crypto API (SubtleCrypto)
  if (
    typeof globalThis.crypto !== "undefined" &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === "function"
  ) {
    const hashBuffer = await globalThis.crypto.subtle.digest(
      "SHA-256",
      arrayBuffer
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase();
  }

  // 2. Node.js environment fallback
  try {
    // Dynamic import to prevent bundler issues in React Native web
    const nodeCrypto = await (Function('return import("crypto")')() as Promise<any>);
    const hash = nodeCrypto.createHash("sha256");
    const nodeBuffer =
      (globalThis as any).Buffer ||
      (await (Function('return import("buffer")')() as Promise<any>)).Buffer;
    hash.update(nodeBuffer.from(arrayBuffer));
    return hash.digest("hex").toLowerCase();
  } catch (err) {
    throw new Error(
      "SHA-256 cryptographic hashing is not available in the current runtime environment."
    );
  }
}

export interface NewsroomStorageService {
  uploadPrivateObject(
    bucket: string,
    key: string,
    bytes: Uint8Array | ArrayBuffer | Blob,
    mimeType: string,
    clientOverride?: any
  ): Promise<void>;
  downloadPrivateObject(
    bucket: string,
    key: string,
    clientOverride?: any
  ): Promise<{ bytes: ArrayBuffer; checksum: string }>;
  copyPrivateToPublic(
    privateBucket: string,
    privateKey: string,
    publicBucket: string,
    publicKey: string,
    mimeType: string,
    expectedChecksum?: string | null,
    clientOverride?: any
  ): Promise<{ verifiedChecksum: string }>;
  deleteStagedPublicObject(bucket: string, key: string, clientOverride?: any): Promise<void>;
}

export const newsroomStorageService: NewsroomStorageService = {
  async uploadPrivateObject(
    bucket: string,
    key: string,
    bytes: Uint8Array | ArrayBuffer | Blob,
    mimeType: string
  ): Promise<void> {
    const client = getStagingSupabaseClient() as any;
    if (!client || !client.storage) {
      throw new Error("Supabase Storage client is not available.");
    }

    const { error } = await client.storage
      .from(bucket)
      .upload(key, bytes, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      throw new Error(
        error.message || `Failed to upload object to ${bucket}/${key}.`
      );
    }
  },

  async downloadPrivateObject(
    bucketOrKey: string,
    keyOrClient?: string | any,
    clientOverride?: any
  ): Promise<{ bytes: ArrayBuffer; checksum: string }> {
    let bucket = "newsroom-private";
    let key = bucketOrKey;
    let client = clientOverride;

    if (typeof keyOrClient === "string") {
      bucket = bucketOrKey;
      key = keyOrClient;
    } else if (keyOrClient && typeof keyOrClient === "object") {
      client = keyOrClient;
    }

    client = client || getStagingSupabaseClient();
    if (!client || !client.storage) {
      throw new Error("Supabase Storage client is not available.");
    }

    const { data, error } = await client.storage.from(bucket).download(key);
    if (error || !data) {
      throw new Error(
        error?.message || `Failed to download object from ${bucket}/${key}.`
      );
    }

    let arrayBuffer: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
      arrayBuffer = data;
    } else if (typeof data.arrayBuffer === "function") {
      arrayBuffer = await data.arrayBuffer();
    } else if (data.buffer instanceof ArrayBuffer) {
      arrayBuffer = data.buffer;
    } else {
      throw new Error("Unexpected data type returned from Storage download.");
    }

    const checksum = await computeSha256Hex(arrayBuffer);
    return { bytes: arrayBuffer, checksum };
  },

  async copyPrivateToPublic(
    arg1: string,
    arg2: string,
    arg3: string,
    arg4?: string | null,
    arg5?: string | any,
    arg6?: string | null,
    arg7?: any
  ): Promise<{ verifiedChecksum: string }> {
    let privateBucket = "newsroom-private";
    let privateKey = arg1;
    let publicBucket = "newsroom-public";
    let publicKey = arg2;
    let mimeType = arg3;
    let expectedChecksum: string | null = arg4 ?? null;
    let clientOverride: any = arg5;

    // Check if called with explicit buckets: (privateBucket, privateKey, publicBucket, publicKey, mimeType, expectedChecksum, clientOverride)
    if (typeof arg5 === "string" && (arg1 === "newsroom-private" || arg1.includes("private") || arg1 === "media")) {
      privateBucket = arg1;
      privateKey = arg2;
      publicBucket = arg3;
      publicKey = arg4!;
      mimeType = arg5;
      expectedChecksum = arg6 ?? null;
      clientOverride = arg7;
    }

    const client = clientOverride || getStagingSupabaseClient();
    if (!client || !client.storage) {
      throw new Error("Supabase Storage client is not available.");
    }

    const { bytes, checksum } = await this.downloadPrivateObject(
      privateBucket,
      privateKey,
      client
    );

    if (
      expectedChecksum &&
      isValidSha256Checksum(expectedChecksum) &&
      expectedChecksum.toLowerCase() !== checksum.toLowerCase()
    ) {
      throw new Error(
        `CHECKSUM VERIFICATION FAILED: Downloaded private object checksum (${checksum}) does not match recorded canonical checksum (${expectedChecksum}).`
      );
    }

    const { error } = await client.storage
      .from(publicBucket)
      .upload(publicKey, bytes, {
        contentType: mimeType,
        upsert: true
      });

    if (error) {
      throw new Error(
        error.message ||
          `Failed to stage public object to ${publicBucket}/${publicKey}.`
      );
    }

    return { verifiedChecksum: checksum };
  },

  async deleteStagedPublicObject(
    bucketOrKey: string,
    keyOrClient?: string | any,
    clientOverride?: any
  ): Promise<void> {
    let bucket = "newsroom-public";
    let key = bucketOrKey;
    let client = clientOverride;

    if (typeof keyOrClient === "string") {
      bucket = bucketOrKey;
      key = keyOrClient;
    } else if (keyOrClient && typeof keyOrClient === "object") {
      client = keyOrClient;
    }

    client = client || getStagingSupabaseClient();
    if (!client || !client.storage) {
      return;
    }

    try {
      await client.storage.from(bucket).remove([key]);
    } catch (err) {
      // Bounded cleanup failure must not throw fatal error, logged gracefully
      console.warn(`[newsroom-storage] Cleanup of ${bucket}/${key} failed:`, err);
    }
  }
};

export const uploadPrivateObject = newsroomStorageService.uploadPrivateObject.bind(newsroomStorageService);
export const downloadPrivateObject = newsroomStorageService.downloadPrivateObject.bind(newsroomStorageService);
export const copyPrivateToPublic = newsroomStorageService.copyPrivateToPublic.bind(newsroomStorageService);
export const deleteStagedPublicObject = newsroomStorageService.deleteStagedPublicObject.bind(newsroomStorageService);
