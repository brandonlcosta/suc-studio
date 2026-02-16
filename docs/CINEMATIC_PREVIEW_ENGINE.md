# Cinematic Preview Engine

## Layer Ownership
- Layer: `suc-studio` (Authoring-time real-time preview)
- Scope: in-editor playback preview for a single-route cinematic plan

## SUC-OS Invariants (Re-stated)
1. Preview is an authoring aid, not final media compilation.
2. Canonical data remains sourced from `suc-shared-data` contracts.
3. Preview logic must not mutate canonical data outside explicit editor actions.
4. Broadcast remains owner of final encoded output.

## Responsibilities
- Provide low-latency visual playback of route progress.
- Reflect timeline lane effects (titles, POIs, camera, speed) in real time.
- Keep deterministic behavior under fixed inputs.
- Keep preview state isolated from canonical route-media persistence.

## Non-Goals
- FFmpeg encoding or export quality parity.
- Multi-route synchronized preview.
- Route comparison or divergence simulation.
- Canonical schema mutation or compile pipeline side effects.

## Real-Time Preview Playback
- Playback scalar is normalized `progress` (`0.0 -> 1.0`).
- `requestAnimationFrame` loop runs only while `isPlaying = true`.
- Each frame:
  1. Clamp delta time to avoid tab-switch jump spikes.
  2. Advance progress deterministically from `durationSeconds` and `playbackSpeed`.
  3. Sample route mile/index, camera state, and overlay state.
  4. Push sampled frame to map/timeline UI.

### Playback State Model
- `isPlaying: boolean`
- `progress: number`
- `playbackSpeed: number`
- `durationSeconds: number` (derived from route length + playback baseline)

State transitions:
```text
            +------ play ------+
            |                  v
 [paused] ------ seek ----> [paused]
    |  ^                     |
    |  +---- pause ----------+
    |
    +---- reset ---------> progress=0, paused

 [playing] -- tick --> progress += (deltaSec * speed) / duration
 [playing] -- progress>=1 --> paused
```

## Camera Interpolation Model
- Camera keyframes are derived from:
  - default camera preset (`draft.camera`)
  - camera override timeline segments (single-route canonical entries)
- Phase 3 interpolation:
  - Linear interpolation only (easing reserved as a future stub)
  - Per-frame interpolation for `zoom`, `bearing`, `pitch`
  - Route position sampled by progress-mapped mile/index
- Deterministic ordering:
  - keyframes sorted by `mile`, then priority
  - same-mile collisions resolved by stable priority

Example camera sample state:
```json
{
  "progress": 0.428,
  "camera": {
    "mode": "third-person-follow",
    "zoom": 13.6,
    "bearing": 10.0,
    "pitch": 54.2
  }
}
```

## Overlay Rendering
- Active overlays are sampled from lane projections:
  - Title lane: active blocks with fade in/out opacity
  - POI lane: in-range highlight pulses by distance-to-mile opacity
  - Speed lane: active speed indicator (visual only)
- Overlay activation is progress-driven and side-effect free.
- Preview overlay rendering does not edit canonical timeline entries.

Example overlay payload:
```json
{
  "overlays": [
    { "kind": "title", "entryId": "entry-12", "text": "Ridge Traverse", "opacity": 0.92 },
    { "kind": "poi", "entryId": "entry-18", "text": "Aid Station", "opacity": 0.75 },
    { "kind": "speed", "entryId": "entry-27", "speedMiPerSec": 0.8 }
  ]
}
```

## Progress-Based Playback
- Progress is primary scalar (`0.0` to `1.0`) tied to single-route distance.
- Time is derived from progress and derived duration.
- Scrubber manipulates progress directly for deterministic seeking.
- Seeking pauses playback and updates map/timeline in the same frame.

## Frame Stepping Model
- Frame step uses fixed preview FPS delta (e.g., `1 / previewFps`).
- Forward/back steps clamp to `[0, duration]`.
- Each step reevaluates lane state and camera sample deterministically.

## How Preview Differs From Broadcast Render
- Preview:
  - Real-time, interactive, approximate quality.
  - Runtime overlays and camera interpolation optimized for UX latency.
  - No ffmpeg invocation and no compile pipeline usage.
- Broadcast:
  - Offline compile/render, final encoded artifact quality.
  - Deterministic artifact outputs for distribution.

## Performance Boundaries
- Target smooth editing feedback under active drag/scrub.
- Degrade gracefully under heavy route sample density via decimation/downsampling.
- Keep overlay and camera computations incremental per frame.
- Precompute and memoize:
  - camera keyframes
  - overlay lane lookup
  - route/elevation index arrays
- Avoid per-frame allocations that leak memory across repeated play/pause cycles.

## Performance Metrics (Phase 3.5)
- Compute-frame metric: average time to sample a preview frame (progress → mapping → camera → overlays).
- Compute metric excludes UI paint/layout cost and map rendering cost.
- Target definition for Phase 3:
  - Compute frame average < 16ms
  - UI paint cost is measured separately in later phases

## Determinism Considerations
- Same canonical draft + same initial preview state => same sampled sequence.
- Fixed step interval and stable sort orders for active entries.
- No random jitter or wall-clock seeded behaviors in playback logic.

## Isolation Guarantees
- Preview playback state is local editor state only.
- Canonical route-media fields (`timeline`, `markers`, `subtitles`, playback defaults) are read-only inputs.
- Preview writes only transient view state:
  - scrub mile / cursor
  - map focus target
  - active overlay highlights
- Preview does not call broadcast compile functions and does not mutate schema payloads.
