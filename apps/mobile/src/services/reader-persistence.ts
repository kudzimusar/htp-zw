import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReaderRepository } from "../domain/contracts";
import type {
  AppearancePreference,
  ArticleDetail,
  EditionPreference,
  OfflineArticleRecord
} from "../domain/models";
import { canOpenOffline, offlineRecordForArticle } from "../reader/offline-state";

const keys = {
  preferences: "ht:nm04:reader:preferences:v1",
  appearance: "ht:nm04:reader:appearance:v1",
  saved: "ht:nm04:reader:saved:v1",
  savedMedia: "ht:nm04:reader:saved-media:v1",
  legacyDownloads: "ht:nm04:reader:downloads:v1",
  downloads: "ht:nm04:reader:downloads:v2",
  storageVersion: "ht:nm04:reader:storage-version",
  progress: "ht:nm04:reader:progress:v1",
  history: "ht:nm04:reader:history:v1"
} as const;

const defaultPreferences: EditionPreference = {
  primaryEdition: "Global",
  followedCountries: [],
  followedTopics: ["Public Health", "Research"]
};

type SavedMedia = {
  video: string[];
  audio: string[];
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

const OFFLINE_STORAGE_VERSION = 2;

function parseObjectRecord(raw: string | null): Record<string, unknown> | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function isLegacyArticleDetail(value: unknown): value is ArticleDetail {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const article = value as Partial<ArticleDetail>;
  return (
    typeof article.id === "string" &&
    article.id.trim().length > 0 &&
    (article.accessPolicy === "public" || article.accessPolicy === "premium") &&
    (typeof article.bodyHtml === "string" || article.bodyHtml === null)
  );
}

function parseOfflineRecordMap(raw: string | null): Record<string, OfflineArticleRecord> {
  const parsed = parseObjectRecord(raw);
  if (!parsed) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (value as Partial<OfflineArticleRecord>).schemaVersion === OFFLINE_STORAGE_VERSION &&
      typeof (value as Partial<OfflineArticleRecord>).article?.id === "string"
    )
  ) as Record<string, OfflineArticleRecord>;
}

function migrateLegacyRecordMap(raw: string | null): Record<string, OfflineArticleRecord> {
  const parsed = parseObjectRecord(raw);
  if (!parsed) return {};
  const migrated: Record<string, OfflineArticleRecord> = {};
  for (const value of Object.values(parsed)) {
    if (!isLegacyArticleDetail(value)) continue;
    migrated[value.id] = offlineRecordForArticle(value);
  }
  return migrated;
}

async function readOfflineRecords(): Promise<Record<string, OfflineArticleRecord>> {
  const version = await readJson<number>(keys.storageVersion, 0);
  const currentRaw = await AsyncStorage.getItem(keys.downloads);

  // Either a committed version marker or the existence of the v2 key makes v2
  // authoritative, including an intentionally empty "{}" store. This prevents
  // deleted migrated downloads from being resurrected from the legacy key.
  if (version >= OFFLINE_STORAGE_VERSION || currentRaw !== null) {
    if (version < OFFLINE_STORAGE_VERSION) {
      await writeJson(keys.storageVersion, OFFLINE_STORAGE_VERSION);
    }
    return parseOfflineRecordMap(currentRaw);
  }

  const legacyRaw = await AsyncStorage.getItem(keys.legacyDownloads);
  const migrated = migrateLegacyRecordMap(legacyRaw);

  // Commit v2 first, then mark migration complete. Legacy cleanup is best-effort:
  // the marker remains the durable authority even when removeItem is unavailable.
  await writeJson(keys.downloads, migrated);
  await writeJson(keys.storageVersion, OFFLINE_STORAGE_VERSION);
  try {
    await AsyncStorage.removeItem(keys.legacyDownloads);
  } catch {
    // A stale v1 key cannot repopulate v2 once the migration marker is committed.
  }
  return migrated;
}

async function writeOfflineRecords(records: Record<string, OfflineArticleRecord>) {
  await writeJson(keys.downloads, records);
  await writeJson(keys.storageVersion, OFFLINE_STORAGE_VERSION);
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

  async getSavedMediaIds(kind) {
    const saved = await readJson<SavedMedia>(keys.savedMedia, { video: [], audio: [] });
    return saved[kind] ?? [];
  },

  async toggleSavedMedia(kind, id) {
    const saved = await readJson<SavedMedia>(keys.savedMedia, { video: [], audio: [] });
    const current = saved[kind] ?? [];
    const exists = current.includes(id);
    saved[kind] = exists ? current.filter((value) => value !== id) : [id, ...current];
    await writeJson(keys.savedMedia, saved);
    return !exists;
  },

  async getDownloadedArticles() {
    const records = Object.values(await readOfflineRecords());
    return records.filter((record) => canOpenOffline(record)).map((record) => record.article);
  },

  async getOfflineArticleRecords() {
    return Object.values(await readOfflineRecords()).sort((a, b) =>
      String(b.downloadedAt ?? "").localeCompare(String(a.downloadedAt ?? ""))
    );
  },

  async getOfflineArticleRecord(articleId) {
    const records = await readOfflineRecords();
    return records[articleId] ?? Object.values(records).find((record) => record.article.slug === articleId) ?? null;
  },

  async downloadArticle(article) {
    const records = await readOfflineRecords();
    const candidate = offlineRecordForArticle(article);

    // Premium/unknown bodies are sanitized again at persistence, even if a caller
    // bypasses the Article UI. Local storage never grants entitlement.
    if (!candidate.textAvailable) {
      records[article.id] = candidate;
      await writeOfflineRecords(records);
      return;
    }

    records[article.id] = { ...candidate, state: "downloading" };
    await writeOfflineRecords(records);

    try {
      records[article.id] = candidate;
      await writeOfflineRecords(records);
    } catch (error) {
      records[article.id] = {
        ...candidate,
        state: "failed",
        failureReason: error instanceof Error ? error.message : "Local storage write failed."
      };
      try {
        await writeOfflineRecords(records);
      } catch {
        // If device storage itself is unavailable there is no reliable place to
        // persist a failure marker. The caller still receives the original error.
      }
      throw error;
    }
  },

  async removeDownloadedArticle(id) {
    const records = await readOfflineRecords();
    delete records[id];
    await writeOfflineRecords(records);
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

  async recordReadingHistory(articleId) {
    const history = await readJson<string[]>(keys.history, []);
    const next = [articleId, ...history.filter((id) => id !== articleId)].slice(0, 100);
    await writeJson(keys.history, next);
  },

  async getReadingHistoryIds() {
    return readJson<string[]>(keys.history, []);
  }
};