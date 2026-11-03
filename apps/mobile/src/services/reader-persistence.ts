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

  if (raw === null || raw === undefined || raw === "") {
    return { status: "MISSING", data: null };
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

async function ensurePremiumPreviewScope(): Promise<string> {
  let existing: string | null;
  try {
    existing = await AsyncStorage.getItem(keys.premiumPreviewScope);
  } catch (err) {
    // If reading scope throws an error, fail closed — do NOT generate a new scope!
    throw new Error(
      "Unable to read premium preview security scope: " +
        (err instanceof Error ? err.message : String(err))
    );
  }

  if (existing?.trim()) {
    return existing.trim();
  }

  // Key is legitimately missing (clean first visit): generate new scope and persist
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
      const scopeId = await ensurePremiumPreviewScope();
      const readResult = await readSecurityJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger);

      // Invariant: Storage read errors or corrupted data MUST NEVER reset or grant a preview
      if (readResult.status === "READ_FAILED" || readResult.status === "CORRUPT") {
        return null;
      }

      const ledger = readResult.status === "VALID" ? readResult.data : {};
      const ledgerKey = scopeId + "|" + storyId;
      const now = Date.now();
      const existing = ledger[ledgerKey];

      let startedAt: number;
      if (!existing) {
        // Legitimate clean first visit for this story
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
      const scopeId = await ensurePremiumPreviewScope();
      const readResult = await readSecurityJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger);

      // Invariant: Storage read errors or corrupted data MUST NEVER authorize or reset prompt state
      if (readResult.status === "READ_FAILED" || readResult.status === "CORRUPT") {
        return false;
      }

      const ledger = readResult.status === "VALID" ? readResult.data : {};
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
