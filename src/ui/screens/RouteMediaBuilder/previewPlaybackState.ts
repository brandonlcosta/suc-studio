export type PreviewPlaybackState = {
  isPlaying: boolean;
  progress: number;
  playbackSpeed: number;
  durationSeconds: number;
};

type PreviewPlaybackAction =
  | { type: "set_duration"; durationSeconds: number }
  | { type: "set_speed"; playbackSpeed: number }
  | { type: "play" }
  | { type: "pause" }
  | { type: "seek"; progress: number }
  | { type: "step_frame"; frameRate: number }
  | { type: "tick"; deltaSeconds: number }
  | { type: "reset" };

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toFinite(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeDurationSeconds(value: unknown): number {
  const duration = toFinite(value, 0);
  return Math.max(0, duration);
}

function normalizeSpeed(value: unknown): number {
  const speed = toFinite(value, 1);
  return Math.max(0.1, Math.min(8, speed));
}

function advanceProgress(
  state: PreviewPlaybackState,
  deltaSeconds: number
): PreviewPlaybackState {
  const safeDuration = normalizeDurationSeconds(state.durationSeconds);
  if (safeDuration <= 0) return { ...state, isPlaying: false, progress: 0 };
  const stepSeconds = Math.max(0, toFinite(deltaSeconds, 0));
  const speed = normalizeSpeed(state.playbackSpeed);
  const deltaProgress = (stepSeconds * speed) / safeDuration;
  const progress = clamp01(state.progress + deltaProgress);
  return {
    ...state,
    progress,
    isPlaying: progress >= 1 ? false : state.isPlaying,
  };
}

export function createInitialPreviewPlaybackState(
  durationSeconds: number,
  progress = 0
): PreviewPlaybackState {
  return {
    isPlaying: false,
    progress: clamp01(progress),
    playbackSpeed: 1,
    durationSeconds: normalizeDurationSeconds(durationSeconds),
  };
}

export function previewPlaybackReducer(
  state: PreviewPlaybackState,
  action: PreviewPlaybackAction
): PreviewPlaybackState {
  switch (action.type) {
    case "set_duration": {
      const durationSeconds = normalizeDurationSeconds(action.durationSeconds);
      if (durationSeconds <= 0) {
        return { ...state, durationSeconds, progress: 0, isPlaying: false };
      }
      return {
        ...state,
        durationSeconds,
        progress: clamp01(state.progress),
      };
    }
    case "set_speed":
      return { ...state, playbackSpeed: normalizeSpeed(action.playbackSpeed) };
    case "play":
      return {
        ...state,
        isPlaying: state.durationSeconds > 0 && state.progress < 1,
      };
    case "pause":
      return { ...state, isPlaying: false };
    case "seek":
      return {
        ...state,
        isPlaying: false,
        progress: clamp01(action.progress),
      };
    case "step_frame": {
      const frameRate = Math.max(1, toFinite(action.frameRate, 30));
      return advanceProgress({ ...state, isPlaying: false }, 1 / frameRate);
    }
    case "tick":
      return advanceProgress(state, action.deltaSeconds);
    case "reset":
      return { ...state, isPlaying: false, progress: 0 };
    default:
      return state;
  }
}
