# SUC Studio

This repo is the authoring layer for SUC-Workout. It includes a timeline editor
UI that reads/writes workouts via the canonical write adapter.
Web-based control plane for editing canonical data in [suc-shared-data](../suc-shared-data).

**Studio is strictly an editor**—it does NOT compile, render, or generate viewer artifacts.

## Architecture

```
suc-studio (UI editor only)
     ↓ writes canonical data
suc-shared-data (canonical truth)
     ↓ reads for compilation
suc-broadcast (compiler)
     ↓ writes compiled artifacts
suc-route-viewer (renderer)
```

### What Studio DOES:
- ✅ Edit canonical data only
- ✅ Import GPX files and save to `suc-shared-data/routes/`
- ✅ Edit route metadata (`route.meta.json`)
- ✅ Create and edit events (`events.master.json`)
- ✅ Manage event selection (`events.selection.json`)

### What Studio DOES NOT DO:
- ❌ Compile GPX → GeoJSON
- ❌ Generate route stats files
- ❌ Write to viewer directories
- ❌ Render public maps

## Technology Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Express.js + Node.js
- **Communication:** HTTP/REST (no Electron)

## Getting Started

### Requirements
- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

Start both the backend server and frontend dev server:

```bash
npm run dev
```

Visit `http://localhost:3000` to open the timeline editor.

## Environment Variables

This service requires a local `.env.local` file.

Required:
- VITE_API_BASE (broadcast API base URL)

See `.env.example` for details.

## Environment Files

This app uses **Vite**.

Local development config must be placed in:

    .env.local

Vite automatically loads `.env.local`.

See `.env.example` for required variables.

## Notes
- Shared data root is resolved via `src/paths.ts`.
- All workout saves target `suc-shared-data/workouts/workouts.master.json`.

## SUC-Workout
See the SUC-Workout timeline builder overview in `docs/SUC-WORKOUT.md`.
This runs:
- Backend API server on `http://localhost:3001`
- Frontend UI on `http://localhost:3000`

The frontend proxies API requests to the backend automatically.

### CLI (Legacy)

The old CLI tool is still available:

```bash
npm run cli
npm run cli select-event SUC-034
```

## Usage

### 1. Route Manager

**Import GPX files and create route groups:**

1. Navigate to "Route Manager"
2. Drag and drop GPX files (or click "Browse Files")
3. Studio auto-assigns labels based on distance (MED → LRG → XL → XXL)
4. Manually adjust labels if needed
5. Fill in route group metadata (ID, name, location)
6. Click "Save Route Group"

Routes are written to `suc-shared-data/routes/:groupId/`

### 2. Event Builder

**Create and manage events:**

1. Navigate to "Event Builder"
2. Click "Create New Event"
3. Fill in event metadata (ID, name, description, date, time, location)
4. Select route groups to attach to the event
5. Click "Create" to stage the event
6. Toggle "Selected" to include in `events.selection.json`
7. Click "Save All" to persist changes

Events are written to `suc-shared-data/events/`

### 3. Workout Builder

Placeholder for future workout management (Phase 3).

## Project Structure

```
suc-studio/
├── src/
│   ├── server/              # Express backend
│   │   ├── index.ts         # Server entry point
│   │   ├── types.ts         # Shared types
│   │   ├── api/
│   │   │   ├── routes.ts    # Route group endpoints
│   │   │   ├── events.ts    # Event endpoints
│   │   │   └── workouts.ts  # Workout endpoints (scaffold)
│   │   └── utils/
│   │       ├── paths.ts     # suc-shared-data paths
│   │       ├── sharedData.ts # Canonical data I/O
│   │       └── gpxParser.ts  # GPX parsing
│   │
│   └── ui/                  # React frontend
│       ├── index.html       # HTML entry point
│       ├── main.tsx         # React entry point
│       ├── App.tsx          # Main app router
│       ├── types.ts         # Frontend types
│       ├── screens/
│       │   ├── RouteManager.tsx
│       │   ├── EventBuilder.tsx
│       │   └── WorkoutBuilder.tsx
│       ├── components/
│       │   ├── NavigationBar.tsx
│       │   ├── DropZone.tsx
│       │   └── RouteCard.tsx
│       └── utils/
│           ├── api.ts       # Backend API client
│           └── routeLabels.ts
│
├── route-builder/           # Legacy Electron app (to be archived)
├── STUDIO_ARCHITECTURE.md   # Detailed architecture docs
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API Endpoints

### Routes

- `POST /api/routes/import` - Parse GPX file (preview only, no save)
- `GET /api/routes` - List all route groups
- `GET /api/routes/:groupId` - Get specific route group
- `POST /api/routes/:groupId` - Save route group to suc-shared-data

### Events

- `GET /api/events` - Read events.master.json
- `POST /api/events` - Update events.master.json
- `GET /api/events/selection` - Read events.selection.json
- `POST /api/events/selection` - Update events.selection.json

### Workouts

- `GET /api/workouts` - Read workouts.master.json
- `POST /api/workouts` - Update workouts.master.json

## Safety Checks

Before deploying, verify Studio doesn't violate architectural boundaries:

```bash
# Should find ZERO results:
grep -r "geojson" src/server/
grep -r "public/routes" src/server/
grep -r "compiled" src/server/

# Should ONLY write to suc-shared-data paths:
grep -r "writeFile" src/server/
```

## Next Steps

1. **Archive Legacy:** Remove `route-builder/` directory after feature extraction
2. **Test End-to-End:** Verify Studio → Broadcast → Viewer pipeline
3. **Add MapLibre:** Integrate route preview maps (future enhancement)

## License

Private - SUC Internal Tool
