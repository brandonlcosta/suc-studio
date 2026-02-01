# SUC Studio: Workout Builder Architecture

**STATUS:** Phase 1–3 Design Specification
**SCOPE:** Scaffolding only. No drag-drop, persistence, export, calculations, validation, or polish.

---

## IMMUTABLE PRINCIPLES

### 1. One Workout = One Intent, Many Tiers
- A workout represents ONE training stimulus
- Tiers (MED / LRG / XL / XXL) are volume/intensity progressions of the SAME intent
- If the intent changes, it is a different workout
- Never merge multiple intents into one workout

### 2. Effort Blocks Encode TARGET, Not Pace Math
- Blocks store `{ type: "pace" | "hr", zone: "Z1" | "Z2" | ... }`
- NO pace calculations (e.g., "7:30/mi") stored in canonical data
- NO heart rate BPM values stored in canonical data
- Viewer/compiler translates targets → actual paces using athlete profiles

### 3. Builder ≠ Viewer
- Builder edits canonical data only
- Builder NEVER renders workout previews with calculated paces
- Builder shows zone labels ("Z4"), not computed values ("7:15/mi")
- Viewer is responsible for all display logic

### 4. Draft ≠ Published
- Workouts have explicit status: `draft | published | archived`
- Status transitions are manual, explicit actions
- Published workouts are immutable (version bumps create new drafts)
- NO automatic publishing

### 5. Explicit Saves Only
- NO autosave
- NO "undo" history stored
- User clicks "Save" → writes to `workouts.master.json`
- Unsaved changes are lost on navigate/refresh (warn user)

### 6. No Derived Metrics Stored
- NO total duration stored
- NO total TSS/work calculated
- NO rep counts summed
- Viewer computes these on-the-fly

### 7. No "Smart" Behavior
- NO auto-fill of duration
- NO auto-suggest of targets
- NO copying tiers automatically
- User fills every field manually

### 8. No Validation
- Builder does NOT validate zone names
- Builder does NOT validate duration formats
- Builder does NOT check tier completeness
- Garbage in, garbage saved

### 9. No Defaults
- New blocks have empty fields: `duration: "", target: { type: "", zone: "" }`
- New tiers have empty structure arrays: `structure: []`
- User must explicitly set every value

### 10. Nothing Fixes Itself Automatically
- If user deletes a block → gone
- If user clears a field → stays empty
- If user creates malformed data → saved as-is
- NO auto-correction, NO safety nets

---

## FILE STRUCTURE

```
suc-studio/
└── src/
    └── ui/
        ├── screens/
        │   └── WorkoutBuilder/
        │       ├── WorkoutBuilder.tsx           # Root container
        │       ├── WorkoutHeader.tsx            # Workout metadata (name, description, etc.)
        │       ├── TierGrid.tsx                 # 4-column tier layout (MED/LRG/XL/XXL)
        │       └── ActionBar.tsx                # Save/Publish/Archive buttons
        │
        ├── components/
        │   └── workout/
        │       ├── TierColumn.tsx               # Single tier column (e.g., MED)
        │       ├── EffortBlock.tsx              # Single interval block (static)
        │       ├── WorkSegment.tsx              # Work portion (duration + target + cues)
        │       ├── RestSegment.tsx              # Rest portion (duration + target + cues)
        │       ├── TargetEditor.tsx             # Target type/zone selector
        │       └── DurationInput.tsx            # Duration text input
        │
        └── types/
            └── workout.types.ts                 # Core data models
```

---

## CORE DATA MODELS

### Canonical Workout (from `workouts.master.json`)

```typescript
type WorkoutStatus = "draft" | "published" | "archived";

type TargetType = "pace" | "hr";

type ZoneName = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | "Z6" | "Z7" | "Z8" | "Z9" | "Z10";

type TierLabel = "MED" | "LRG" | "XL" | "XXL";

interface Target {
  type: TargetType;
  zone: ZoneName;
}

interface EffortSegment {
  duration: string;            // e.g., "10min", "2min", "30sec"
  target: Target;              // Zone reference only, NO pace math
  cues: string[];              // Coach cues (e.g., ["Hold steady", "Focus on form"])
}

interface IntervalBlock {
  type: "interval";
  reps: number;                // Number of repetitions
  work: EffortSegment;         // Work effort
  rest: EffortSegment | null;  // Rest effort (null if no rest)
}

interface TierStructure {
  name: string;                // e.g., "Threshold 40 (MED)"
  structure: IntervalBlock[];  // Ordered array of intervals
}

interface Workout {
  workoutId: string;           // Unique ID (e.g., "workout-threshold-40")
  version: number;             // Increments on publish
  status: WorkoutStatus;       // draft | published | archived
  name: string;                // Workout name
  description: string;         // Short description
  focus: string[];             // Tags (e.g., ["threshold", "tempo"])
  coachNotes: string;          // Long-form notes for coaches
  tiers: Partial<Record<TierLabel, TierStructure>>;  // Only defined tiers exist
  createdAt: string;           // ISO 8601 timestamp
  updatedAt: string;           // ISO 8601 timestamp
  publishedAt: string | null;  // ISO 8601 timestamp or null
}
```

