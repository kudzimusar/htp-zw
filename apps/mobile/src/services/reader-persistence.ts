import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReaderRepository } from "../domain/contracts";
import type { AppearancePreference, ArticleDetail, EditionPreference, PremiumPreviewWindow } from "../domain/models";

const keys = {
  preferences: "ht:nm04:reader:preferences:v1",
  appearance: "ht:nm04:reader:appearance:v1",
  saved: "ht:nm04:reader:saved:v1",
  downloads: "ht:nm04:reader:downloads:v1",
  progress: "ht:nm04:reader:progress:v1",
  history: "ht:nm04:reader:history:v1",
  premiumPreviewScope: "ht:ag05:premium-preview:scope:v1",
  premiumPreviewLedger: "ht:ag05:premium-preview:ledger:v1"
} as const;

const defaultPreferences: EditionPreference = {
  primaryEdition: "Global",
  followedCountries: [],
  followedTopics: ["Public Health", "Research"]
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  await AsyncStorage.setItem(key, serialized);
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

type PremiumPreviewLedgerEntry = {
  storyId: string;
  scopeId: string;
  startedAt: number;
  promptRequestedAt?: number;
};

type SecurityReadResult<T> =
  | { status: "VALID"; data: T }
  | { status: "MISSING"; data: null }
  | { status: "CORRUPT"; error: Error }
  | { status: "READ_FAILED"; error: Error };

type SecurityScopeResult =
  | { status: "VALID"; scopeId: string }
  | { status: "MISSING"; scopeId: null }
  | { status: "CORRUPT"; error: Error }
  | { status: "READ_FAILED"; error: Error };

async function readSecurityJson<T>(key: string): Promise<SecurityReadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (err) {
    return {
      status: "READ_FAILED",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }

  // A1: Only genuine absence (null or undefined) is MISSING
  if (raw === null || raw === undefined) {
    return { status: "MISSING", data: null };
  }

  // A1: Present-but-empty or whitespace-only is CORRUPT, not MISSING
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      status: "CORRUPT",
      error: new Error(`Security payload for ${key} is empty or whitespace-only`)
    };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { status: "VALID", data: parsed };
    }
    return {
      status: "CORRUPT",
      error: new Error(`Security payload for ${key} is not an object`)
    };
  } catch (err) {
    return {
      status: "CORRUPT",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }
}

async function getSecurityScope(): Promise<SecurityScopeResult> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(keys.premiumPreviewScope);
  } catch (err) {
    return {
      status: "READ_FAILED",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }

  // A2: Only genuine absence is MISSING
  if (raw === null || raw === undefined) {
    return { status: "MISSING", scopeId: null };
  }

  // A2: Present-but-empty or whitespace-only scope is CORRUPT, not MISSING
  if (typeof raw !== "string" || raw.trim() === "") {
    return {
      status: "CORRUPT",
      error: new Error("Stored premium preview security scope is empty or whitespace-only")
    };
  }

  return { status: "VALID", scopeId: raw.trim() };
}

export async function ensurePremiumPreviewScope(): Promise<string> {
  const scopeResult = await getSecurityScope();
  if (scopeResult.status === "READ_FAILED") {
    throw scopeResult.error;
  }
  if (scopeResult.status === "CORRUPT") {
    throw scopeResult.error;
  }
  if (scopeResult.status === "VALID") {
    return scopeResult.scopeId;
  }

  // Legitimate first-use initialization ONLY (status === "MISSING")
  // This identifier is a local UX/session scope only. It is not an entitlement
  // credential and must never authorize Premium content.
  const created = "anonymous-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  await AsyncStorage.setItem(keys.premiumPreviewScope, created);
  return created;
}

