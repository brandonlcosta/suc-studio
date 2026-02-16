# Cinematic Timeline Engine Architecture

## Layer Ownership
- Layer: `suc-studio` (Timeline engine internals)
- Scope: single-route timeline mechanics for cinematic authoring

## SUC-OS Invariants (Re-stated)
1. Studio handles authoring interactions only.
2. Canonical contracts remain defined in `suc-shared-data`.
3. Engine outputs must remain deterministic and schema-compatible.
4. No compile-time media encoding responsibilities in this layer.

## Responsibilities
- Provide deterministic lane/track manipulation.
- Keep map and timeline in lockstep.
- Expose robust drag, snap, and overlap resolution.

## Non-Goals
- Multi-route lane graphs.
- Tier-aware synchronized tracks.
- Cross-route merge/split editing.

## Timeline Lane Model
Lane set is fixed for this phase (single route only):
- `title`
- `poi`
- `camera`
- `speed`

Each lane is projected from canonical timeline entries without mutating canonical shape.
Each lane enforces non-overlap internally while allowing overlap across different lanes.

## Track Abstraction
Track = logical timeline container with:
- lane id
- ordered entry list
- overlap policy
- snap strategy
- render metadata

Example track abstraction:
```json
{
  "lane": "camera",
  "allowOverlap": false,
  "snapMode": "mile+inflection",
  "entries": ["entry-004", "entry-010"]
}
```

## Phase 2 Lane Abstraction (Controller-Level)
- Canonical timeline remains a single `timeline[]` list in route-media.
- Studio projects canonical entries into lane buckets for rendering/interaction.
- Projection context includes route defaults:
  - default camera mode
  - default playback speed
- Camera lane shows camera overrides only.
- Speed lane shows speed overrides only.
- Title lane shows title/subtitle semantics.
- POI lane shows marker type `poi`.

ASCII projection flow:
```text
canonical timeline[] + markers[] + defaults
                  |
                  v
        lane projection adapter
   +--------+------+--------+--------+
   | title  | poi  | camera | speed  |
   +--------+------+--------+--------+
```

## Entry Structure
Entry core fields:
- `entryId`
- `lane`
- `startSec` / `endSec` and/or progress anchors (`mile`, `startMile`, `endMile`)
- lane-specific payload

Example entry:
```json
{
  "entryId": "spd-01",
  "lane": "speed",
  "startMile": 6.2,
  "endMile": 7.0,
  "payload": { "milesPerSecond": 0.035 }
}
```

## Drag Logic
- Start drag -> capture immutable drag origin snapshot.
- Move drag -> compute proposed anchor, apply snap, clamp bounds.
- Validate -> reject overlap in same lane.
- Commit -> dispatch deterministic state update.

## Overlap Detection
- Same-lane overlap prohibited.
- Interval test uses half-open windows `[start, end)` to avoid edge ambiguity.
- Collision resolution picks nearest valid boundary by deterministic rule.
- Validation pipeline:
  - sort lane entries by `startMi`, then `endMi`, then `entryId`
  - flag overlap when `next.startMi < previous.endMi`
  - ignore cross-lane intersections

## Map <-> Timeline Sync Rules
- Single selected `entryId` shared across map and timeline.
- Map drag updates timeline projection immediately.
- Timeline drag updates map anchor immediately.
- Scrubber position drives both map marker position and active waveform marker.

## POI Attachment Logic (UI-Only)
- Title entries can attach to a POI entry in Studio state.
- Attachment map is editor-local and not written into canonical schema.
- While attached:
  - title `startMi` is synchronized to attached POI `startMi`
  - title duration is preserved
- If attached POI is removed, attachment is discarded safely.

## Elevation Profile Rendering Logic
- Render from route elevation samples as a lightweight polyline/waveform.
- Build decimated profile for large routes to keep interaction smooth.
- Derive inflection points for snap assistance.
- Elevation profile is visualization-only and cannot alter canonical geometry.

### Phase 1 Backbone Details
- Elevation points are derived from route geometry stats as immutable tuples: `{ mile, elevation }`.
- The waveform renderer uses canvas and bucketed min/max downsampling per pixel column.
- Downsampling recomputes only when route context or viewport size changes.
- Timeline block drag does not trigger elevation recomputation.

### Snap Anchor Logic (Phase 1 Basic)
- Anchors are detected from local extrema:
  - summit: `elevation[i] > elevation[i-1] && elevation[i] > elevation[i+1]`
  - valley: `elevation[i] < elevation[i-1] && elevation[i] < elevation[i+1]`
- During block drag, if block x-position is within a pixel threshold of an anchor x-position, start mile snaps to anchor mile.
- Snapping is UI-only behavior and does not alter canonical schema structure.

## Playback Scrub Model
- Scrubber tracks normalized route progress + derived seconds.
- Scrubbing updates active entries by lane hit-testing at current progress.
- Frame step uses fixed delta and deterministic rounding.

Example scrub state:
```json
{
  "progress": 0.428,
  "timeSec": 132.4,
  "activeEntries": {
    "titles": "ent-012",
    "camera": "cam-03",
    "speed": "spd-01"
  }
}
```

## Track Isolation Model
- Editing actions are lane-scoped in the UI:
  - drag, split, duplicate, delete, nudge
  - lock/collapse controls per lane
- Lane lock prevents edits in that lane only.
- Solo control is a UI stub in this phase (no filtering behavior yet).
- Lane-specific snapping:
  - elevation anchors (summit/valley)
  - same-lane block edges

## Performance Considerations
- Normalize store by lane and id for O(1) entry lookup.
- Memoize lane projections and collision maps.
- Throttle drag updates to animation frame cadence.
- Avoid full re-render on single lane mutation.
- Precompute snap candidates (mile marks + inflection points).
- Keep elevation redraw bounded to frame budget by:
  - drawing downsampled columns rather than raw full-resolution lines
  - memoizing derived waveform and anchor arrays
  - isolating cursor/drag updates from heavy profile preprocessing

## Suggested Component Architecture
- `CinematicEditorShell`
- `EditorLeftPanel`
- `EditorMapCanvas`
- `TimelineRoot`
- `ElevationTrack`
- `LaneTrack` (reused per lane)
- `PlaybackControls`
- `useTimelineController`
- `useMapTimelineSync`
- `useCollisionResolver`
- `useElevationProfile`

ASCII component flow:
```text
EditorShell
  +-- MapCanvas <-> useMapTimelineSync <-> TimelineRoot
  +-- LeftPanel <-> useTimelineController
  +-- PlaybackControls -> scrub/play commands -> controller
```
