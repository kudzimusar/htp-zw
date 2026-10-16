import { getStagingSupabaseClient } from "../platform/supabase";
import {
  isValidSha256Checksum,
  validateStoryMediaUpload,
  type PrepareStoryMediaPayload,
  type StoryMediaUsageType,
  type UploadReconciliationState
} from "../domain/models";

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

export type CopyPrivateToCanonicalPublicParams = {
  storyId: string;
  mediaId: string;
  privateBucket?: string;
  privateKey: string;
  filename: string;
  mimeType: string;
  expectedChecksum?: string | null;
  clientOverride?: any;
};

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
  copyPrivateToCanonicalPublic(
    params: CopyPrivateToCanonicalPublicParams
  ): Promise<{ verifiedChecksum: string; publicKey: string }>;
  deleteStagedPublicObject(bucket: string, key: string, clientOverride?: any): Promise<void>;
}

export const newsroomStorageService: NewsroomStorageService = {
  async uploadPrivateObject(
    bucket: string,
    key: string,
    bytes: Uint8Array | ArrayBuffer | Blob,
    mimeType: string,
    clientOverride?: any
  ): Promise<void> {
    const client = clientOverride || getStagingSupabaseClient();
    if (!client || !client.storage) {
      throw new Error("Supabase Storage client is not available.");
    }

    const { error } = await client.storage
      .from(bucket)
      .upload(key, bytes, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      const isDuplicate =
        error.statusCode === 409 ||
        error.statusCode === "409" ||
        /already exists|duplicate|The resource already exists/i.test(error.message || "");

      if (isDuplicate) {
        // Download and verify checksum under existing authority
        const expectedChecksum = await computeSha256Hex(bytes);
        const { checksum: existingChecksum } = await this.downloadPrivateObject(
          bucket,
          key,
          client
        );
        if (existingChecksum.toLowerCase() === expectedChecksum.toLowerCase()) {
          // Deterministic object already uploaded with identical checksum
          return;
        }
        throw new Error(
          `RECONCILIATION ERROR: Private object already exists at ${bucket}/${key} with different checksum (${existingChecksum} vs expected ${expectedChecksum}).`
        );
      }

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

  async copyPrivateToCanonicalPublic({
    storyId,
    mediaId,
    privateBucket = "newsroom-private",
    privateKey,
    filename,
    mimeType,
    expectedChecksum = null,
    clientOverride
  }: CopyPrivateToCanonicalPublicParams): Promise<{ verifiedChecksum: string; publicKey: string }> {
    const client = clientOverride || getStagingSupabaseClient();
    if (!client || !client.storage) {
      throw new Error("Supabase Storage client is not available.");
    }

    // 1. Download private object
    const { bytes, checksum: calculatedChecksum } = await this.downloadPrivateObject(
      privateBucket,
      privateKey,
      client
    );

    // 2. Validate against expected checksum if present
    if (
      expectedChecksum &&
      isValidSha256Checksum(expectedChecksum) &&
      expectedChecksum.toLowerCase() !== calculatedChecksum.toLowerCase()
    ) {
      throw new Error(
        `CHECKSUM VERIFICATION FAILED: Downloaded private object checksum (${calculatedChecksum}) does not match recorded canonical checksum (${expectedChecksum}).`
      );
    }

    const verifiedChecksum = calculatedChecksum;

    // 3. Build canonical public key
    const safeFilename = filename
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const publicKey = `story-media/${storyId.trim()}/${mediaId.trim()}/${verifiedChecksum}/${safeFilename}`;

    // 4. Upload to newsroom-public with upsert: false
    const { error } = await client.storage
      .from("newsroom-public")
      .upload(publicKey, bytes, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      const isDuplicate =
        error.statusCode === 409 ||
        error.statusCode === "409" ||
        /already exists|duplicate|The resource already exists/i.test(error.message || "");

      if (isDuplicate) {
        // Verify existing public object checksum before continuing
        const { checksum: existingPublicChecksum } = await this.downloadPrivateObject(
          "newsroom-public",
          publicKey,
          client
        );
        if (existingPublicChecksum.toLowerCase() === verifiedChecksum.toLowerCase()) {
          return { verifiedChecksum, publicKey };
        }
        throw new Error(
          `RECONCILIATION ERROR: Public object already exists at newsroom-public/${publicKey} with different checksum (${existingPublicChecksum} vs expected ${verifiedChecksum}).`
        );
      }

      throw new Error(
        error.message || `Failed to stage public object to newsroom-public/${publicKey}.`
      );
    }

    return { verifiedChecksum, publicKey };
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
        upsert: false
      });

    if (error) {
      const isDuplicate =
        error.statusCode === 409 ||
        error.statusCode === "409" ||
        /already exists|duplicate|The resource already exists/i.test(error.message || "");

      if (isDuplicate) {
        const { checksum: existingPublicChecksum } = await this.downloadPrivateObject(
          publicBucket,
          publicKey,
          client
        );
        if (existingPublicChecksum.toLowerCase() === checksum.toLowerCase()) {
          return { verifiedChecksum: checksum };
        }
        throw new Error(
          `RECONCILIATION ERROR: Public object already exists at ${publicBucket}/${publicKey} with different checksum (${existingPublicChecksum} vs expected ${checksum}).`
        );
      }

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
      throw new Error("Supabase Storage client is not available.");
    }

    const { error } = await client.storage.from(bucket).remove([key]);
    if (error) {
      throw new Error(error.message || `Failed to delete public object from ${bucket}/${key}.`);
    }
  }
};

