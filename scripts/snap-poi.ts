type SnapResponse = {
  success?: boolean;
  error?: string;
  poi?: {
    id: string;
    title: string;
    type: string;
    variants?: Record<
      string,
      {
        lat: number;
        lon: number;
        distanceMi: number;
        distanceM: number;
        snapIndex: number;
      }
    >;
  };
};

function usage() {
  console.log(
    [
      "Usage:",
      "  tsx scripts/snap-poi.ts <routeGroupId> <lat> <lon> <variants> <type> <title>",
      "  tsx scripts/snap-poi.ts --list <routeGroupId>",
      "",
      "Example:",
      '  tsx scripts/snap-poi.ts SUC-034 37.8835 -121.935 "MED,LRG,XL" aid "Mitchell Canyon Aid"',
      '  tsx scripts/snap-poi.ts --list SUC-034',
      "",
      "Notes:",
      "  - variants: comma-separated labels (MED,LRG,XL,XXL)",
      "  - title can contain spaces (wrap in quotes)",
      "  - API base URL defaults to http://localhost:3000 (override with STUDIO_API)",
    ].join("\n")
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);
}

async function main() {
  const args = process.argv.slice(2);
  const isListMode = args.includes("--list");
  const filtered = args.filter((arg) => arg !== "--list");

  if (isListMode) {
    const [routeGroupId] = filtered;
    if (!routeGroupId) {
      usage();
      process.exit(1);
    }

    const apiBase = process.env.STUDIO_API || "http://localhost:3000";
    const url = `${apiBase}/api/routes/${routeGroupId}/pois`;

    try {
      const res = await fetch(url);
      const data = (await res.json()) as {
        routeGroupId?: string;
        pois?: Array<{
          id: string;
          type: string;
          title: string;
          variants?: Record<string, { distanceMi?: number }>;
        }>;
        error?: string;
      };

      if (!res.ok) {
        console.error(`[snap-poi] Error ${res.status}:`, data?.error || "unknown");
        process.exit(1);
      }

      const pois = Array.isArray(data.pois) ? data.pois : [];
      if (pois.length === 0) {
        console.log(`[snap-poi] No POIs found for ${routeGroupId}.`);
        return;
      }

      const rows = pois.map((poi) => {
        const variants = poi.variants ? Object.keys(poi.variants).sort() : [];
        const distances = variants
          .map((label) => {
            const d = poi.variants?.[label]?.distanceMi;
            const value = typeof d === "number" ? d.toFixed(2) : "n/a";
            return `${label}:${value}`;
          })
          .join(", ");
        return {
          id: poi.id ?? "",
          type: poi.type ?? "",
          title: poi.title ?? "",
          variants: variants.join(", "),
          distances,
        };
      });

      const headers = ["id", "type", "title", "variants", "distanceMi"];
      const widths = headers.map((h) => h.length);
      rows.forEach((row) => {
        widths[0] = Math.max(widths[0], row.id.length);
        widths[1] = Math.max(widths[1], row.type.length);
        widths[2] = Math.max(widths[2], row.title.length);
        widths[3] = Math.max(widths[3], row.variants.length);
        widths[4] = Math.max(widths[4], row.distances.length);
      });

      const pad = (value: string, width: number) => value.padEnd(width, " ");
      console.log(
        `${pad(headers[0], widths[0])}  ${pad(headers[1], widths[1])}  ${pad(
          headers[2],
          widths[2]
        )}  ${pad(headers[3], widths[3])}  ${pad(headers[4], widths[4])}`
      );
      console.log(
        `${"-".repeat(widths[0])}  ${"-".repeat(widths[1])}  ${"-".repeat(
          widths[2]
        )}  ${"-".repeat(widths[3])}  ${"-".repeat(widths[4])}`
      );
      rows.forEach((row) => {
        console.log(
          `${pad(row.id, widths[0])}  ${pad(row.type, widths[1])}  ${pad(
            row.title,
            widths[2]
          )}  ${pad(row.variants, widths[3])}  ${pad(row.distances, widths[4])}`
        );
      });
    } catch (error) {
      console.error("[snap-poi] Failed to call API:", error);
      process.exit(1);
    }

    return;
  }

  if (filtered.length < 6) {
    usage();
    process.exit(1);
  }

  const [routeGroupId, latRaw, lonRaw, variantsRaw, typeRaw, ...titleParts] =
    filtered;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error("lat/lon must be numbers");
    usage();
    process.exit(1);
  }

  const variants = variantsRaw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  if (!variants.length) {
    console.error("variants must be a comma-separated list");
    usage();
    process.exit(1);
  }

  const type = typeRaw.trim();
  const title = titleParts.join(" ").trim();
  if (!type || !title) {
    console.error("type and title are required");
    usage();
    process.exit(1);
  }

  const poiId = `${slugify(type)}-${slugify(title)}`.slice(0, 80);

  const apiBase = process.env.STUDIO_API || "http://localhost:3000";
  const url = `${apiBase}/api/routes/${routeGroupId}/pois/snap`;

  const payload = {
    poi: {
      id: poiId,
      title,
      type,
    },
    click: { lat, lon },
    variants,
  };

  let response: SnapResponse | null = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    response = (await res.json()) as SnapResponse;
    if (!res.ok) {
      console.error(`[snap-poi] Error ${res.status}:`, response?.error || "unknown");
      process.exit(1);
    }
  } catch (error) {
    console.error("[snap-poi] Failed to call API:", error);
    process.exit(1);
  }

  if (!response?.poi) {
    console.error("[snap-poi] No POI returned from API.");
    process.exit(1);
  }

  console.log(`[snap-poi] success: ${response.success === false ? "false" : "true"}`);
  console.log(`[snap-poi] poi.id: ${response.poi.id}`);
  console.log(`[snap-poi] title: ${response.poi.title}`);
  console.log(`[snap-poi] type: ${response.poi.type}`);

  const variantsOut = response.poi.variants || {};
  const ordered = Object.keys(variantsOut).sort();
  for (const label of ordered) {
    const placement = variantsOut[label];
    if (!placement) continue;
    console.log(
      `[snap-poi] ${label}: ${placement.distanceMi.toFixed(3)} mi / ${placement.distanceM.toFixed(
        1
      )} m (index ${placement.snapIndex})`
    );
  }
}

main();
