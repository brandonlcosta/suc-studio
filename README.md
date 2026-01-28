# suc-studio (read-only probe)

This repo is the authoring layer for SUC-Workout. It includes a timeline editor
UI that reads/writes workouts via the canonical write adapter.

## Requirements
- Node.js

## Usage
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to open the timeline editor.

## Notes
- Shared data root is resolved via `src/paths.ts`.
- All workout saves target `suc-shared-data/workouts/workouts.master.json`.

## SUC-Workout
See the SUC-Workout timeline builder overview in `docs/SUC-WORKOUT.md`.
