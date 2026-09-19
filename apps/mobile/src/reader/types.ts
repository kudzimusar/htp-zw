import type { ArticleDetail, EditionPreference } from "../domain/models";

export type ThemeMode = "system" | "light" | "dark";
export type ReaderDensity = "comfortable" | "compact";

export type ReaderAppearance = {
  theme: ThemeMode;
  textScale: number;
  density: ReaderDensity;
};

export type ReadingPosition = {
  articleId: string;
  progress: number;
  updatedAt: string;
};

export type ReaderStateSnapshot = {
  preferences: EditionPreference;
  savedArticleIds: string[];
  downloadedArticles: ArticleDetail[];
  appearance: ReaderAppearance;
};