**CRITICAL:** This is the ONLY source of truth. Builder reads/writes this structure exactly.

---

### Builder State (ephemeral, NOT persisted)

```typescript
interface BuilderState {
  currentWorkout: Workout | null;  // Currently loaded workout
  isDirty: boolean;                // Has unsaved changes
  activeBlockId: string | null;    // Currently selected block (UI focus)
}
```

**RULES:**
- `isDirty` flag is set on ANY field change
- `isDirty` is cleared ONLY on successful save
- `activeBlockId` is purely UI state (not saved)

---

## COMPONENT RESPONSIBILITIES

### `WorkoutBuilder.tsx` (Root Container)
**Purpose:** Top-level orchestration and state management

**Responsibilities:**
- Load workout from `workouts.master.json` via API
- Maintain `BuilderState` in React state
- Handle save action → `POST /api/workouts/:workoutId`
- Handle publish action → update `status` field → save
- Handle archive action → update `status` field → save
- Warn on navigate if `isDirty === true`

**DOES NOT:**
- Validate workout structure
- Auto-save changes
- Compute derived metrics
- Transform data for display

**Props:** None (top-level screen)

---

### `WorkoutHeader.tsx` (Metadata Editor)
**Purpose:** Edit workout-level metadata

**Responsibilities:**
- Render text inputs for: `name`, `description`, `coachNotes`
- Render multi-select for `focus` tags
- Render status badge (read-only display of `status`)
- Emit change events to parent on field edit

**DOES NOT:**
- Save to API (parent handles)
- Validate inputs
- Suggest focus tags

**Props:**
```typescript
interface WorkoutHeaderProps {
  name: string;
  description: string;
  focus: string[];
  coachNotes: string;
  status: WorkoutStatus;
  onChange: (field: keyof Workout, value: any) => void;
}
```

---

### `TierGrid.tsx` (Tier Layout)
**Purpose:** Render 4-column tier layout

**Responsibilities:**
- Render exactly 4 columns: MED, LRG, XL, XXL
- Pass tier structure to each `TierColumn`
- Handle tier-level actions (e.g., "Add Block" button)
- Emit tier changes to parent

**DOES NOT:**
- Auto-copy blocks between tiers
- Validate tier structure
- Compute tier-level metrics

**Props:**
```typescript
interface TierGridProps {
  tiers: Partial<Record<TierLabel, TierStructure>>;
  onChange: (tier: TierLabel, structure: IntervalBlock[]) => void;
}
```

**Layout:**
```
┌─────────┬─────────┬─────────┬─────────┐
│   MED   │   LRG   │   XL    │   XXL   │
├─────────┼─────────┼─────────┼─────────┤
│ [Block] │ [Block] │ [Block] │ [Block] │
│ [Block] │ [Block] │ [Block] │         │
│ [Block] │         │         │         │
└─────────┴─────────┴─────────┴─────────┘
```

---

### `TierColumn.tsx` (Single Tier)
**Purpose:** Render all blocks in a single tier

**Responsibilities:**
- Render tier name (editable)
- Render array of `EffortBlock` components
- Render "Add Block" button at bottom
- Emit structure changes to parent

**DOES NOT:**
- Auto-fill new blocks with defaults
- Reorder blocks (Phase 1–3: static order)
- Validate block structure

**Props:**
```typescript
interface TierColumnProps {
  tier: TierLabel;
  structure: IntervalBlock[];
  onChange: (structure: IntervalBlock[]) => void;
}
```

---

### `EffortBlock.tsx` (Interval Block)
**Purpose:** Render a single interval block (static, no drag-drop)

