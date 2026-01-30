# Team SUC OS — Builder Roadmap
## Season Builder · Roster Builder · Challenge Builder

This document defines **what each builder is**, **what it owns**, **what it must not do**, and **how to implement it without scope creep**.

This is an execution document, not a vision doc.

---

## 1. SEASON BUILDER (CORE BACKBONE)

### Purpose
The Season Builder defines **time and intent**.
It is the spine of the entire system.

Everything else (workouts, events, challenges) attaches to it.

> If this builder is wrong, everything downstream feels confusing.

---

### Mental Model
Hierarchy (locked):

```
Season
 └─ Block
     └─ Week
```

- Seasons = narrative container
- Blocks = focused training arcs
- Weeks = atomic unit of coaching

Weeks always:
- start Monday
- end Sunday

---

### What the Season Builder Owns

#### Season
- name
- description / notes
- start week (YYYY-WW)
- end week (YYYY-WW)

#### Block
- name
- parent season
- start week
- length (number of weeks)
- intent (1–2 sentences)
- focus tags
- key races / milestones (flags only)

#### Week
- week index (relative to block)
- title (e.g. “Hill Power”)
- focus tags
- notes (optional)

---

### What the Season Builder Does NOT Own
- workouts
- athlete assignments
- metrics
- volume
- pacing
- scheduling logic

It defines **context**, not execution.

---

### Output Files
- seasons.json
- blocks.json
- weeks.json

Dates are **derived**, not authoritative.

---

### UI Requirements (V1)
- Calendar-style layout (week grid)
- Drag-to-adjust block length
- Inline week title editing
- Visual block boundaries
- Race markers (icons only)

No charts.
No analytics.
No athlete data.

---

### Done When
- You can look at the calendar and immediately understand the year
- Weeks feel intentional
- Blocks feel purposeful

---

## 2. ROSTER BUILDER (IDENTITY + CONSENT)

### Purpose
The Roster Builder answers one question:

> “Who exists here, and how are we allowed to reference them?”

Nothing more.

---

### Mental Model
Roster is **not**:
- CRM
- billing system
- training log
- attendance tracker

Roster is:
- identity
- status
- consent
- light context

---

### What the Roster Builder Owns

Each member has:
- id (stable slug)
- name
- email
- status (active | paused | alumni)
- tier (MED / LRG / XL)
- joined date

#### Context (lightweight)
- training goal
- weekly mileage range

#### Consent Flags (critical)
- public name
- public story
- public photos
- public metrics

---

### What the Roster Builder Does NOT Own
- payments
- Stripe
- attendance
- workouts
- metrics
- communication

---

### Output File
- roster.json

This file changes rarely and should feel boring.

---

### UI Requirements (V1)
- Directory list (alphabetical)
- Status toggle
- Consent toggle panel
- Minimal profile view
- Explicit Save button (no autosave magic)

---

### Done When
- You never hesitate before naming someone publicly
- Roster rarely changes
- It feels calm, not administrative

---

## 3. CHALLENGE BUILDER (ENGAGEMENT ENGINE)

### Purpose
Challenges create **momentum without toxicity**.

They are cultural, not competitive.

---

### Mental Model
A Challenge is:
- a time-bound mode
- tied to a block or week
- defined by rules and intent

Not a leaderboard.

---

### What the Challenge Builder Owns

Each challenge includes:
- id
- name
- description
- intent
- start (week or block reference)
- end (week or block reference)
- rules (plain language)
- optional linked workouts
- optional linked routes

---

### What the Challenge Builder Does NOT Own
- rankings
- scoring
- athlete metrics
- performance comparison

Participation is optional and mostly implicit.

---

### Output File
- challenges.json

---

### UI Requirements (V1)
- Simple create/edit form
- Block or week selector
- Rule editor (text-first)
- Active / archived toggle

No dashboards.
No charts.
No gamification UI.

---

### Example Challenges
- “No Skips Week”
- “Heat Acclimation Block”
- “Back-to-Back Builder”
- “Consistency Month”

---

### Done When
- Challenges feel cultural, not stressful
- Athletes opt in naturally
- You can reuse challenge templates

---

## FINAL RULES (DO NOT BREAK)

- Builders write truth
- Viewers never write
- Weeks are atomic
- Intent beats metrics
- Simplicity beats completeness

---

## EXECUTION ORDER (LOCKED)

1. Season Builder
2. Workout Builder (already scoped)
3. Event Builder
4. Roster Builder
5. Challenge Builder
6. Team SUC App (viewer)
7. Metrics (last)

---

If this document stays true, the system scales cleanly.
