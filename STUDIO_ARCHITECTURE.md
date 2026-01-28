# SUC Studio Architecture

## Overview
SUC Studio is a web-based control plane for editing canonical data in `suc-shared-data`. It is **not** a compiler or renderer—it is strictly an editor.

## Strict Architectural Boundaries

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
- ✅ Write to `suc-shared-data/routes/`, `events/`, `workouts/`
- ✅ Import GPX files and save as canonical route groups
- ✅ Edit route metadata (`route.meta.json`)
- ✅ Create and edit events (`events.master.json`)
- ✅ Manage event selection (`events.selection.json`)

### What Studio DOES NOT DO:
- ❌ Compile GPX → GeoJSON
- ❌ Generate route stats files
- ❌ Write to viewer directories
- ❌ Render public maps
- ❌ Export compiled artifacts

**Mental Check:** If deleting `suc-route-viewer` would break Studio → you did it wrong.

---

## Technology Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **MapLibre GL** for route preview maps
- No UI framework (inline styles, matching legacy patterns)

### Backend
- **Express.js** server for file I/O operations
- **Node.js** filesystem access to `suc-shared-data`
- RESTful API for canonical data CRUD

### Communication
- Frontend ↔ Backend: HTTP/fetch (not Electron IPC)
- Backend → suc-shared-data: Direct filesystem access

---

## Directory Structure

```
suc-studio/
├── src/
│   ├── server/                    # Node.js backend
│   │   ├── index.ts               # Express app entry point
│   │   ├── api/
│   │   │   ├── routes.ts          # Route group endpoints
│   │   │   ├── events.ts          # Event endpoints
│   │   │   └── workouts.ts        # Workout endpoints (future)
│   │   └── utils/
│   │       ├── sharedData.ts      # Canonical data I/O helpers
│   │       └── validation.ts      # Schema validation
│   │
│   └── ui/                        # React frontend
│       ├── main.tsx               # React entry point
│       ├── App.tsx                # Main app router
│       ├── screens/
│       │   ├── RouteManager.tsx        # GPX import + route groups
│       │   ├── EventBuilder.tsx        # Event creation + metadata
│       │   └── WorkoutBuilder.tsx      # Scaffold placeholder
│       ├── components/
│       │   ├── DropZone.tsx            # File drag-drop
│       │   ├── RouteCard.tsx           # Route display card
│       │   ├── RoutePreviewMap.tsx     # MapLibre preview
│       │   └── NavigationBar.tsx       # Screen navigation
│       └── utils/
│           ├── gpxParser.ts            # GPX parsing (client-side preview)
│           └── api.ts                  # Fetch wrapper for backend

├── public/                        # Static assets
│   └── maplibre-style.json        # MapLibre style (if needed)

├── vite.config.ts                 # Vite config (proxy to backend)
├── tsconfig.json
└── package.json
```

---

## API Design

All endpoints operate on canonical data in `suc-shared-data`.

### Route Group Endpoints

#### `POST /api/routes/import`
Upload GPX file for parsing and preview.

**Request:** `multipart/form-data` with GPX file

**Response:**
```json
{
  "fileName": "MED.gpx",
  "coords": [[lon, lat], ...],
  "elevations": [meters, ...],
  "distanceMi": 12.5,
  "elevationFt": 850
}
```

**Does NOT save to disk**—returns parsed data for client preview only.

---

#### `POST /api/routes/:groupId`
Save a route group to `suc-shared-data/routes/:groupId/`.

**Request Body:**
```json
{
  "routeGroupId": "SUC-034",
  "name": "To Hell and Back",
  "location": "Mount Diablo",
  "source": "SUC",
  "notes": "Original event routes.",
  "variants": [
    {
      "label": "MED",
      "gpxContent": "<base64 or raw GPX XML>"
    },
    {
      "label": "LRG",
      "gpxContent": "<base64 or raw GPX XML>"
    }
  ]
}
```

**Writes:**
- `suc-shared-data/routes/SUC-034/route.meta.json`
- `suc-shared-data/routes/SUC-034/MED.gpx`
- `suc-shared-data/routes/SUC-034/LRG.gpx`

**Response:**
```json
{
  "success": true,
  "routeGroupId": "SUC-034",
  "path": "c:/Users/.../suc-shared-data/routes/SUC-034"
}
```

---

#### `GET /api/routes`
List all route groups in `suc-shared-data/routes/`.

