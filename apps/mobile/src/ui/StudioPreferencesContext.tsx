import React, { useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Safe fallbacks in case a test runner provides a partial mock for react without createContext/useContext
const safeCreateContext =
  (React as any).createContext ??
  ((defaultValue: any) => ({
    Provider: ({ children }: any) => children,
    Consumer: ({ children }: any) => children(defaultValue)
  }));

const safeUseContext = (React as any).useContext ?? (() => null);

export type TableDensity = "comfortable" | "compact";

export type NewsroomRoleKey =
  | "owner"
  | "editor"
  | "reporter"
  | "finance"
  | "commercial"
  | "audience"
  | "admin";

interface StudioPreferencesContextValue {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  tableDensity: TableDensity;
  setTableDensity: (density: TableDensity) => void;
  toggleTableDensity: () => void;
  pinnedPaths: string[];
  togglePinPath: (path: string) => void;
  isPinned: (path: string) => boolean;
  activeRoleOverride: NewsroomRoleKey | null;
  setActiveRoleOverride: (role: NewsroomRoleKey | null) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isQuickCreateOpen: boolean;
  setQuickCreateOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  isMobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  recentItems: Array<{ id: string; title: string; path: string; category: string; timestamp: string }>;
  addRecentItem: (item: { id: string; title: string; path: string; category: string }) => void;
}

const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: "@ht_studio_sidebar_collapsed",
  TABLE_DENSITY: "@ht_studio_table_density",
  PINNED_PATHS: "@ht_studio_pinned_paths",
  RECENT_ITEMS: "@ht_studio_recent_items"
};

const DEFAULT_PINNED = [
  "/studio/review-queue",
  "/studio/stories",
  "/studio/finance-invoices"
];

const StudioPreferencesContext = safeCreateContext(null);

export function StudioPreferencesProvider({ children }: PropsWithChildren) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(true);
  const [tableDensity, setTableDensityState] = useState<TableDensity>("comfortable");
  const [pinnedPaths, setPinnedPathsState] = useState<string[]>(DEFAULT_PINNED);
  const [activeRoleOverride, setActiveRoleOverride] = useState<NewsroomRoleKey | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [isQuickCreateOpen, setQuickCreateOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [recentItems, setRecentItems] = useState<
    Array<{ id: string; title: string; path: string; category: string; timestamp: string }>
  >([]);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const [savedSidebar, savedDensity, savedPinned, savedRecent] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED),
          AsyncStorage.getItem(STORAGE_KEYS.TABLE_DENSITY),
          AsyncStorage.getItem(STORAGE_KEYS.PINNED_PATHS),
          AsyncStorage.getItem(STORAGE_KEYS.RECENT_ITEMS)
        ]);

        if (savedSidebar !== null) {
          setSidebarCollapsedState(savedSidebar === "true");
        }
        if (savedDensity === "comfortable" || savedDensity === "compact") {
          setTableDensityState(savedDensity);
        }
        if (savedPinned) {
          const parsed = JSON.parse(savedPinned);
          if (Array.isArray(parsed)) setPinnedPathsState(parsed);
        }
        if (savedRecent) {
          const parsed = JSON.parse(savedRecent);
          if (Array.isArray(parsed) && parsed.length > 0) setRecentItems(parsed);
        }
      } catch {
        // Fall back to default in-memory state
      }
    }
    loadPreferences();
  }, []);

  function setSidebarCollapsed(collapsed: boolean) {
    setSidebarCollapsedState(collapsed);
    AsyncStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(collapsed)).catch(() => {});
  }

  function toggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsed);
  }

  function setTableDensity(density: TableDensity) {
    setTableDensityState(density);
    AsyncStorage.setItem(STORAGE_KEYS.TABLE_DENSITY, density).catch(() => {});
  }

  function toggleTableDensity() {
    setTableDensity(tableDensity === "comfortable" ? "compact" : "comfortable");
  }

  function togglePinPath(path: string) {
    setPinnedPathsState((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      AsyncStorage.setItem(STORAGE_KEYS.PINNED_PATHS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  function isPinned(path: string): boolean {
    return pinnedPaths.includes(path);
  }

  function addRecentItem(item: { id: string; title: string; path: string; category: string }) {
    setRecentItems((prev) => {
      const filtered = prev.filter((i) => i.path !== item.path);
      const next = [
        { ...item, timestamp: "Just now" },
        ...filtered.slice(0, 9)
      ];
      AsyncStorage.setItem(STORAGE_KEYS.RECENT_ITEMS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }

  return (
    <StudioPreferencesContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        tableDensity,
        setTableDensity,
        toggleTableDensity,
        pinnedPaths,
        togglePinPath,
        isPinned,
        activeRoleOverride,
        setActiveRoleOverride,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isQuickCreateOpen,
        setQuickCreateOpen,
        isNotificationsOpen,
        setNotificationsOpen,
        isMobileDrawerOpen,
        setMobileDrawerOpen,
        recentItems,
        addRecentItem
      }}
    >
      {children}
    </StudioPreferencesContext.Provider>
  );
}

export function useStudioPreferences(): StudioPreferencesContextValue {
  const ctx = safeUseContext(StudioPreferencesContext);
  if (!ctx) {
    // Return safe fallback if used outside provider
    return {
      sidebarCollapsed: true,
      setSidebarCollapsed: () => {},
      toggleSidebar: () => {},
      tableDensity: "comfortable",
      setTableDensity: () => {},
      toggleTableDensity: () => {},
      pinnedPaths: DEFAULT_PINNED,
      togglePinPath: () => {},
      isPinned: () => false,
      activeRoleOverride: null,
      setActiveRoleOverride: () => {},
      isCommandPaletteOpen: false,
      setCommandPaletteOpen: () => {},
      isQuickCreateOpen: false,
      setQuickCreateOpen: () => {},
      isNotificationsOpen: false,
      setNotificationsOpen: () => {},
      isMobileDrawerOpen: false,
      setMobileDrawerOpen: () => {},
      recentItems: [],
      addRecentItem: () => {}
    };
  }
  return ctx;
}