**Responsibilities:**
- Render reps input
- Render `WorkSegment` component
- Render `RestSegment` component (if rest exists)
- Render "Delete Block" button
- Emit block changes to parent

**DOES NOT:**
- Validate reps > 0
- Auto-add rest segment
- Compute total duration

**Props:**
```typescript
interface EffortBlockProps {
  block: IntervalBlock;
  onChange: (block: IntervalBlock) => void;
  onDelete: () => void;
}
```

**Visual Structure:**
```
┌───────────────────────────────┐
│  Reps: [6]          [Delete]  │
├───────────────────────────────┤
│  WORK                         │
│  Duration: [2min]             │
│  Target: [pace] [Z4]          │
│  Cues: ["Hold steady"]        │
├───────────────────────────────┤
│  REST                         │
│  Duration: [1min]             │
│  Target: [pace] [Z3]          │
│  Cues: []                     │
└───────────────────────────────┘
```

---

### `WorkSegment.tsx` / `RestSegment.tsx`
**Purpose:** Render work or rest effort segment

**Responsibilities:**
- Render `DurationInput`
- Render `TargetEditor`
- Render cues input (multi-line or tag list)
- Emit segment changes to parent

**DOES NOT:**
- Validate duration format
- Suggest cues
- Compute pace from target

**Props:**
```typescript
interface EffortSegmentProps {
  segment: EffortSegment;
  label: "WORK" | "REST";
  onChange: (segment: EffortSegment) => void;
}
```

---

### `TargetEditor.tsx` (Target Selector)
**Purpose:** Edit target type and zone

**Responsibilities:**
- Render dropdown for `type` (pace | hr)
- Render dropdown for `zone` (Z1–Z10)
- Emit target changes to parent

**DOES NOT:**
- Validate zone exists
- Show pace/HR translations
- Suggest zones

**Props:**
```typescript
interface TargetEditorProps {
  target: Target;
  onChange: (target: Target) => void;
}
```

---

### `DurationInput.tsx` (Duration Field)
**Purpose:** Plain text input for duration

**Responsibilities:**
- Render text input
- Emit value changes to parent

**DOES NOT:**
- Validate format
- Convert units
- Suggest durations

**Props:**
```typescript
interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
}
```

---

### `ActionBar.tsx` (Save/Publish Actions)
**Purpose:** Workout-level action buttons

**Responsibilities:**
- Render "Save" button
- Render "Publish" button (if status === "draft")
- Render "Archive" button (if status === "published")
- Render unsaved changes indicator (if `isDirty === true`)
- Emit action events to parent

**DOES NOT:**
- Validate workout before save
- Auto-save on timer
- Prevent publishing incomplete workouts

**Props:**
```typescript
interface ActionBarProps {
  status: WorkoutStatus;
  isDirty: boolean;
  onSave: () => void;
  onPublish: () => void;
  onArchive: () => void;
}
```

---

## INVARIANTS (MUST NOT BREAK)

### 1. Workout ID Immutability
- Once a `workoutId` is created, it NEVER changes
- Versions increment, IDs do not

### 2. Tier Independence
- Each tier's structure is independent
- Changing MED does NOT affect LRG
- Deleting blocks in one tier does NOT propagate

### 3. No Implicit State Transitions
- `status` changes ONLY via explicit button clicks
- `draft` → `published` requires user action
- `published` → `archived` requires user action
- NO automatic status changes

### 4. No Data Normalization
- Duration stored as raw string: `"10min"`, `"2min"`, `"30sec"`
- NO conversion to seconds
- NO standardization of format

### 5. No Derived Fields in Canonical Data
- `workouts.master.json` contains ZERO calculated fields
- NO `totalDuration`, `totalReps`, `totalTSS`
- Viewer computes these on-the-fly

### 6. Explicit Null for Optional Fields
- `rest: null` means NO rest segment (explicit)
- `rest: { duration: "", target: { type: "", zone: "" }, cues: [] }` is INVALID
- Use `null`, not empty objects

### 7. Tier Existence is Explicit
- If `tiers.MED` is undefined → MED tier does NOT exist
- Empty structure arrays are valid: `{ MED: { name: "...", structure: [] } }`
- Never assume all 4 tiers exist

### 8. Timestamps are Read-Only
- `createdAt`, `updatedAt`, `publishedAt` are set by API, not UI
- UI displays these, but NEVER edits them

