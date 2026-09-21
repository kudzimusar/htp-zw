import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type {
  ArticleDetail,
  OfflineArticleRecord,
  OfflineAvailabilityState,
  ReaderConnectivityState
} from "../domain/models";

export function compareSourceFreshness(record: OfflineArticleRecord, currentModifiedAt: string | null): OfflineAvailabilityState {
  if (record.state === "failed" || record.state === "unavailable" || record.state === "downloading" || record.state === "pending-sync") {
    return record.state;
  }
  if (!record.textAvailable) return "unavailable";
  if (!currentModifiedAt || !record.sourceModifiedAt) return record.state === "stale" ? "stale" : "available";
  const cached = new Date(record.sourceModifiedAt).getTime();
  const current = new Date(currentModifiedAt).getTime();
  if (Number.isFinite(cached) && Number.isFinite(current) && current > cached) return "stale";
  return "available";
}

export function offlineRecordForArticle(article: ArticleDetail, now = new Date().toISOString()): OfflineArticleRecord {
  const publicBody = article.accessPolicy === "public" && Boolean(article.bodyHtml?.trim());
  const safeArticle: ArticleDetail = publicBody ? article : { ...article, bodyHtml: null };
  return {
    schemaVersion: 2,
    article: safeArticle,
    state: publicBody ? "available" : "unavailable",
    downloadedAt: publicBody ? now : null,
    sourceModifiedAt: article.modifiedAt ?? article.publishedAt,
    textAvailable: publicBody,
    mediaAvailable: Boolean(publicBody && article.heroMedia?.publicUrl),
    syncMode: "local-only",
    failureReason: publicBody ? null : "Protected or missing article body is not eligible for local offline storage."
  };
}

export function canOpenOffline(record: OfflineArticleRecord | null): boolean {
  if (!record?.textAvailable || !record.article.bodyHtml) return false;
  return record.state === "available" || record.state === "stale" || record.state === "pending-sync";
}

export function detectReaderConnectivity(): ReaderConnectivityState {
  if (Platform.OS !== "web") return "unknown";
  const nav = (globalThis as typeof globalThis & { navigator?: { onLine?: boolean } }).navigator;
  if (typeof nav?.onLine !== "boolean") return "unknown";
  return nav.onLine ? "online" : "offline";
}

export function useReaderConnectivity(): ReaderConnectivityState {
  const [state, setState] = useState<ReaderConnectivityState>(() => detectReaderConnectivity());
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const target = globalThis as typeof globalThis & {
      addEventListener?: (name: string, listener: () => void) => void;
      removeEventListener?: (name: string, listener: () => void) => void;
    };
    const refresh = () => setState(detectReaderConnectivity());
    target.addEventListener?.("online", refresh);
    target.addEventListener?.("offline", refresh);
    return () => {
      target.removeEventListener?.("online", refresh);
      target.removeEventListener?.("offline", refresh);
    };
  }, []);
  return state;
}