export const uploadPrivateObject = newsroomStorageService.uploadPrivateObject.bind(newsroomStorageService);
export const downloadPrivateObject = newsroomStorageService.downloadPrivateObject.bind(newsroomStorageService);
export const copyPrivateToPublic = newsroomStorageService.copyPrivateToPublic.bind(newsroomStorageService);
export const copyPrivateToCanonicalPublic = newsroomStorageService.copyPrivateToCanonicalPublic.bind(newsroomStorageService);
export const deleteStagedPublicObject = newsroomStorageService.deleteStagedPublicObject.bind(newsroomStorageService);

// =========================================================================
// DEFECT B: STAGE COMPENSATION ORCHESTRATION HELPER
// =========================================================================

export interface StageCompensationDeps {
  stageRpc: () => Promise<unknown>;
  getCanonicalPlan: () => Promise<Array<{ mediaId: string; mediaStatus: string }>>;
  deletePublicObject: (bucket: string, key: string) => Promise<void>;
}

export type StageCompensationOutcome =
  | { outcome: "committed"; message?: string }
  | { outcome: "rollback_complete"; message: string }
  | { outcome: "reconciliation_required"; error: Error };

/**
 * Orchestrates public staging RPC call and bounded compensation on failure.
 *
 * Requirements (Defect B):
 * - stage RPC fails -> refresh canonical plan
 * - if canonical state = public_staged: preserve public object, treat stage as committed, return success
 * - else: attempt exact-key public cleanup
 *   - if cleanup succeeds: report "STAGE FAILED — PUBLIC STORAGE ROLLBACK COMPLETE"
 *   - if cleanup fails: report "RECONCILIATION REQUIRED"
 * - Does not catch success-rollback as a cleanup exception.
 */
export async function orchestrateStageCompensation(
  storyId: string,
  mediaId: string,
  publicKey: string,
  deps: StageCompensationDeps
): Promise<StageCompensationOutcome> {
  try {
    await deps.stageRpc();
    return { outcome: "committed" };
  } catch (rpcErr) {
    // 1. Refresh canonical plan to see if RPC committed despite response error
    let refreshedItems: Array<{ mediaId: string; mediaStatus: string }> = [];
    try {
      refreshedItems = await deps.getCanonicalPlan();
    } catch {
      // ignore plan refresh error
    }

    const item = refreshedItems.find((p) => p.mediaId === mediaId);
    if (item && item.mediaStatus === "public_staged") {
      // Preserved public object; treat stage as committed
      return {
        outcome: "committed",
        message: "Stage promotion committed despite response network error."
      };
    }

    // 2. Canonical state is NOT public_staged (e.g. private_ready) -> attempt cleanup
    try {
      await deps.deletePublicObject("newsroom-public", publicKey);
    } catch (cleanupErr) {
      // Cleanup failed -> RECONCILIATION REQUIRED
      const message = `RECONCILIATION REQUIRED: Stage promotion failed (${
        rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
      }) and public storage cleanup also failed (${
        cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
      }) for public key "${publicKey}".`;
      return {
        outcome: "reconciliation_required",
        error: new Error(message)
      };
    }

    // Cleanup succeeded -> distinct rollback_complete outcome
    return {
      outcome: "rollback_complete",
      message: `STAGE FAILED — PUBLIC STORAGE ROLLBACK COMPLETE: ${
        rpcErr instanceof Error ? rpcErr.message : String(rpcErr)
      }`
    };
  }
}

// =========================================================================
// DEFECT C: RETRY UPLOAD & FINALIZE STATE MACHINE ORCHESTRATION
// =========================================================================

export interface UploadOrchestrationDeps {
  prepareRpc: (
    storyId: string,
    payload: PrepareStoryMediaPayload
  ) => Promise<{ mediaId: string; storageBucket: string; storageKey: string }>;
  uploadStorage: (
    bucket: string,
    key: string,
    bytes: Uint8Array,
    mimeType: string
  ) => Promise<void>;
  finalizeRpc: (
    mediaId: string,
    storyId: string,
    usageType: StoryMediaUsageType,
    checksum: string | null
  ) => Promise<void>;
  getUploadContext?: (
    mediaId: string,
    storyId: string
  ) => Promise<{ mediaId: string; storyId: string }>;
}

/**
 * Executes initial prepare, storage upload, and finalize.
 */
