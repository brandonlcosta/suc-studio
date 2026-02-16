import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  createInitialPreviewPlaybackState,
  previewPlaybackReducer,
  type PreviewPlaybackState,
} from "./previewPlaybackState";

export type PreviewFrameMetrics = {
  frameCount: number;
  avgFrameMs: number;
  maxFrameMs: number;
  lastFrameMs: number;
};

export type PreviewPlaybackController = PreviewPlaybackState & {
  play: () => void;
  pause: () => void;
  seek: (progress: number) => void;
  stepFrame: () => void;
  reset: () => void;
  setPlaybackSpeed: (speed: number) => void;
  currentTimeMs: number;
  metrics: PreviewFrameMetrics;
};

type UsePreviewPlaybackOptions = {
  durationSeconds: number;
  frameRate: number;
};

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function usePreviewPlayback(options: UsePreviewPlaybackOptions): PreviewPlaybackController {
  const durationSeconds = Math.max(0, toFinite(options.durationSeconds, 0));
  const frameRate = Math.max(1, Math.round(toFinite(options.frameRate, 24)));
  const [state, dispatch] = useReducer(
    previewPlaybackReducer,
    createInitialPreviewPlaybackState(durationSeconds)
  );
  const [metrics, setMetrics] = useState<PreviewFrameMetrics>({
    frameCount: 0,
    avgFrameMs: 0,
    maxFrameMs: 0,
    lastFrameMs: 0,
  });

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const metricsRef = useRef<PreviewFrameMetrics>({
    frameCount: 0,
    avgFrameMs: 0,
    maxFrameMs: 0,
    lastFrameMs: 0,
  });
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    dispatch({ type: "set_duration", durationSeconds });
  }, [durationSeconds]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTickRef.current = null;
  }, []);

  useEffect(() => {
    if (!state.isPlaying) {
      stopLoop();
      return;
    }

    const tick = (timestamp: number) => {
      const previous = lastTickRef.current ?? timestamp;
      const rawDeltaSeconds = Math.max(0, (timestamp - previous) / 1000);
      // Clamp long inactive-tab deltas to prevent progress jumps.
      const deltaSeconds = Math.min(rawDeltaSeconds, 0.1);
      lastTickRef.current = timestamp;

      const frameMs = rawDeltaSeconds * 1000;
      const metricsSnapshot = metricsRef.current;
      const frameCount = metricsSnapshot.frameCount + 1;
      const avgFrameMs =
        frameCount <= 0 ? frameMs : (metricsSnapshot.avgFrameMs * metricsSnapshot.frameCount + frameMs) / frameCount;
      const maxFrameMs = Math.max(metricsSnapshot.maxFrameMs, frameMs);
      metricsRef.current = { frameCount, avgFrameMs, maxFrameMs, lastFrameMs: frameMs };
      if (frameCount % 20 === 0) {
        setMetrics(metricsRef.current);
      }

      dispatch({ type: "tick", deltaSeconds });
      if (stateRef.current.isPlaying) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stopLoop();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return stopLoop;
  }, [state.isPlaying, stopLoop]);

  useEffect(() => {
    if (!state.isPlaying) {
      setMetrics(metricsRef.current);
    }
  }, [state.isPlaying]);

  useEffect(() => stopLoop, [stopLoop]);

  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const seek = useCallback((progress: number) => dispatch({ type: "seek", progress }), []);
  const stepFrame = useCallback(() => dispatch({ type: "step_frame", frameRate }), [frameRate]);
  const reset = useCallback(() => dispatch({ type: "reset" }), []);
  const setPlaybackSpeed = useCallback(
    (speed: number) => dispatch({ type: "set_speed", playbackSpeed: speed }),
    []
  );

  const controller = useMemo<PreviewPlaybackController>(
    () => ({
      ...state,
      play,
      pause,
      seek,
      stepFrame,
      reset,
      setPlaybackSpeed,
      currentTimeMs: Math.max(0, state.progress * state.durationSeconds * 1000),
      metrics,
    }),
    [metrics, pause, play, reset, seek, setPlaybackSpeed, state, stepFrame]
  );

  return controller;
}