**Response:**
```json
{
  "routeGroups": [
    {
      "routeGroupId": "SUC-034",
      "name": "To Hell and Back",
      "location": "Mount Diablo",
      "variants": ["MED", "LRG", "XL"]
    }
  ]
}
```

---

#### `GET /api/routes/:groupId`
Get a specific route group's metadata and GPX files.

**Response:**
```json
{
  "routeGroupId": "SUC-034",
  "name": "To Hell and Back",
  "location": "Mount Diablo",
  "source": "SUC",
  "notes": "...",
  "variants": [
    {
      "label": "MED",
      "gpxPath": "suc-shared-data/routes/SUC-034/MED.gpx"
    }
  ]
}
```

---

### Event Endpoints

#### `GET /api/events`
Read `suc-shared-data/events/events.master.json`.

**Response:**
```json
{
  "version": 1,
  "events": [
    {
      "eventId": "SUC-034",
      "eventName": "To Hell and Back",
      "eventDescription": "...",
      "eventDate": "2025-06-15",
      "eventTime": "7:45 PM",
      "startLocationName": "Southside Park",
      "startLocationUrl": "https://maps.google.com/...",
      "startLocationCoordinates": { "lat": 38.582, "lng": -121.484 },
      "routeGroupIds": ["SUC-034"]
    }
  ]
}
```

---

#### `POST /api/events`
Update `events.master.json` with new or edited events.

**Request Body:**
```json
{
  "version": 1,
  "events": [...]
}
```

**Writes:** `suc-shared-data/events/events.master.json`

**Response:**
```json
{
  "success": true
}
```

---

#### `GET /api/events/selection`
Read `suc-shared-data/events/events.selection.json`.

**Response:**
```json
{
  "version": 1,
  "selectedEventIds": ["SUC-034", "SUC-035"]
}
```

---

#### `POST /api/events/selection`
Update `events.selection.json`.

**Request Body:**
```json
{
  "version": 1,
  "selectedEventIds": ["SUC-034"]
}
```

**Writes:** `suc-shared-data/events/events.selection.json`

**Response:**
```json
{
  "success": true
}
```

---

## UI Screens

### 1. Route Manager (`/routes`)

**Purpose:** Import GPX files, create route groups, manage variants.

**Features:**
- Drag-drop GPX import
- Parse GPX → display stats (distance, elevation)
- Auto-assign labels based on distance ranking (MED → LRG → XL → XXL)
- Manual label override
- MapLibre preview with color-coded routes
- Save route group to `suc-shared-data/routes/:groupId/`

**Layout:**
- Left panel: Controls + route list
- Right panel: MapLibre map

**UX Flow:**
1. User drops GPX files
2. Studio parses → shows stats
3. User assigns labels (auto-suggested)
4. User sets route group ID, name, location
5. Studio writes to `suc-shared-data/routes/:groupId/`

---

### 2. Event Builder (`/events`)

**Purpose:** Create and edit events, link to route groups.

**Features:**
- List existing events from `events.master.json`
- Create new event
- Edit event metadata (name, description, date, time, location)
- Attach route groups via `routeGroupIds` array
- Save to `events.master.json`
- Manage editorial selection (`events.selection.json`)

**Layout:**
- List view: All events with edit/delete actions
- Detail view: Event form with route group picker

**UX Flow:**
1. User creates new event or edits existing
2. Fills in metadata
3. Selects route groups from dropdown/picker
4. Studio writes to `events.master.json`
5. User toggles event in selection editor
6. Studio writes to `events.selection.json`

---

### 3. Workout Builder (`/workouts`)

**Purpose:** Scaffold placeholder for future workout creation.

**Features (scaffold only):**
- Empty state message: "Workout builder coming soon"
- Data structure placeholder: writes to `workouts.master.json`

**No functionality in Phase 1.**

---

## Mental Model

### Route Groups vs Events

**Route Group:**
- A collection of route variants (MED, LRG, XL, XXL)
- Lives in `suc-shared-data/routes/:groupId/`
- Has `route.meta.json` + GPX files
- Reusable across multiple events

**Event:**
- A specific occurrence (date, time, location)
- Lives in `suc-shared-data/events/events.master.json`
- References route groups via `routeGroupIds: ["SUC-034"]`
- Can have multiple route groups (e.g., multiple start locations)