---

## ANTI-PATTERNS TO AVOID

### ❌ Auto-Save on Blur
```typescript
// WRONG: Auto-save when user leaves input
<input onBlur={() => saveWorkout()} />
```
**Why forbidden:** Violates "explicit saves only" principle.

---

### ❌ Smart Defaults
```typescript
// WRONG: Pre-fill new blocks with "sensible" values
const newBlock = {
  type: "interval",
  reps: 1,
  work: { duration: "5min", target: { type: "pace", zone: "Z2" }, cues: [] },
  rest: null
};
```
**Why forbidden:** Violates "no defaults" principle. User must fill everything.

**Correct:**
```typescript
const newBlock = {
  type: "interval",
  reps: 0,
  work: { duration: "", target: { type: "", zone: "" }, cues: [] },
  rest: null
};
```

---

### ❌ Validation on Save
```typescript
// WRONG: Prevent saving if workout is incomplete
if (!workout.name || workout.tiers.MED.structure.length === 0) {
  alert("Please complete all fields");
  return;
}
```
**Why forbidden:** Violates "no validation" principle. Garbage in, garbage saved.

---

### ❌ Copying Tiers Automatically
```typescript
// WRONG: Auto-copy MED → LRG when LRG is empty
if (!workout.tiers.LRG && workout.tiers.MED) {
  workout.tiers.LRG = { ...workout.tiers.MED };
}
```
**Why forbidden:** Violates "no smart behavior" principle.

---

### ❌ Calculating Total Duration
```typescript
// WRONG: Store total duration in canonical data
const totalDuration = workout.tiers.MED.structure.reduce((sum, block) => {
  return sum + parseDuration(block.work.duration) * block.reps;
}, 0);

workout.totalDuration = totalDuration;  // ❌ NEVER DO THIS
```
**Why forbidden:** Violates "no derived metrics stored" principle.

---

### ❌ Normalizing Duration Format
```typescript
// WRONG: Convert "2min" → 120 seconds
const durationSeconds = parseDuration(block.work.duration);
block.work.duration = durationSeconds.toString();  // ❌ NO
```
**Why forbidden:** Violates "no data normalization" principle. Store raw user input.

---

### ❌ Preventing Published Workout Edits
```typescript
// WRONG: Disable editing if status === "published"
if (workout.status === "published") {
  return <div>This workout is published and cannot be edited.</div>;
}
```
**Why forbidden:** Builder should allow editing. Publish logic creates a new version, doesn't lock editing.

**Correct approach:** Allow editing, but on save, increment version and reset to draft:
```typescript
if (originalStatus === "published") {
  workout.version += 1;
  workout.status = "draft";
  workout.publishedAt = null;
}
```

---

### ❌ Undo/Redo History
```typescript
// WRONG: Implement undo stack
const history = [];
history.push(cloneDeep(workout));
```
**Why forbidden:** Violates "explicit saves only" principle. No implicit history.

---

### ❌ Zone Validation
```typescript
// WRONG: Validate zone names against allowed list
if (!["Z1", "Z2", "Z3", "Z4", "Z5"].includes(target.zone)) {
  alert("Invalid zone!");
}
```
**Why forbidden:** Violates "no validation" principle. Let user enter any string.

---

### ❌ Smart Zone Suggestions
```typescript
// WRONG: Suggest zones based on workout focus
if (workout.focus.includes("recovery")) {
  suggestedZone = "Z1";
}
```
**Why forbidden:** Violates "no smart behavior" principle.

---

### ❌ Auto-Adding Rest Segments
```typescript
// WRONG: Auto-create rest segment when work is defined
if (block.work.duration && !block.rest) {
  block.rest = { duration: "", target: { type: "", zone: "" }, cues: [] };
}
```
**Why forbidden:** Violates "nothing fixes itself" principle. User must explicitly add rest.

---

## PHASE 1–3 SCOPE BOUNDARIES

### ✅ IN SCOPE (Phase 1–3)

**Layout:**
- Render 4-column tier grid
- Render tier columns (empty or with blocks)
- Render effort blocks (static, no drag-drop)

**Primitives:**
- Text inputs for duration
- Dropdowns for target type/zone
- Text inputs for cues
- Number input for reps

**State:**
- Load workout from API
- Edit workout fields in memory
- Track dirty state

**Actions:**
- "Add Block" button (appends to tier structure)
- "Delete Block" button (removes from tier structure)
- "Save" button (writes to API)

