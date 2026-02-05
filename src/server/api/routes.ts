import express from "express";
import multer from "multer";
import { parseGPXText } from "../utils/gpxParser.js";
import {
  listRouteGroups,
  getRouteGroup,
  saveRouteGroup,
  loadRoutePois,
  saveRoutePois,
  saveRouteVariant,
  deleteRouteGroup,
  deleteRouteVariant,
  loadRouteVariantGpx,
} from "../utils/sharedData.js";
import { snapPointToVariants } from "../utils/routeSnapping.js";
import type {
  RouteLabel,
  RoutePoi,
  RoutePoiSnapRequest,
  SaveRouteGroupRequest,
  RouteMeta,
} from "../types.js";

const router = express.Router();

type LatLon = { lat: number; lon: number };

function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function cumulativeDistancesMeters(points: LatLon[]): number[] {
  if (!points.length) return [];
  const distances: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
    distances.push(total);
  }
  return distances;
}

// Configure multer for GPX file uploads (memory storage for parsing)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/routes/import
 * Parse GPX file and return route data for preview (does NOT save to disk).
 */
router.post("/import", upload.single("gpx"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No GPX file uploaded" });
    }

    const xmlStr = req.file.buffer.toString("utf8");
    const fileName = req.file.originalname;

    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const match = baseName.match(/^(.*?)-(MED|LRG|XL|XXL)$/i);
    if (match && match[1]) {
      const groupId = match[1];
      const label = match[2].toUpperCase();
      try {
        saveRouteVariant(groupId, label, xmlStr);
      } catch (error) {
        console.warn("Failed to persist route variant:", error);
      }
    }

    const parsed = parseGPXText(xmlStr, fileName);

    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GPX import error:", error);
    return res.status(400).json({ error: message });
  }
});

/**
 * GET /api/routes
 * List all route groups.
 */
