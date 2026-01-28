# suc-studio (read-only probe)

This repo is a read-only authoring layer used to verify connectivity to
`suc-shared-data`. It loads canonical JSON and route folders and prints a
summary. No writes occur.

## Requirements
- Node.js

## Usage
```bash
npm install
npm run dev
```

## Notes
- Shared data root is resolved via `src/paths.ts`.
- This repo should be safe to delete without affecting shared data.

## SUC-Workout
See the SUC-Workout timeline builder overview in `docs/SUC-WORKOUT.md`.
