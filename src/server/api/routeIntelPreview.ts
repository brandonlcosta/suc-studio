import fs from "fs";
import path from "path";
import express from "express";
import { getRouteGroup, loadRoutePois } from "../utils/sharedData.js";
import { ROUTES_ROOT } from "../utils/paths.js";
import { deriveRouteSections } from "../../../../suc-broadcast/src/compile/deriveRouteSections.js";

const METERS_PER_MILE = 1609.344;

type TrackPoint = { lat: number; lon: number; ele: number | null };

type PreviewSection = {
  fromPoiId: string | null;
  toPoiId: string | null;
  fromLabel: string;
  toLabel: string;
  startDistanceMi: number;
  endDistanceMi: number;
  distanceMi: number;
  elevationGainFt: number;
};

type RouteStats = {
  distanceMi: number;
  distanceSeries: number[];
  elevationSeries: number[];
};

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineMeters(a: TrackPoint, b: TrackPoint) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function parseGpxPoints(raw: string): TrackPoint[] {
  if (!raw) return [];
  const points: TrackPoint[] = [];

  const fullTag = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match = fullTag.exec(raw);
  while (match) {
    const lat = toNumber(match[1]);
    const lon = toNumber(match[2]);
    const eleMatch = match[3].match(/<ele>([^<]+)<\/ele>/i);
    const ele = eleMatch ? toNumber(eleMatch[1]) : null;
    if (lat != null && lon != null) {
      points.push({ lat, lon, ele: ele ?? null });
    }
    match = fullTag.exec(raw);
  }

  if (points.length > 0) return points;

  const selfClosing = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*\/>/gi;
  let matchSelf = selfClosing.exec(raw);
  while (matchSelf) {
    const lat = toNumber(matchSelf[1]);
    const lon = toNumber(matchSelf[2]);
    if (lat != null && lon != null) {
      points.push({ lat, lon, ele: null });
    }
    matchSelf = selfClosing.exec(raw);
  }

  return points;
}

function computeStats(points: TrackPoint[]): RouteStats {
  if (points.length === 0) {
    return { distanceMi: 0, distanceSeries: [], elevationSeries: [] };
  }

  const distanceSeries = [0];
  const elevationSeries: number[] = [];
  let distanceMeters = 0;

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    elevationSeries.push(Number(point.ele ?? 0));
    if (i === 0) continue;
    const prev = points[i - 1];
    distanceMeters += haversineMeters(prev, point);
    distanceSeries.push(distanceMeters);
  }

  return {
    distanceMi: distanceMeters / METERS_PER_MILE,
    distanceSeries,
    elevationSeries,
  };
}

function readGpxCandidates(routeId: string, variants: string[]) {
  const routeDir = path.join(ROUTES_ROOT, routeId);
  const normalizedVariants = variants.map((variant) => String(variant).toUpperCase());
  const candidates = [
    { name: "route.gpx", variant: null as string | null },
    { name: `${routeId}.gpx`, variant: null as string | null },
    ...normalizedVariants.map((variant) => ({ name: `${variant}.gpx`, variant })),
    ...normalizedVariants.map((variant) => ({ name: `${routeId}-${variant}.gpx`, variant })),
  ];

  const results: Array<{ name: string; raw: string; variant: string | null }> = [];
  for (const candidate of candidates) {
    const filePath = path.join(routeDir, candidate.name);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf8");
    results.push({ name: candidate.name, raw, variant: candidate.variant });
  }

  return results;
}

function resolveBestTrack(routeId: string, variants: string[]) {
  const candidates = readGpxCandidates(routeId, variants);
  if (candidates.length === 0) {
    throw new Error(`No GPX found for ${routeId}`);
  }

  let best: { track: TrackPoint[]; variant: string | null } | null = null;
  for (const candidate of candidates) {
    const track = parseGpxPoints(candidate.raw);
    if (!best || track.length > best.track.length) {
      best = { track, variant: candidate.variant };
    }
  }

  if (!best || best.track.length === 0) {
    throw new Error(`GPX track is empty for ${routeId}`);
  }

  return best;
}

function resolveDistanceFromSeries(distanceSeries: number[], index: number): number | null {
  if (!Array.isArray(distanceSeries) || distanceSeries.length === 0) return null;
  if (!Number.isFinite(index)) return null;
  const clamped = Math.max(0, Math.min(distanceSeries.length - 1, Math.floor(index)));
  const meters = distanceSeries[clamped];
  return Number.isFinite(meters) ? meters / METERS_PER_MILE : null;
}