function previewWindow(
  scopeId: string,
  storyId: string,
  startedAt: number,
  durationSeconds: number,
  now: number
): PremiumPreviewWindow {
  const expiresAt = startedAt + (durationSeconds * 1000);
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return {
    scopeId,
    storyId,
    startedAt: new Date(startedAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    remainingSeconds
  };
}

export const persistentReaderRepository: ReaderRepository = {
  async getPreferences() {
    return readJson(keys.preferences, defaultPreferences);
  },

  async savePreferences(preferences) {
    await writeJson(keys.preferences, preferences);
  },

  async getAppearance() {
    const preference = await readJson<AppearancePreference>(keys.appearance, "system");
    return preference === "light" || preference === "dark" ? preference : "system";
  },

  async setAppearance(preference) {
    await writeJson(keys.appearance, preference);
  },

  async getSavedArticleIds() {
    return readJson<string[]>(keys.saved, []);
  },

  async toggleSavedArticle(id) {
    const saved = await readJson<string[]>(keys.saved, []);
    const exists = saved.includes(id);
    const next = exists ? saved.filter((value) => value !== id) : [id, ...saved];
    await writeJson(keys.saved, next);
    return !exists;
  },

  async getDownloadedArticles() {
    const downloads = await readJson<Record<string, ArticleDetail>>(keys.downloads, {});
    return Object.values(downloads);
  },

  async downloadArticle(article) {
    if(article.accessPolicy==="premium") {
      throw new Error("Premium body is not available for offline storage until a verified offline entitlement policy exists.");
    }
    const downloads = await readJson<Record<string, ArticleDetail>>(keys.downloads, {});
    downloads[article.id] = article;
    await writeJson(keys.downloads, downloads);
  },

  async removeDownloadedArticle(id) {
    const downloads = await readJson<Record<string, ArticleDetail>>(keys.downloads, {});
    delete downloads[id];
    await writeJson(keys.downloads, downloads);
  },

  async getReadPosition(articleId) {
    const progress = await readJson<Record<string, number>>(keys.progress, {});
    return clampProgress(progress[articleId] ?? 0);
  },

  async setReadPosition(articleId, value) {
    const progress = await readJson<Record<string, number>>(keys.progress, {});
    progress[articleId] = clampProgress(value);
    await writeJson(keys.progress, progress);
  },

  async getPremiumPreviewWindow(stableStoryId, durationSeconds) {
    const storyId = stableStoryId.trim();
    if (!storyId || !Number.isFinite(durationSeconds) || durationSeconds !== 20) return null;

    try {
      const scopeResult = await getSecurityScope();
      if (scopeResult.status === "READ_FAILED" || scopeResult.status === "CORRUPT") {
        return null;
      }

      const ledgerResult = await readSecurityJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger);
      if (ledgerResult.status === "READ_FAILED" || ledgerResult.status === "CORRUPT") {
        return null;
      }

      // A3: Partial state invariant:
      // If one security key exists and the other is legitimately missing, the state is inconsistent
      // (e.g. interrupted initialization or out-of-band deletion). Deny preview access!
      if (scopeResult.status === "VALID" && ledgerResult.status === "MISSING") {
        return null;
      }
      if (scopeResult.status === "MISSING" && ledgerResult.status === "VALID") {
        return null;
      }

      let scopeId: string;
      let ledger: Record<string, PremiumPreviewLedgerEntry>;

      if (scopeResult.status === "MISSING" && ledgerResult.status === "MISSING") {
        // Legitimate clean first-use initialization policy: both keys absent
        scopeId = "anonymous-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
        ledger = {};
        await AsyncStorage.setItem(keys.premiumPreviewScope, scopeId);
      } else if (scopeResult.status === "VALID" && ledgerResult.status === "VALID") {
        // Both keys are VALID
        scopeId = scopeResult.scopeId;
        ledger = ledgerResult.data;
      } else {
        // Any other combination fails closed
        return null;
      }

      // Validate ledger entries integrity: all entries must have valid structure
      for (const [k, entry] of Object.entries(ledger)) {
        if (
          !entry ||
          typeof entry !== "object" ||
          typeof entry.storyId !== "string" ||
          !entry.storyId ||
          typeof entry.scopeId !== "string" ||
          !entry.scopeId ||
          typeof entry.startedAt !== "number" ||
          !Number.isFinite(entry.startedAt) ||
          entry.startedAt <= 0
        ) {
          return null; // Structurally invalid ledger entry -> DENIED
        }
        if (
          entry.promptRequestedAt !== undefined &&
          (!Number.isFinite(entry.promptRequestedAt) || entry.promptRequestedAt <= 0)
        ) {
          return null;
        }
      }

      const ledgerKey = scopeId + "|" + storyId;
      const now = Date.now();
      const existing = ledger[ledgerKey];

      let startedAt: number;
      if (!existing) {
        // Legitimate clean first visit for this specific story
        startedAt = now;
        ledger[ledgerKey] = { storyId, scopeId, startedAt };
        await writeJson(keys.premiumPreviewLedger, ledger);
      } else {
        startedAt = Number(existing.startedAt ?? NaN);
        // If entry exists but has invalid timestamps, fail closed:
        if (!Number.isFinite(startedAt) || startedAt <= 0 || startedAt > now) {
          return null;
        }
      }

      return previewWindow(scopeId, storyId, startedAt, durationSeconds, now);
    } catch {
      // Fail closed: if persistent storage is unavailable, premium preview is locked (null window)
      return null;
    }
  },

  async requestPremiumPreviewPrompt(stableStoryId) {
    const storyId = stableStoryId.trim();
    if (!storyId) return false;

    try {
      const scopeResult = await getSecurityScope();
      if (scopeResult.status !== "VALID") {
        return false;
      }

      const ledgerResult = await readSecurityJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger);
      if (ledgerResult.status !== "VALID") {
        return false;
      }

      const scopeId = scopeResult.scopeId;
      const ledger = ledgerResult.data;

      // Validate ledger entries integrity
      for (const [k, entry] of Object.entries(ledger)) {
        if (
          !entry ||
          typeof entry !== "object" ||
          typeof entry.storyId !== "string" ||
          !entry.storyId ||
          typeof entry.scopeId !== "string" ||
          !entry.scopeId ||
          typeof entry.startedAt !== "number" ||
          !Number.isFinite(entry.startedAt) ||
          entry.startedAt <= 0
        ) {
          return false;
        }
        if (
          entry.promptRequestedAt !== undefined &&
          (!Number.isFinite(entry.promptRequestedAt) || entry.promptRequestedAt <= 0)
        ) {
          return false;
        }
      }

      const ledgerKey = scopeId + "|" + storyId;
      const existing = ledger[ledgerKey];
      if (!existing || !Number.isFinite(existing.startedAt) || existing.promptRequestedAt) return false;

      ledger[ledgerKey] = { ...existing, promptRequestedAt: Date.now() };
      await writeJson(keys.premiumPreviewLedger, ledger);
      return true;
    } catch {
      return false;
    }
  },

  async recordReadingHistory(articleId) {
    const history = await readJson<string[]>(keys.history, []);
    const next = [articleId, ...history.filter((id) => id !== articleId)].slice(0, 100);
    await writeJson(keys.history, next);
  },

  async getReadingHistoryIds() {
    return readJson<string[]>(keys.history, []);
  }
};
