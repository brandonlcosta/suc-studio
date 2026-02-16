# Cinematic Editor UX Spec

## Layer Ownership
- Layer: `suc-studio` (Authoring UX)
- Scope: single-route cinematic route editor UX behavior

## SUC-OS Invariants (Re-stated)
1. Studio authors and validates canonical JSON.
2. Studio does not perform final broadcast rendering.
3. Canonical schema ownership remains in `suc-shared-data`.
4. Canonical data remains append-only and versioned.

## Responsibilities
- Define interactive authoring model for map + timeline.
- Preserve deterministic edit outcomes.
- Keep interactions aligned with canonical constraints.

## Non-Goals
- Multi-route editing or synchronization.
- Cross-route comparison UI.
- Divergence branch authoring.
- FFmpeg/final render behavior in studio preview.

## Layout
Primary layout: two-panel shell with map focus and bottom timeline.

ASCII layout:
```text
+--------------------------------------------------------------+
| Top Bar                                                      |
+-----------------------------+--------------------------------+
| Left Panel (List/Inspector) | Map Canvas (Primary Surface)  |
| - Route media metadata      | - Route line                  |
| - Selected entry controls   | - POI/title anchors           |
| - Quick actions             | - Segment handles             |
+-----------------------------+--------------------------------+
| Bottom Timeline (multi-lane + elevation waveform)           |
+--------------------------------------------------------------+
```

## Map Interaction Rules
- Click route to place entry at snapped mileage point.
- Drag POI/title anchors along route path only.
- Segment handles drag along route with clamped bounds.
- Selection on map must select corresponding timeline entry.
- Hover highlights should synchronize across map and timeline.

## Timeline Interaction Rules
- Timeline is authoritative for time/progress sequencing.
- Entries are draggable within lane constraints.
- Segment bars support edge-resize for start/end refinement.
- Scrubber updates active map position in real time.

## Multi-Lane Model
Lanes:
- `title`
- `poi`
- `camera`
- `speed`

ASCII timeline tracks:
```text
Time/Progress ------------------------------------------------>
[Elevation]    /\_/\____/\___/\____
[Title  ]      |--T1--|      |T2|
[POI    ]        |P1|      |P2|
[Camera ]      |----C1----| |C2|
[Speed  ]    |S1|    |---S2---|
```

## Collision Policy
- No overlap allowed within the same lane.
- Cross-lane temporal overlap is allowed.
- On collision attempt, entry snaps to nearest valid non-overlapping boundary.
- If no valid slot exists in viewport, operation is rejected with inline feedback.

## Snap Rules
- Mile snapping: snap to route sample resolution and configured mile increment.
- Inflection snapping: optional snap to elevation inflection points.
- Segment edge snapping: snap to nearby entry boundaries and scrubber position.

## Elevation Waveform Integration
- Elevation profile renders as a timeline backbone track.
- Scrubber and selected entries project onto profile.
- Inflection points are exposed as snap candidates.
- Profile is read-only visualization (no direct geometry editing).

## Inspector Panel Behavior
- Inspector shows selected entry fields only.
- Inline validation for required/invalid fields.
- Scope-sensitive controls:
  - POI fields for POI lane entries
  - Camera preset controls for camera lane entries
  - Speed override controls for speed lane entries
- Dirty state shown before save/publish.

## Keyboard Shortcut Model
Phase 3 scope shortcuts:
- `S`: split selected entry at cursor
- `D`: duplicate selected entry
- `Delete`: remove selected entry
- `Arrow Left/Right`: nudge start + end (hold `Alt` to nudge start only, `Shift` to nudge end only)

## Live Preview Behavior (No FFmpeg)
- Preview simulates playback in browser/runtime only.
- Uses canonical route progress + lane data for immediate feedback.
- Preview is non-authoritative for final encoded output quality.

## Layout (Phase 3 Locked)
Right-side preview panel is added to the map row. Bottom timeline remains full width.

ASCII layout:
```text
+--------------------------------------------------------------+
| Top Bar                                                      |
+-----------------------------+-------------------------------+
| Left Inspector             | Center Map      | Preview     |
| - Plan settings            | - Route canvas  | - Play/Pause|
| - Entry controls           | - Markers       | - Scrub     |
|                            |                 | - Overlays  |
+-----------------------------+-------------------------------+
| Bottom Timeline (multi-lane + elevation waveform)           |
+--------------------------------------------------------------+
```

## State Management Approach
- Normalize entries by `entryId` and lane.
- Keep transient interaction state separate from canonical draft state.
- Derive render view models through memoized selectors.
- Apply deterministic reducers for drag/snap/collision resolution.

Example editor state shape:
```json
{
  "activeEntryId": "ent-012",
  "activeLane": "camera",
  "playback": { "isPlaying": true, "progress": 0.43 },
  "timeline": {
    "titles": [{ "entryId": "ent-012", "startSec": 128, "endSec": 133 }],
    "pois": [{ "entryId": "poi-aid-01", "mile": 8.15 }],
    "camera": [{ "entryId": "cam-03", "presetId": "cam-follow-medium" }],
    "speed": [{ "entryId": "spd-01", "startMile": 6.2, "endMile": 7.0, "milesPerSecond": 0.035 }]
  }
}
```
