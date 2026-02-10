# Canonical Season Bridge (Studio Publish)

## Purpose
The Studio Season Builder UI still uses the nested draft model (Season -> Blocks -> Weeks -> Day assignments + markers).
On publish, we now generate canonical training data in `suc-shared-data` for broadcast/viewers.

## Draft Shape (Current)
- `season.blocks[]`: array of block instances
- `block.weeks[]`: array of week instances
- `week.days`: optional map of day keys (`mon`..`sun`) to `{ workoutId?, notes? }`
- `season.seasonMarkers[]`: marker objects `{ markerId, label, weekIndex }`

## What Happens on Publish
1. The draft season is validated (existing Season Builder rules).
2. A deterministic transformer writes canonical files:
   - `suc-shared-data/seasons/season.<seasonId>.json`
   - `suc-shared-data/blocks/block.<blockId>.json`
   - `suc-shared-data/weeks/week.<weekId>.json`
   - `suc-shared-data/workouts/workout.<workoutId>.json` (only if missing)
3. Markers are written to a sidecar file:
   - `suc-shared-data/seasons/<seasonId>.markers.json`
4. `npm run validate:canonical` is executed in `suc-shared-data`.
5. If validation passes, the season is published and the draft is cleared.

## Mapping Rules
- Season
  - `id = seasonId`
  - `blocks = ordered blockIds`
  - `startDate` is preserved
  - `status = published`
- Block
  - `id = blockId`
  - `weeks = ordered weekIds`
  - `title = block.name`
  - `tags = block.tags`
- Week
  - `id = weekId`
  - `focus/stress/volume/intensity` mapped from the draft week
  - `workouts[]` = flattened day assignments (Mon -> Sun)
- Workout
  - If the draft references an existing workout ID, that ID is reused.
  - If missing, a stable placeholder ID is created from day + notes.
  - Workouts are created from `workouts.master.json` when available, otherwise a minimal placeholder is written.

## Determinism
- IDs and ordering are deterministic.
- A publish will produce the same canonical output for the same draft input.

## Deprecation Path (Planned)
- Short term: keep the nested Season Builder UI and bridge on publish.
- Medium term: introduce authoring screens that edit canonical files directly.
- Long term: remove the nested draft model once canonical authoring is complete.
