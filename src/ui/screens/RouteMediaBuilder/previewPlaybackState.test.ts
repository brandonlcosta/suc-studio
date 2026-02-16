import assert from "assert/strict";
import {
  createInitialPreviewPlaybackState,
  previewPlaybackReducer,
} from "./previewPlaybackState";

let state = createInitialPreviewPlaybackState(10);
assert.equal(state.isPlaying, false);
assert.equal(state.progress, 0);

state = previewPlaybackReducer(state, { type: "play" });
assert.equal(state.isPlaying, true, "play should transition to playing");

state = previewPlaybackReducer(state, { type: "tick", deltaSeconds: 1 });
assert(Math.abs(state.progress - 0.1) < 1e-9, "tick should advance progress from duration");

state = previewPlaybackReducer(state, { type: "seek", progress: 0.6 });
assert.equal(state.isPlaying, false, "seek should pause playback");
assert(Math.abs(state.progress - 0.6) < 1e-9, "seek should set progress exactly");

state = previewPlaybackReducer(state, { type: "set_speed", playbackSpeed: 2 });
state = previewPlaybackReducer({ ...state, isPlaying: true }, { type: "tick", deltaSeconds: 0.5 });
assert(Math.abs(state.progress - 0.7) < 1e-9, "speed should scale tick progress");

state = previewPlaybackReducer(state, { type: "step_frame", frameRate: 20 });
assert(state.progress > 0.7, "step frame should increment progress even while paused");

state = previewPlaybackReducer(state, { type: "set_duration", durationSeconds: 0 });
assert.equal(state.isPlaying, false, "zero duration should force pause");
assert.equal(state.progress, 0, "zero duration should clamp progress");

console.log("previewPlaybackState transition tests passed");
