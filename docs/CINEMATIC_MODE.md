# Cinematic Mode Alignment (Studio)

Canonical spec lives in `suc-shared-data/docs/CINEMATIC_MODE_SPEC.md`.

Canonical schema for Studio validation:

- `suc-shared-data/schemas/route-media.schema.json`

Canonical example payload:

- `suc-shared-data/route-media/SUC-036-MEDIA.json`

## Studio Responsibilities

- Provide authoring UI for cinematic `route-media` plans.
- Validate authored payloads against the canonical schema.
- Publish canonical `route-media` JSON to `suc-shared-data/route-media`.

## Studio Constraints

- Studio may not render final video artifacts.
- Studio may not compile viewer outputs.
- Studio may not define local schema forks for `route-media`.
- Studio writes canonical JSON only; downstream compilation is broadcast-owned.
- Canonical entities are append-only; Studio archives/deprecates plans instead of deleting them.

## Accessing The Media Builder

1. Start Studio: `npm run dev`
2. Open `http://localhost:5173/route-media`
3. Or use top nav `Cinematic` (also available at `http://localhost:5173/studio/route-media`)

## Map-First Authoring Flow

The Cinematic Media Builder now uses a Route Builder-style layout:

- Left panel: plan metadata and selected entry inspector.
- Main panel: route map with draggable cinematic markers.
- Bottom panel: horizontal timeline with draggable entry blocks.

Authoring steps:

1. Create or open a route-media plan.
2. Set route + variant in the left panel.
3. Click on the map route to create timeline entries at snapped mile positions.
4. Select entries from map markers or timeline blocks.
5. Edit entry title, subtitle text, camera preset, speed override, and hold duration in the inspector.
6. Drag map markers or timeline blocks to reposition entries along the route.
7. Save via `Save Plan` (AJV schema validation is enforced before publish).
