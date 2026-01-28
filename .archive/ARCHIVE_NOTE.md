# Archived Route Builder (Electron App)

**Date:** 2026-01-27

## What Was Archived

The legacy `route-builder/` Electron application has been archived after successful feature extraction into the new web-based SUC Studio.

## Why It Was Archived

The legacy route-builder violated architectural boundaries by:
- Mixing UI, canonical data, compilation, and viewer logic
- Running Electron (unnecessary complexity)
- Compiling GPX → GeoJSON (should be handled by suc-broadcast)
- Writing viewer artifacts directly (should be handled by suc-broadcast)

## What Was Extracted

The following functionality was successfully harvested into the new Studio:

### UI Flows
- ✅ GPX drag-and-drop import
- ✅ Route grouping and labeling (MED/LRG/XL/XXL)
- ✅ Route metadata editing
- ✅ Event creation and metadata editing
- ✅ Event selection management

### UX Patterns
- ✅ Color palette (neon green/blue/pink/purple)
- ✅ Label auto-assignment based on distance ranking
- ✅ Two-column layout (sidebar + content area)
- ✅ Route cards with stats display
- ✅ File upload with drag-drop

### Data Models
- ✅ Route group structure
- ✅ Event metadata structure
- ✅ Route label system (MED/LRG/XL/XXL)

## New Architecture

The new SUC Studio is a clean separation of concerns:

```
suc-studio (UI editor only)
     ↓ writes canonical data
suc-shared-data (canonical truth)
     ↓ reads for compilation
suc-broadcast (compiler)
     ↓ writes compiled artifacts
suc-route-viewer (renderer)
```

**Studio is strictly an editor**—it does NOT:
- ❌ Compile GPX → GeoJSON
- ❌ Generate route stats files
- ❌ Write to viewer directories
- ❌ Render public maps

## Technology Shift

**Legacy:**
- Electron + React
- IPC communication
- Mixed responsibilities

**New:**
- Web-based (React + Express)
- HTTP/REST API
- Single responsibility (editing canonical data)

## How to Access Legacy Code

If you need to reference the legacy code for any reason, it's preserved in:
`.archive/route-builder-legacy-YYYYMMDD/`

## Verification

Safety checks confirmed the new Studio respects architectural boundaries:

```bash
# All checks passed:
✓ No geojson file writes
✓ No public/routes references
✓ No compiled artifact writes
✓ Only writes to suc-shared-data paths
```

## Next Steps

1. Test the new Studio end-to-end
2. Verify suc-broadcast still works independently
3. Verify suc-route-viewer still loads compiled artifacts
4. Delete this archive directory if new Studio is stable (after 30 days)

---

**Refactored by:** Claude (AI Assistant)
**Date:** 2026-01-27
**Commit message:** `refactor: harvest legacy route-builder into suc-studio`