export async function executeInitialUpload(
  storyId: string,
  payload: PrepareStoryMediaPayload,
  bytes: Uint8Array,
  deps: UploadOrchestrationDeps
): Promise<{
  success: boolean;
  state: UploadReconciliationState | null;
}> {
  const validation = validateStoryMediaUpload(payload, bytes);
  if (!validation.valid) {
    throw new Error(validation.error || "Upload validation failed.");
  }

  // Step 1: Prepare RPC
  const prep = await deps.prepareRpc(storyId, payload);
  const mediaId = prep.mediaId;
  const storageBucket = prep.storageBucket;
  const storageKey = prep.storageKey;

  // Step 2: Storage upload
  try {
    await deps.uploadStorage(storageBucket, storageKey, bytes, payload.mimeType);
  } catch (uploadErr) {
    const uploadFailedState: UploadReconciliationState = {
      stage: "upload_failed",
      mediaId,
      storyId,
      usageType: payload.usageType,
      storageBucket,
      storageKey,
      filename: payload.filename,
      mimeType: payload.mimeType,
      bytes,
      checksum: payload.checksum || "",
      errorMessage: uploadErr instanceof Error ? uploadErr.message : "Private storage upload failed."
    };
    return { success: false, state: uploadFailedState };
  }

  // Step 3: Finalize RPC
  try {
    await deps.finalizeRpc(mediaId, storyId, payload.usageType, payload.checksum || null);
    return { success: true, state: null };
  } catch (finalizeErr) {
    const finalizeFailedState: UploadReconciliationState = {
      stage: "finalize_failed",
      mediaId,
      storyId,
      usageType: payload.usageType,
      storageBucket,
      storageKey,
      filename: payload.filename,
      mimeType: payload.mimeType,
      bytes,
      checksum: payload.checksum || "",
      errorMessage: finalizeErr instanceof Error ? finalizeErr.message : "Media finalization failed."
    };
    return { success: false, state: finalizeFailedState };
  }
}

/**
 * Retries a prepared upload on the exact same private storage key and bytes.
 * If storage upload succeeds but finalize fails, transitions to finalize_failed state.
 */
export async function executeRetryUpload(
  reconciliationState: UploadReconciliationState,
  deps: UploadOrchestrationDeps
): Promise<{
  success: boolean;
  state: UploadReconciliationState | null;
}> {
  if (reconciliationState.stage !== "upload_failed") {
    return { success: false, state: reconciliationState };
  }

  // 1. Retry exact same private upload WITHOUT calling prepareRpc
  try {
    await deps.uploadStorage(
      reconciliationState.storageBucket,
      reconciliationState.storageKey,
      reconciliationState.bytes,
      reconciliationState.mimeType
    );
  } catch (uploadErr) {
    return {
      success: false,
      state: {
        ...reconciliationState,
        stage: "upload_failed",
        errorMessage: uploadErr instanceof Error ? uploadErr.message : "Private storage upload failed on retry."
      }
    };
  }

  // Storage upload succeeded! Now state transitions to finalize_failed
  const pendingFinalizeState: UploadReconciliationState = {
    ...reconciliationState,
    stage: "finalize_failed",
    errorMessage: "Storage upload succeeded. Finalize confirmation pending."
  };

  // 2. Attempt finalize
  try {
    await deps.finalizeRpc(
      reconciliationState.mediaId,
      reconciliationState.storyId,
      reconciliationState.usageType,
      reconciliationState.checksum || null
    );
    return { success: true, state: null };
  } catch (finalizeErr) {
    return {
      success: false,
      state: {
        ...pendingFinalizeState,
        errorMessage: finalizeErr instanceof Error ? finalizeErr.message : "Media finalization failed on retry."
      }
    };
  }
}

/**
 * Retries finalization for a media asset already uploaded to private storage.
 * Performs upload-context custody check before calling finalize RPC.
 */
export async function executeRetryFinalize(
  reconciliationState: UploadReconciliationState,
  deps: UploadOrchestrationDeps
): Promise<{
  success: boolean;
  state: UploadReconciliationState | null;
}> {
  if (reconciliationState.stage !== "finalize_failed") {
    return { success: false, state: reconciliationState };
  }

  // 1. Verify upload-context custody if custody helper is provided
  if (deps.getUploadContext) {
    const custody = await deps.getUploadContext(
      reconciliationState.mediaId,
      reconciliationState.storyId
    );
    if (!custody || custody.mediaId !== reconciliationState.mediaId || custody.storyId !== reconciliationState.storyId) {
      throw new Error(
        `Upload context custody mismatch for media "${reconciliationState.mediaId}" and story "${reconciliationState.storyId}".`
      );
    }
  }

  // 2. Finalize RPC directly (no second storage upload!)
  await deps.finalizeRpc(
    reconciliationState.mediaId,
    reconciliationState.storyId,
    reconciliationState.usageType,
    reconciliationState.checksum || null
  );

  return { success: true, state: null };
}

