# SUC-Workout — Timeline-Based Workout Builder

## Purpose
SUC-Workout is the **canonical workout builder** inside **SUC-Studio**.

It exists to design, edit, and store **reusable workout templates** using a
**timeline-based interface** similar to TrainingPeaks / Garmin — but with
correct architectural boundaries.

SUC-Workout is **not** a calendar.
SUC-Workout is **not** athlete-specific.
SUC-Workout is **not** a publishing system.

It is a **workout template engine** that feeds canonical truth into
`suc-shared-data`.

## Position in the Architecture
```
SUC-Studio
  ├─ Ingest Layer
  │     (CSV, TP exports, JSON, etc.)
  │
  ├─ SUC-Workout Builder
  │     (timeline editor, blocks, zones)
  │
  └─ Canonical Write Adapter
          ↓
     suc-shared-data/workouts/workouts.master.json
```

## Core Principles
- Timeline-first
- Relative intensity (zones / %), not resolved numbers
- Reusable templates
- Familiar TP / Garmin UX
- Studio-only write authority

## UI Layout
**Left:** Workout Library
**Center:** Timeline Editor
**Right:** Section Inspector

## Supported Sections (V1)
- Warmup
- Steady / Tempo
- Interval (work/rest × reps)
- Progression
- Cooldown
- Free / Notes

## Canonical Schema (V1)
See full schema definition in docs.

## Non-Goals
- Scheduling
- Athlete calendars
- Publishing
- Analytics

## Acceptance Criteria
- Timeline editor works
- Canonical workouts saved
- No downstream artifacts written

🚧 In active development