---

### ❌ OUT OF SCOPE (Future Phases)

**Drag-Drop:**
- Reordering blocks within a tier
- Moving blocks between tiers
- Dragging blocks from palette

**Persistence:**
- Auto-save
- Undo/redo
- Local draft storage

**Export:**
- Export to PDF
- Export to TrainingPeaks
- Export to JSON

**Calculations:**
- Total duration
- Total TSS
- Effort distribution charts

**Validation:**
- Required field checks
- Format validation
- Zone name validation

**UI Polish:**
- Animations
- Transitions
- Keyboard shortcuts
- Accessibility features

---

## API ENDPOINTS (For Reference)

### `GET /api/workouts`
Read `suc-shared-data/workouts/workouts.master.json`.

**Response:**
```json
{
  "version": 1,
  "workouts": [...]
}
```

---

### `GET /api/workouts/:workoutId`
Get a specific workout.

**Response:** Single `Workout` object.

---

### `POST /api/workouts/:workoutId`
Save a workout (create or update).

**Request Body:** Single `Workout` object.

**Server Behavior:**
- Update `updatedAt` timestamp
- If `status` changed to `"published"`, set `publishedAt`
- Write to `workouts.master.json`

**Response:**
```json
{
  "success": true,
  "workoutId": "workout-threshold-40"
}
```

---

## VISUAL LAYOUT (Phase 1–3)

```
┌────────────────────────────────────────────────────────────────┐
│  WORKOUT BUILDER                                               │
├────────────────────────────────────────────────────────────────┤
│  Name: [Threshold 40                                        ]  │
│  Description: [40 minutes at threshold with warm-up...      ]  │
│  Focus: [threshold] [tempo]                                    │
│  Coach Notes: [Focus on even pacing. Watch for drift...     ]  │
│  Status: DRAFT                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┬──────────┬──────────┬──────────┐               │
│  │   MED    │   LRG    │   XL     │   XXL    │               │
│  ├──────────┼──────────┼──────────┼──────────┤               │
│  │          │          │          │          │               │
│  │ [Block]  │ [Block]  │ [Block]  │          │               │
│  │ [Block]  │ [Block]  │          │          │               │
│  │          │          │          │          │               │
│  │ + Add    │ + Add    │ + Add    │ + Add    │               │
│  │          │          │          │          │               │
│  └──────────┴──────────┴──────────┴──────────┘               │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  [Save]  [Publish]                      Unsaved changes ●     │
└────────────────────────────────────────────────────────────────┘
```

---

## SUCCESS CRITERIA (Phase 1–3)

### ✅ Must Have:
1. Render 4-column tier grid
2. Render effort blocks with work/rest segments
3. Edit duration, target, cues, reps
4. Add/delete blocks
5. Save to `workouts.master.json`
6. Warn on navigate if unsaved changes

### ✅ Must NOT Have:
1. Auto-save
2. Validation
3. Defaults
4. Drag-drop
5. Calculations
6. Smart suggestions

### ✅ Invariants Verified:
1. Saved data exactly matches canonical schema
2. No derived fields in saved JSON
3. Tier independence maintained
4. Status transitions are explicit

---

## MENTAL MODEL REMINDERS

### Builder's Job:
- **Edit canonical data only**
- **No intelligence, no magic**
- **User has full control, full responsibility**

### Builder's Non-Job:
- **Not a calculator**
- **Not a validator**
- **Not a helper**
- **Not a compiler**

### Guiding Question:
**"If I delete this line of code, does the builder become smarter or dumber?"**

If the answer is "smarter" → that code violates the principles.

---

## IMPLEMENTATION CHECKLIST

Before writing ANY code, verify:

- [ ] Does this add "smart" behavior? → Reject
- [ ] Does this validate user input? → Reject
- [ ] Does this auto-fill fields? → Reject
- [ ] Does this compute derived metrics? → Reject
- [ ] Does this normalize user data? → Reject
- [ ] Does this auto-save? → Reject

If unsure, choose:
- **More explicit** over implicit
- **Dumber** over smarter
- **Manual** over automatic
- **Raw** over normalized

---

## FINAL REMINDER

**This is a DUMB EDITOR.**

It edits JSON. That's it.

All intelligence lives in the viewer/compiler.

The builder's job is to get out of the user's way.

---

**END OF SPECIFICATION**
