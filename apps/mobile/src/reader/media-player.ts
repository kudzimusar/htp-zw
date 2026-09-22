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

export type MediaAnalyticsLifecycleEvent = {
  type: "listen_started" | "listen_completed";
  itemId: string;
  elapsedSeconds: number;
  durationSeconds: number | null;
};

export function createMediaAnalyticsTracker(
  emit: (event: MediaAnalyticsLifecycleEvent) => void
) {
  let startedItemId: string | null = null;
  return {
    started(itemId: string, durationSeconds: number | null) {
      if (startedItemId === itemId) return;
      startedItemId = itemId;
      emit({
        type: "listen_started",
        itemId,
        elapsedSeconds: 0,
        durationSeconds
      });
    },
    completed(itemId: string, elapsedSeconds: number, durationSeconds: number | null) {
      if (startedItemId !== itemId) return;
      emit({
        type: "listen_completed",
        itemId,
        elapsedSeconds,
        durationSeconds
      });
      startedItemId = null;
    }
  };
}

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

export type WebAudioTransport = {
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

export function attachWebAudioListeners(
  audio: WebAudioTransport,
  fallbackDuration: number | null,
  isCurrent: () => boolean,
  dispatch: (action: MediaPlaybackAction) => void,
  onEnded?: () => void
) {
  const guarded = (listener: () => void) => () => {
    if (isCurrent()) listener();
  };
  const listeners: Array<[string, () => void]> = [
    ["timeupdate", guarded(() => dispatch({
      type: "progress",
      elapsedSeconds: audio.currentTime,
      durationSeconds: Number.isFinite(audio.duration) ? audio.duration : fallbackDuration
    }))],
    ["loadedmetadata", guarded(() => dispatch({
      type: "progress",
      elapsedSeconds: audio.currentTime,
      durationSeconds: Number.isFinite(audio.duration) ? audio.duration : fallbackDuration
    }))],
    ["ended", guarded(() => {
      dispatch({ type: "ended" });
      onEnded?.();
    })],
    ["error", guarded(() => dispatch({ type: "error", message: "The verified media source could not be played." }))]
  ];

  for (const [name, listener] of listeners) audio.addEventListener(name, listener);
  return () => {
    for (const [name, listener] of listeners) audio.removeEventListener(name, listener);
  };
}

export function useReaderAudioPlayer(
  options: { onLifecycleEvent?: (event: MediaAnalyticsLifecycleEvent) => void } = {}
) {
  const [state, setState] = useState<MediaPlaybackState>(INITIAL_MEDIA_PLAYBACK_STATE);
  const transport = useRef<WebAudioTransport | null>(null);
  const detachListeners = useRef<(() => void) | null>(null);
  const lifecycleCallback = useRef(options.onLifecycleEvent);
  lifecycleCallback.current = options.onLifecycleEvent;
  const lifecycleTracker = useRef(
    createMediaAnalyticsTracker((event) => lifecycleCallback.current?.(event))
  );

  const dispatch = (action: MediaPlaybackAction) => setState((current) => reduceMediaPlaybackState(current, action));

  const detach = () => {
    detachListeners.current?.();
    detachListeners.current = null;
    const current = transport.current;
    transport.current = null;
    current?.pause();
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
      detachListeners.current = attachWebAudioListeners(
        audio,
        item.durationSeconds,
        () => transport.current === audio,
        dispatch,
        () => lifecycleTracker.current.completed(
          item.id,
          audio.currentTime,
          Number.isFinite(audio.duration) ? audio.duration : item.durationSeconds
        )
      );
      audio.playbackRate = state.playbackRate;
    }

    const activeTransport = transport.current;
    if (!activeTransport) return false;
    try {
      await activeTransport.play();
      if (transport.current !== activeTransport) return false;
      dispatch({ type: "playing" });
      lifecycleTracker.current.started(
        item.id,
        Number.isFinite(activeTransport.duration) ? activeTransport.duration : item.durationSeconds
      );
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
