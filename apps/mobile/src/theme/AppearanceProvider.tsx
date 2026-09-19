import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { services } from "../services";
import type { ReaderAppearance } from "../reader/types";
import { colors } from "./tokens";

const fallback: ReaderAppearance = {
  theme: "system",
  textScale: 1,
  density: "comfortable"
};

type Palette = {
  paper: string;
  paperMuted: string;
  ink: string;
  inkMuted: string;
  border: string;
  navy: string;
  blue: string;
  live: string;
};

type AppearanceContextValue = {
  appearance: ReaderAppearance;
  palette: Palette;
  ready: boolean;
  updateAppearance: (next: ReaderAppearance) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [appearance, setAppearance] = useState<ReaderAppearance>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    services.reader
      .getAppearance()
      .then((value) => {
        if (active) setAppearance(value);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const resolvedDark =
    appearance.theme === "dark" ||
    (appearance.theme === "system" && systemScheme === "dark");

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
            live: "#FF6B6B"
          }
        : {
            paper: colors.paper,
            paperMuted: colors.paperMuted,
            ink: colors.ink,
            inkMuted: colors.inkMuted,
            border: colors.border,
            navy: colors.navy,
            blue: colors.blue,
            live: colors.live
          },
    [resolvedDark]
  );

  const updateAppearance = async (next: ReaderAppearance) => {
    setAppearance(next);
    await services.reader.saveAppearance(next);
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
