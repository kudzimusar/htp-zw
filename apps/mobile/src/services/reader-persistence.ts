import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReaderRepository } from "../domain/contracts";
import type { ArticleDetail, EditionPreference } from "../domain/models";

const keys = {
  preferences: "ht:nm04:reader:preferences:v1",
  saved: "ht:nm04:reader:saved:v1",
  downloads: "ht:nm04:reader:downloads:v1",
  progress: "ht:nm04:reader:progress:v1",
  history: "ht:nm04:reader:history:v1"
} as const;

const defaultPreferences: EditionPreference = {
  primaryEdition: "Global",
  followedCountries: ["Zimbabwe"],
  followedTopics: ["Public Health", "Research"]
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

export const persistentReaderRepository: ReaderRepository = {
  async getPreferences() {
    return readJson(keys.preferences, defaultPreferences);
  },

  async savePreferences(preferences) {
    await writeJson(keys.preferences, preferences);
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

  async recordReadingHistory(articleId) {
    const history = await readJson<string[]>(keys.history, []);
    const next = [articleId, ...history.filter((id) => id !== articleId)].slice(0, 100);
    await writeJson(keys.history, next);
  },

  async getReadingHistoryIds() {
    return readJson<string[]>(keys.history, []);
  }
};
