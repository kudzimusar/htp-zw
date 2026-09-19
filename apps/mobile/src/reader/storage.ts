import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReaderRepository } from "../domain/contracts";
import type { ArticleDetail, EditionPreference } from "../domain/models";
import type { ReaderAppearance, ReadingPosition } from "./types";

const PREFIX = "@healthtimes/reader/v1";
const key = (name: string) => `${PREFIX}/${name}`;

const DEFAULT_PREFERENCES: EditionPreference = {
  primaryEdition: "Global",
  followedCountries: ["Zimbabwe"],
  followedTopics: ["Public Health", "Research"]
};

const DEFAULT_APPEARANCE: ReaderAppearance = {
  theme: "system",
  textScale: 1,
  density: "comfortable"
};

async function readJson<T>(storageKey: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(storageKey);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(storageKey: string, value: T) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(1, progress));
}

export const persistentReaderRepository: ReaderRepository = {
  async getPreferences() {
    return readJson(key("preferences"), DEFAULT_PREFERENCES);
  },

  async savePreferences(preferences) {
    await writeJson(key("preferences"), preferences);
  },

  async getSavedArticleIds() {
    return readJson<string[]>(key("saved-article-ids"), []);
  },

  async toggleSavedArticle(id) {
    const ids = new Set(await this.getSavedArticleIds());
    if (ids.has(id)) {
      ids.delete(id);
      await writeJson(key("saved-article-ids"), [...ids]);
      return false;
    }
    ids.add(id);
    await writeJson(key("saved-article-ids"), [...ids]);
    return true;
  },

  async getDownloadedArticles() {
    return readJson<ArticleDetail[]>(key("downloads"), []);
  },

  async downloadArticle(article) {
    const current = await this.getDownloadedArticles();
    const next = [article, ...current.filter((item) => item.id !== article.id)];
    await writeJson(key("downloads"), next);
  },

  async removeDownloadedArticle(id) {
    const current = await this.getDownloadedArticles();
    await writeJson(key("downloads"), current.filter((item) => item.id !== id));
  },

  async getReadingPosition(articleId) {
    const positions = await readJson<Record<string, ReadingPosition>>(key("reading-positions"), {});
    return positions[articleId] ?? null;
  },

  async saveReadingPosition(articleId, progress) {
    const positions = await readJson<Record<string, ReadingPosition>>(key("reading-positions"), {});
    positions[articleId] = {
      articleId,
      progress: clampProgress(progress),
      updatedAt: new Date().toISOString()
    };
    await writeJson(key("reading-positions"), positions);
  },

  async getAppearance() {
    const value = await readJson<ReaderAppearance>(key("appearance"), DEFAULT_APPEARANCE);
    return {
      theme: value.theme === "dark" || value.theme === "light" ? value.theme : "system",
      textScale: Math.max(0.9, Math.min(1.35, Number(value.textScale) || 1)),
      density: value.density === "compact" ? "compact" : "comfortable"
    };
  },

  async saveAppearance(appearance) {
    await writeJson(key("appearance"), {
      theme: appearance.theme,
      textScale: Math.max(0.9, Math.min(1.35, appearance.textScale)),
      density: appearance.density
    });
  }
};
