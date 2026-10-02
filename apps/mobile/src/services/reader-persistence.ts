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

type PremiumPreviewLedgerEntry = {
  storyId: string;
  scopeId: string;
  startedAt: number;
  promptRequestedAt?: number;
};

async function ensurePremiumPreviewScope() {
  const existing=await AsyncStorage.getItem(keys.premiumPreviewScope);
  if(existing?.trim()) return existing;
  // This identifier is a local UX/session scope only. It is not an entitlement
  // credential and must never authorize Premium content.
  const created="anonymous-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12);
  await AsyncStorage.setItem(keys.premiumPreviewScope,created);
  return created;
}

function previewWindow(
  scopeId:string,
  storyId:string,
  startedAt:number,
  durationSeconds:number,
  now:number
):PremiumPreviewWindow {
  const expiresAt=startedAt+(durationSeconds*1000);
  const remainingSeconds=Math.max(0,Math.ceil((expiresAt-now)/1000));
  return {
    scopeId,
    storyId,
    startedAt:new Date(startedAt).toISOString(),
    expiresAt:new Date(expiresAt).toISOString(),
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
    if(article.accessPolicy==="premium"){
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
    const storyId=stableStoryId.trim();
    if(!storyId || !Number.isFinite(durationSeconds) || durationSeconds!==20) return null;

    const scopeId=await ensurePremiumPreviewScope();
    const ledger=await readJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger,{});
    const ledgerKey=scopeId+"|"+storyId;
    const now=Date.now();
    const existing=ledger[ledgerKey];
    let startedAt=Number(existing?.startedAt ?? NaN);

    if(!Number.isFinite(startedAt) || startedAt<=0 || startedAt>now){
      startedAt=now;
      ledger[ledgerKey]={storyId,scopeId,startedAt};
      await writeJson(keys.premiumPreviewLedger,ledger);
    }

    return previewWindow(scopeId,storyId,startedAt,durationSeconds,now);
  },

  async requestPremiumPreviewPrompt(stableStoryId) {
    const storyId=stableStoryId.trim();
    if(!storyId) return false;

    const scopeId=await ensurePremiumPreviewScope();
    const ledger=await readJson<Record<string, PremiumPreviewLedgerEntry>>(keys.premiumPreviewLedger,{});
    const ledgerKey=scopeId+"|"+storyId;
    const existing=ledger[ledgerKey];
    if(!existing || !Number.isFinite(existing.startedAt) || existing.promptRequestedAt) return false;

    ledger[ledgerKey]={...existing,promptRequestedAt:Date.now()};
    await writeJson(keys.premiumPreviewLedger,ledger);
    return true;
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
