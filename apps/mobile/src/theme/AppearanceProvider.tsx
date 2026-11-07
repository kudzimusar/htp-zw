import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { services } from "../services";
import type { AppearancePreference } from "../domain/models";
import { colors } from "./tokens";

type Palette = {
  paper: string;
  paperMuted: string;
  ink: string;
  inkMuted: string;
  border: string;
  navy: string;
  blue: string;
  live: string;
  premium: string;
  success: string;
};

type AppearanceContextValue = {
  appearance: AppearancePreference;
  palette: Palette;
  ready: boolean;
  updateAppearance: (next: AppearancePreference) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const raw = localStorage.getItem("ht:nm04:reader:appearance:v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed === "light" || parsed === "dark" || parsed === "system") {
            return parsed;
          }
        }
      } catch {}
    }
    return "system";
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    services.reader
      .getAppearance()
      .then((value) => {
        if (active) setAppearanceState(value);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return systemScheme === "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, []);

  const isWebDark = systemDark;
  const isAttrDark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";

  const resolvedDark =
    appearance === "dark" ||
    (appearance === "system" && (systemScheme === "dark" || isWebDark || isAttrDark));

  const palette = useMemo<Palette>(
    () =>
      resolvedDark
        ? {
            paper: "#0B1622",
            paperMuted: "#122233",
            ink: "#F3F7FA",
            inkMuted: "#A9B7C5",
            border: "#2A3C4F",
            navy: "#050F19",
            blue: "#6DA9FF",
            live: "#FF6B6B",
            premium: "#E6C16A",
            success: "#63C58E"
          }
        : {
            paper: colors.paper,
            paperMuted: colors.paperMuted,
            ink: colors.ink,
            inkMuted: colors.inkMuted,
            border: colors.border,
            navy: colors.navy,
            blue: colors.blue,
            live: colors.live,
            premium: colors.premium,
            success: colors.success
          },
    [resolvedDark]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", resolvedDark ? "dark" : "light");
      document.documentElement.style.backgroundColor = palette.paper;
      document.documentElement.style.color = palette.ink;
      document.documentElement.style.setProperty("--ht-paper", palette.paper);
      document.documentElement.style.setProperty("--ht-paper-muted", palette.paperMuted);
      document.documentElement.style.setProperty("--ht-ink", palette.ink);
      document.documentElement.style.setProperty("--ht-ink-muted", palette.inkMuted);
      document.documentElement.style.setProperty("--ht-border", palette.border);
      document.documentElement.style.setProperty("--ht-navy", palette.navy);
      if (document.body) {
        document.body.style.backgroundColor = palette.paper;
        document.body.style.color = palette.ink;
      }
    }
  }, [resolvedDark, palette]);

  const updateAppearance = async (next: AppearancePreference) => {
    setAppearanceState(next);
    await services.reader.setAppearance(next);
  };

  return (
    <AppearanceContext.Provider value={{ appearance, palette, ready, updateAppearance }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearance must be used inside AppearanceProvider.");
  }
  return value;
}

export function useOptionalAppearance() {
  return useContext(AppearanceContext);
}