function resolvePoiDistanceMi(poi: any, variantLabel: string | null, distanceSeries: number[]) {
  if (variantLabel && poi?.variants) {
    const rawVariant =
      poi.variants[variantLabel] ?? poi.variants[String(variantLabel).toLowerCase()];
    if (rawVariant === false || rawVariant?.enabled === false) {
      return null;
    }
    const candidates = Array.isArray(rawVariant) ? rawVariant : rawVariant ? [rawVariant] : [];
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") continue;
      if (Number.isFinite(candidate.distanceMi)) return Number(candidate.distanceMi);
      if (Number.isFinite(candidate.distanceM)) return Number(candidate.distanceM) / METERS_PER_MILE;
      if (Number.isFinite(candidate.snapIndex)) {
        const fromSeries = resolveDistanceFromSeries(distanceSeries, candidate.snapIndex);
        if (fromSeries != null) return fromSeries;
      }
    }
  }

  if (Number.isFinite(poi?.routePointIndex)) {
    return resolveDistanceFromSeries(distanceSeries, Number(poi.routePointIndex));
  }

  return null;
}

function buildPoisForVariant(rawPois: any[], variantLabel: string | null, distanceSeries: number[]) {
  if (!Array.isArray(rawPois)) return [];
  const compiled: Array<{ id: string; title: string; type: string; distanceMi: number }> = [];

  for (const poi of rawPois) {
    if (!poi || typeof poi !== "object") continue;
    const id = String(poi.id ?? "").trim();
    if (!id) continue;
    const distanceMi = resolvePoiDistanceMi(poi, variantLabel, distanceSeries);
    if (!Number.isFinite(distanceMi)) continue;
    const title = typeof poi.title === "string" ? poi.title : "";
    const type = typeof poi.type === "string" ? poi.type : "";
    compiled.push({ id, title, type, distanceMi: Number(distanceMi) });
  }

  return compiled;
}

function buildPoiLabelMap(pois: Array<{ id: string; title?: string }>) {
  const map = new Map<string, string>();
  for (const poi of pois) {
    const id = String(poi.id ?? "").trim();
    if (!id) continue;
    const title = typeof poi.title === "string" ? poi.title.trim() : "";
    map.set(id, title || id);
  }
  return map;
}

function decorateSections(
  sections: Array<{
    fromPoiId: string | null;
    toPoiId: string | null;
    startDistanceMi: number;
    endDistanceMi: number;
    distanceMi: number;
    elevationGainFt: number;
  }>,
  labelMap: Map<string, string>
): PreviewSection[] {
  return sections.map((section) => ({
    ...section,
    fromLabel: section.fromPoiId ? labelMap.get(section.fromPoiId) ?? section.fromPoiId : "Start",
    toLabel: section.toPoiId ? labelMap.get(section.toPoiId) ?? section.toPoiId : "Finish",
  }));
}

const router = express.Router();

router.get("/preview/:routeId", (req, res) => {
  const { routeId } = req.params;
  if (!routeId?.trim()) {
    return res.status(400).json({ error: "routeId is required." });
  }

  const routeGroup = getRouteGroup(routeId);
  if (!routeGroup) {
    return res.status(404).json({ error: `Route group not found: ${routeId}` });
  }

  const sectionMode = req.query.sectionMode === "race" ? "race" : "all-poi";
  const enabledParam = req.query.enabledPoiIds;
  const enabledPoiIds = Array.isArray(enabledParam)
    ? enabledParam.flatMap((value) => String(value).split(","))
    : typeof enabledParam === "string"
      ? enabledParam.split(",")
      : undefined;

  try {
    const variants = Array.isArray(routeGroup?.variants) ? routeGroup.variants : [];
    const best = resolveBestTrack(routeId, variants);
    const stats = computeStats(best.track);
    const poisDoc = loadRoutePois(routeId);
    const compiledPois = buildPoisForVariant(
      Array.isArray(poisDoc.pois) ? poisDoc.pois : [],
      best.variant,
      stats.distanceSeries
    );
    const labelMap = buildPoiLabelMap(compiledPois);
    const sections = decorateSections(
      deriveRouteSections({
        routeStats: stats,
        pois: compiledPois,
        sectionMode,
        enabledPoiIds: enabledPoiIds?.filter(Boolean),
      }),
      labelMap
    );

    return res.json({ sections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview unavailable";
    return res.status(500).json({ error: message });
  }
});

export default router;
