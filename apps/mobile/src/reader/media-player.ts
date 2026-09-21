import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { AudioItem, MediaPlaybackState, ReaderMediaSource } from "../domain/models";

export const INITIAL_MEDIA_PLAYBACK_STATE: MediaPlaybackState = {
  status: "idle",
  currentItemId: null,
  elapsedSeconds: 0,
  durationSeconds: null,
  playbackRate: 1,
  presentation: "full",
  error: null
};

export type MediaPlaybackAction =
  | { type: "load"; itemId: string; durationSeconds: number | null }
  | { type: "playing" }
  | { type: "pause" }
  | { type: "progress"; elapsedSeconds: number; durationSeconds?: number | null }
  | { type: "seek"; elapsedSeconds: number }
  | { type: "rate"; playbackRate: number }
  | { type: "presentation"; presentation: "mini" | "full" }
  | { type: "ended" }
  | { type: "error"; message: string }
  | { type: "reset" };

function clampElapsed(value: number, duration: number | null) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return duration && duration > 0 ? Math.min(duration, safe) : safe;
}

export function reduceMediaPlaybackState(
  state: MediaPlaybackState,
  action: MediaPlaybackAction
): MediaPlaybackState {
  switch (action.type) {
    case "load":
      return {
        ...INITIAL_MEDIA_PLAYBACK_STATE,
        status: "loading",
        currentItemId: action.itemId,
        durationSeconds: action.durationSeconds,
        playbackRate: state.playbackRate,
        presentation: state.presentation
      };
    case "playing":
      return { ...state, status: "playing", error: null };
    case "pause":
      return state.currentItemId ? { ...state, status: "paused" } : state;
    case "progress": {
      const duration = action.durationSeconds ?? state.durationSeconds;
      return { ...state, elapsedSeconds: clampElapsed(action.elapsedSeconds, duration), durationSeconds: duration };
    }
    case "seek":
      return { ...state, elapsedSeconds: clampElapsed(action.elapsedSeconds, state.durationSeconds) };
    case "rate": {
      const playbackRate = [0.75, 1, 1.25, 1.5, 2].includes(action.playbackRate) ? action.playbackRate : 1;
      return { ...state, playbackRate };
    }
    case "presentation":
      return { ...state, presentation: action.presentation };
    case "ended":
      return { ...state, status: "ended", elapsedSeconds: state.durationSeconds ?? state.elapsedSeconds };
    case "error":
      return { ...state, status: "error", error: action.message };
    case "reset":
      return { ...INITIAL_MEDIA_PLAYBACK_STATE, playbackRate: state.playbackRate, presentation: state.presentation };
  }
}

export function verifiedAudioSource(item: AudioItem): ReaderMediaSource | null {
  const source = item.source;
  if (!source?.verified || !source.url) return null;
  try {
    const parsed = new URL(source.url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return source;
  } catch {
    return null;
  }
}

type WebAudioTransport = {
  currentTime: number;
  duration: number;
  playbackRate: number;
  pause(): void;
  play(): Promise<void>;
  addEventListener(name: string, listener: () => void): void;
  removeEventListener(name: string, listener: () => void): void;
};

type WebAudioConstructor = new (src?: string) => WebAudioTransport;

function webAudioConstructor(): WebAudioConstructor | null {
  if (Platform.OS !== "web") return null;
  const candidate = (globalThis as typeof globalThis & { Audio?: WebAudioConstructor }).Audio;
  return candidate ?? null;
}

export function useReaderAudioPlayer() {
  const [state, setState] = useState<MediaPlaybackState>(INITIAL_MEDIA_PLAYBACK_STATE);
  const transport = useRef<WebAudioTransport | null>(null);

  const dispatch = (action: MediaPlaybackAction) => setState((current) => reduceMediaPlaybackState(current, action));

  const detach = () => {
    const current = transport.current;
    if (!current) return;
    current.pause();
    transport.current = null;
  };

  useEffect(() => () => detach(), []);

  const play = async (item: AudioItem) => {
    const source = verifiedAudioSource(item);
    if (!source) {
      dispatch({ type: "error", message: "No verified playback source is available for this item." });
      return false;
    }
    const AudioCtor = webAudioConstructor();
    if (!AudioCtor) {
      dispatch({ type: "error", message: "Native playback requires the certified media adapter; this build does not claim background playback." });
      return false;
    }

    if (state.currentItemId !== item.id || !transport.current) {
      detach();
      const audio = new AudioCtor(source.url ?? undefined);
      transport.current = audio;
      dispatch({ type: "load", itemId: item.id, durationSeconds: item.durationSeconds });
      const progress = () => dispatch({
        type: "progress",
        elapsedSeconds: audio.currentTime,
        durationSeconds: Number.isFinite(audio.duration) ? audio.duration : item.durationSeconds
      });
      audio.addEventListener("timeupdate", progress);
      audio.addEventListener("loadedmetadata", progress);
      audio.addEventListener("ended", () => dispatch({ type: "ended" }));
      audio.addEventListener("error", () => dispatch({ type: "error", message: "The verified media source could not be played." }));
      audio.playbackRate = state.playbackRate;
    }

    try {
      await transport.current!.play();
      dispatch({ type: "playing" });
      return true;
    } catch {
      dispatch({ type: "error", message: "Playback could not start on this device." });
      return false;
    }
  };

  const pause = () => {
    transport.current?.pause();
    dispatch({ type: "pause" });
  };

  const seek = (elapsedSeconds: number) => {
    if (transport.current) transport.current.currentTime = Math.max(0, elapsedSeconds);
    dispatch({ type: "seek", elapsedSeconds });
  };

  const setPlaybackRate = (playbackRate: number) => {
    if (transport.current) transport.current.playbackRate = playbackRate;
    dispatch({ type: "rate", playbackRate });
  };

  const setPresentation = (presentation: "mini" | "full") => dispatch({ type: "presentation", presentation });

  return { state, play, pause, seek, setPlaybackRate, setPresentation };
}