router.get("/", (_req, res) => {
  try {
    const routeGroups = listRouteGroups();
    return res.json({ routeGroups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("List route groups error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/routes/:groupId
 * Get a specific route group.
 */
router.get("/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    const routeGroup = getRouteGroup(groupId);

    if (!routeGroup) {
      return res.status(404).json({ error: "Route group not found" });
    }

    return res.json(routeGroup);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get route group error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/routes/:groupId
 * Delete an entire route group.
 */
router.delete("/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    deleteRouteGroup(groupId);
    return res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete route group error:", error);
    return res.status(404).json({ error: message });
  }
});

/**
 * DELETE /api/routes/:groupId/variants/:label
 * Delete a single GPX variant and update metadata.
 */
router.delete("/:groupId/variants/:label", (req, res) => {
  try {
    const { groupId, label } = req.params;
    const meta = deleteRouteVariant(groupId, label);
    return res.json({ success: true, routeGroup: meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete route variant error:", error);
    return res.status(404).json({ error: message });
  }
});

/**
 * GET /api/routes/:groupId/gpx/:label
 * Load a route variant GPX and return parsed geometry for preview.
 */
router.get("/:groupId/gpx/:label", (req, res) => {
  try {
    const { groupId, label } = req.params;
    const gpxRaw = loadRouteVariantGpx(groupId, label);
    const parsed = parseGPXText(gpxRaw, `${groupId}-${label}.gpx`);
    return res.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get route variant GPX error:", error);
    return res.status(404).json({ error: message });
  }
});

/**
 * DELETE /api/routes/:groupId/gpx/:label
 * Delete a single GPX variant and update metadata.
 */
router.delete("/:groupId/gpx/:label", (req, res) => {
  try {
    const { groupId, label } = req.params;
    const meta = deleteRouteVariant(groupId, label);
    return res.json({ success: true, routeGroup: meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete route variant error:", error);
    return res.status(404).json({ error: message });
  }
});

/**
 * GET /api/routes/:groupId/pois
 * Load POIs for a route group.
 */
router.get("/:groupId/pois", (req, res) => {
  try {
    const { groupId } = req.params;
    const pois = loadRoutePois(groupId);
    return res.json(pois);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get route POIs error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/routes/:groupId/pois/snap
 * Snap a POI click to one or more route variants and persist.
 */
router.post("/:groupId/pois/snap", (req, res) => {
  try {
    const { groupId } = req.params;
    const body = req.body as RoutePoiSnapRequest;

    if (!body?.poi || !body?.click || !Array.isArray(body.variants)) {
      return res.status(400).json({ error: "Invalid POI snap payload." });
    }

    const { poi, click, variants } = body;
    if (!poi.id || !poi.title || !poi.type) {
      return res.status(400).json({ error: "poi.id, poi.title, and poi.type are required." });
    }
    if (
      typeof click.lat !== "number" ||
      typeof click.lon !== "number" ||
      Number.isNaN(click.lat) ||
      Number.isNaN(click.lon)
    ) {
      return res.status(400).json({ error: "click.lat and click.lon must be numbers." });
    }
    if (variants.length === 0) {
      return res.status(400).json({ error: "At least one variant is required." });
    }

    const normalizedVariants = variants.map((label) =>
      String(label).toUpperCase()
    ) as RouteLabel[];
    const allowed = new Set<RouteLabel>(["MED", "LRG", "XL", "XXL"]);
    const invalid = normalizedVariants.filter((label) => !allowed.has(label));
    if (invalid.length > 0) {
      return res.status(400).json({
        error: `Invalid variants: ${invalid.join(", ")}`,
      });
    }

    const snappedByVariant = snapPointToVariants(groupId, normalizedVariants, click);
    const doc = loadRoutePois(groupId);
    const existingIndex = doc.pois.findIndex((item) => item.id === poi.id);

    const base: RoutePoi =
      existingIndex >= 0
        ? doc.pois[existingIndex]
        : {
            id: poi.id,
            title: poi.title,
            type: poi.type,
            variants: {},
          };

    base.title = poi.title;
    base.type = poi.type;
    if (poi.notes) base.notes = poi.notes;
    base.drop = { lat: click.lat, lon: click.lon };
    base.variants = base.variants ?? {};

    for (const [label, placement] of Object.entries(snappedByVariant)) {
      base.variants[label as RouteLabel] = placement;
    }

    if (existingIndex >= 0) {
      doc.pois[existingIndex] = base;
    } else {
      doc.pois.push(base);
    }

    console.log("[SAVE_ROUTE_POIS] POI count:", doc.pois.length);
    saveRoutePois(groupId, doc);

    return res.json({
      success: true,
      poi: base,
      pois: doc.pois,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Snap POI error:", error);
    return res.status(400).json({ error: message });
  }
});

/**
 * POST /api/routes/:groupId/pois/start-finish
 * Ensure a system Start/Finish POI exists for this route group.
 */
router.post("/:groupId/pois/start-finish", (req, res) => {
  try {
    const { groupId } = req.params;
    const meta = getRouteGroup(groupId);
    const variants = meta?.variants ?? [];
    if (!variants.length) {
      return res.status(400).json({ error: "Route group has no variants." });
    }

    const doc = loadRoutePois(groupId);
    const nextVariants: Record<string, any> = {};
    let drop: { lat: number; lon: number } | null = null;

    variants.forEach((rawLabel) => {
      const label = String(rawLabel).toUpperCase() as RouteLabel;
      const gpxRaw = loadRouteVariantGpx(groupId, label);
      const parsed = parseGPXText(gpxRaw, `${groupId}-${label}.gpx`);
      if (!parsed?.coords?.length) return;
      const points = parsed.coords.map((coord) => ({
        lon: coord[0],
        lat: coord[1],
      }));
      if (!points.length) return;
      const distances = cumulativeDistancesMeters(points);
      const totalM = distances[distances.length - 1] ?? 0;
      if (!drop) drop = { lat: points[0].lat, lon: points[0].lon };

      const placements: any[] = [
        {
          lat: points[0].lat,
          lon: points[0].lon,
          snapIndex: 0,
          distanceM: 0,
          distanceMi: 0,
          passIndex: 0,
        },
      ];

      if (totalM > 1 && points.length > 1) {
        placements.push({
          lat: points[points.length - 1].lat,
          lon: points[points.length - 1].lon,
          snapIndex: points.length - 1,
          distanceM: totalM,
          distanceMi: totalM / 1609.344,
          passIndex: 1,
        });
      }

      nextVariants[label] = placements.length === 1 ? placements[0] : placements;
    });

    if (!Object.keys(nextVariants).length || !drop) {
      return res.status(400).json({ error: "Unable to derive start/finish POI." });
    }

    const poiId = "start-finish";
    const existingIndex = doc.pois.findIndex((poi) => poi.id === poiId);
    const existing = existingIndex >= 0 ? doc.pois[existingIndex] : null;

    const poi: RoutePoi = {
      id: poiId,
      title: "Start / Finish",
      type: "start-finish",
      system: true,
      locked: true,
      drop,
      variants: nextVariants,
    };

    if (existing && typeof existing === "object") {
      if (existing.notes) poi.notes = existing.notes;
    }

    if (existingIndex >= 0) {
      doc.pois[existingIndex] = poi;
    } else {
      doc.pois.push(poi);
    }

    console.log("[SAVE_ROUTE_POIS] POI count:", doc.pois.length);
    saveRoutePois(groupId, doc);

    return res.json({
      success: true,
      poi,
      pois: doc.pois,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Start/Finish POI error:", error);
    return res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/routes/:groupId/pois/:poiId
 * Delete a POI and persist to route.pois.json.
 */
router.delete("/:groupId/pois/:poiId", (req, res) => {
  try {
    const { groupId, poiId } = req.params;
    if (!poiId?.trim()) {
      return res.status(400).json({ error: "poiId is required." });
    }

    const doc = loadRoutePois(groupId);
    const beforeCount = doc.pois.length;
    const nextPois = doc.pois.filter((poi) => poi.id !== poiId);
    const deleted = nextPois.length !== beforeCount;

    const nextDoc = { ...doc, pois: nextPois };
    console.log("[SAVE_ROUTE_POIS] POI count:", nextDoc.pois.length);
    saveRoutePois(groupId, nextDoc);

    return res.json({
      success: true,
      poiId,
      deleted,
      pois: nextDoc.pois,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete POI error:", error);
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/routes/:groupId
 * Save a route group to suc-shared-data/routes/:groupId/
 */
router.post("/:groupId", (req, res) => {
  try {
    const { groupId } = req.params;
    const body = req.body as SaveRouteGroupRequest;

    // Validate request
    if (!body.name || !body.location) {
      return res.status(400).json({ error: "Invalid route group data" });
    }

    const existing = getRouteGroup(groupId);
    const variants = existing?.variants ?? [];

    // Build metadata (no GPX writes)
    const meta: RouteMeta = {
      routeGroupId: groupId,
      name: body.name,
      location: body.location,
      source: existing?.source ?? body.source ?? "SUC",
      notes: body.notes ?? existing?.notes ?? "",
      variants,
    };

    // Save to suc-shared-data (metadata only)
    saveRouteGroup(groupId, meta, []);

    return res.json({
      success: true,
      routeGroupId: groupId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Save route group error:", error);
    return res.status(500).json({ error: message });
  }
});

export default router;