**Example:**
```
Route Group: SUC-034 "To Hell and Back"
  ├─ MED.gpx
  ├─ LRG.gpx
  └─ XL.gpx

Event: SUC-034 "To Hell and Back - June 2025"
  ├─ eventDate: "2025-06-15"
  ├─ eventTime: "7:45 PM"
  └─ routeGroupIds: ["SUC-034"]

Event: SUC-042 "To Hell and Back - August 2025"
  ├─ eventDate: "2025-08-10"
  ├─ eventTime: "8:00 PM"
  └─ routeGroupIds: ["SUC-034"]  # Reuses same route group!
```

---

## Harvested UX Patterns from Legacy

### Color Palette
```typescript
const ROUTE_COLORS: Record<RouteLabel, string> = {
  MED: "#00FF99",  // neon green
  LRG: "#13FFE2",  // neon blue
  XL:  "#FF47A1",  // neon pink
  XXL: "#9B4DFF",  // neon purple
};
```

### Label Auto-Assignment Logic
```typescript
function labelForRank(index: number, total: number): RouteLabel {
  if (total <= 1) return "MED";
  if (total === 2) return index === 0 ? "MED" : "XXL";
  if (total === 3) return index === 0 ? "MED" : index === 2 ? "XXL" : "LRG";
  if (total === 4) return LABELS[index];  // MED, LRG, XL, XXL

  // For 5+ routes, distribute across labels
  const lastIndex = total - 1;
  if (index === 0) return "MED";
  if (index === lastIndex) return "XXL";
  const midpoint = Math.floor(total / 2);
  return index < midpoint ? "LRG" : "XL";
}
```

### Two-Column Layout
```css
.layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 450px;
  overflow-y: auto;
  padding: 1.5rem;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
}

.map-container {
  flex: 1;
  height: 100%;
  background-color: #000;
}
```

### Route Card Component
```tsx
<div style={{
  padding: "1rem",
  border: "1px solid #ddd",
  borderRadius: "6px",
  backgroundColor: "#fff",
  borderLeft: `4px solid ${ROUTE_COLORS[route.label]}`
}}>
  <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
    {route.fileName}
  </div>

  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: ROUTE_COLORS[route.label] }}>
    {route.label}
  </div>

  <div>
    <div style={{ color: "#666", fontSize: "0.75rem" }}>Distance</div>
    <div>{route.distanceMi.toFixed(2)} mi</div>
  </div>

  <div>
    <div style={{ color: "#666", fontSize: "0.75rem" }}>Elevation</div>
    <div>{route.elevationFt.toFixed(0)} ft</div>
  </div>
</div>
```

---

## Implementation Phases

### Phase 1: Route Manager (Current Task)
- [x] Design architecture
- [ ] Set up Vite + React + Express backend
- [ ] Implement GPX import endpoint (`POST /api/routes/import`)
- [ ] Implement DropZone component
- [ ] Implement GPX parser (client-side preview)
- [ ] Implement route card UI
- [ ] Implement MapLibre preview map
- [ ] Implement save route group endpoint (`POST /api/routes/:groupId`)
- [ ] Write to `suc-shared-data/routes/`

### Phase 2: Event Builder
- [ ] List route groups from `suc-shared-data/routes/`
- [ ] Create event form UI
- [ ] Route group picker component
- [ ] Save to `events.master.json`
- [ ] Selection editor for `events.selection.json`

### Phase 3: Workout Builder (Scaffold)
- [ ] Empty state UI
- [ ] Placeholder for `workouts.master.json`

### Phase 4: Cleanup
- [ ] Archive legacy route-builder code
- [ ] Verify no compilation logic exists
- [ ] Verify no viewer artifacts are written
- [ ] Test end-to-end flow

---

## Safety Checks

Before merging, verify:

1. **No compilation:**
   ```bash
   grep -r "geojson" src/  # Should find ZERO results in Studio code
   grep -r "public/routes" src/  # Should find ZERO results
   ```

2. **No viewer writes:**
   ```bash
   grep -r "compiled" src/  # Should find ZERO results
   ```

3. **Only writes to suc-shared-data:**
   ```bash
   grep -r "writeFile" src/server/  # Should ONLY write to suc-shared-data paths
   ```

4. **suc-broadcast still works:**
   - Run broadcast compiler independently
   - Verify viewer can load compiled artifacts
   - Studio deletion should not affect viewer

---

## Success Criteria

✅ Studio UI can drop GPX into canonical routes
✅ Route metadata is editable and saved correctly
✅ Events can be created, edited, and selected
✅ No compiled artifacts are written
✅ Broadcast + Viewer still work unchanged

**Final Test:** Delete `suc-route-viewer` → Studio should still work perfectly.
