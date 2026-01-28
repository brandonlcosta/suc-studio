import * as electron from "electron";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import { promises as fsp } from "fs";

const { app, BrowserWindow, ipcMain, dialog } = electron;

type SelectionEntry = {
  eventId: string;
  enabled: boolean;
};

type EventEntry = {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  startLocationName: string;
  startLocationUrl: string;
  startLocationCoordinates: {
    lat: number;
    lng: number;
  };
  routes: Array<{
    label: string;
    statsUrl: string;
    geojsonUrl: string;
  }>;
};

interface ExportRoute {
  label: string;
  origin:
    | {
        kind: "source";
        sourcePath: string;
      }
    | {
        kind: "compiled";
        statsUrl: string;
        geojsonUrl: string;
      };
}

let mainWindow: electron.BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev mode: load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Prod mode: load from built files
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  console.log("Registering IPC handlers");

  const repoRoot = path.resolve(app.getAppPath(), "..");
  const publicDir = path.join(repoRoot, "public");
  const eventsPath = path.join(publicDir, "events.json");
  const eventsMasterPath = path.join(publicDir, "events.master.json");
  const eventsSelectionPath = path.join(publicDir, "events.selection.json");

  const readJson = async <T,>(filePath: string, fallback: T): Promise<T> => {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = await fs.promises.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  };

  const writeJsonAtomic = async (filePath: string, data: unknown) => {
    const tmpPath = `${filePath}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.promises.rename(tmpPath, filePath);
  };

  ipcMain.handle("get-next-event-id", async () => {
    const sourcePath = fs.existsSync(eventsMasterPath)
      ? eventsMasterPath
      : eventsPath;
    if (!fs.existsSync(sourcePath)) {
      return "SUC-001";
    }
    const raw = await fs.promises.readFile(sourcePath, "utf-8");
    const data = JSON.parse(raw);
    const events = Array.isArray(data) ? data : [];
    let maxNum = 0;
    for (const ev of events) {
      if (!ev || typeof ev.eventId !== "string") continue;
      const match = ev.eventId.match(/SUC-(\d+)/i);
      if (!match) continue;
      const num = Number(match[1]);
      if (!Number.isNaN(num)) {
        maxNum = Math.max(maxNum, num);
      }
    }
    const next = maxNum + 1;
    return `SUC-${String(next).padStart(3, "0")}`;
  });

  ipcMain.handle("events-load", async () => {
    const master = await readJson<EventEntry[]>(
      eventsMasterPath,
      await readJson<EventEntry[]>(eventsPath, [])
    );
    const selection = await readJson<SelectionEntry[]>(
      eventsSelectionPath,
      master.map((ev) => ({ eventId: ev.eventId, enabled: true }))
    );
    return { master, selection };
  });

  ipcMain.handle("events-save-master", async (_event, master: EventEntry[]) => {
    await writeJsonAtomic(eventsMasterPath, master);
    return { ok: true };
  });

  ipcMain.handle(
    "events-save-selection",
    async (_event, selection: SelectionEntry[]) => {
      await writeJsonAtomic(eventsSelectionPath, selection);
      return { ok: true };
    }
  );

  ipcMain.handle("events-compile", async () => {
    const master = await readJson<EventEntry[]>(
      eventsMasterPath,
      await readJson<EventEntry[]>(eventsPath, [])
    );
    const selection = await readJson<SelectionEntry[]>(
      eventsSelectionPath,
      master.map((ev) => ({ eventId: ev.eventId, enabled: true }))
    );
    const masterMap = new Map(master.map((ev) => [ev.eventId, ev]));
    const compiled: EventEntry[] = [];
    for (const entry of selection) {
      if (!entry.enabled) continue;
      const ev = masterMap.get(entry.eventId);
      if (ev) compiled.push(ev);
    }
    await writeJsonAtomic(eventsPath, compiled);
    return { ok: true, count: compiled.length };
  });

  ipcMain.handle("open-gpx-dialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "GPX", extensions: ["gpx"] }],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle("read-gpx-file", async (_event, filePath: string) => {
    if (!filePath) {
      throw new Error("read-gpx-file: missing path");
    }
    return await fsp.readFile(filePath, "utf-8");
  });

  ipcMain.handle("ingest-gpx", async (_event, payload) => {
    const tempPath = payload?.tempPath;
    const eventId = payload?.eventId;
    const label = payload?.label;
    if (!tempPath || !eventId || !label) {
      throw new Error("ingest-gpx: missing tempPath, eventId, or label");
    }
    if (!fs.existsSync(tempPath)) {
      throw new Error(`GPX ingestion failed: file not found (${tempPath})`);
    }

    const destDir = path.join(publicDir, "gpx", eventId);
    await fs.promises.mkdir(destDir, { recursive: true });
    const fileName = `${eventId}-${label}.gpx`;
    const destPath = path.join(destDir, fileName);
    await fs.promises.copyFile(tempPath, destPath);

    return { sourcePath: destPath };
  });

  ipcMain.handle("export-event", async (_event, payload) => {
    const gpxRoot = path.join(publicDir, "gpx");
    const routesOut = path.join(publicDir, "routes");

    const eventData = payload?.event;
    const payloadRoutes = payload?.routes;
    if (!Array.isArray(payloadRoutes)) {
      throw new Error("Routes payload is missing or invalid.");
    }
    const routes: ExportRoute[] = payloadRoutes;

    if (!eventData || typeof eventData.eventId !== "string") {
      throw new Error("Missing event metadata.");
    }

    const eventId = eventData.eventId.trim();
    if (!eventId) {
      throw new Error("Event ID is required.");
    }

    console.log("EXPORT ROUTES PAYLOAD", JSON.stringify(payload.routes, null, 2));

    const seenLabels = new Set<string>();
    routes.forEach((route: ExportRoute) => {
      if (!route?.label) {
        throw new Error("Each route must include a label");
      }
      const isSourceBacked =
        route.origin?.kind === "source" && !!route.origin.sourcePath;
      const isReferenceBacked =
        route.origin?.kind === "compiled" &&
        !!route.origin.statsUrl &&
        !!route.origin.geojsonUrl;
      if (!isSourceBacked && !isReferenceBacked) {
        throw new Error(
          "Each route must include either sourcePath (new GPX) or statsUrl + geojsonUrl (existing route)"
        );
      }
      if (seenLabels.has(route.label)) {
        throw new Error(`Duplicate label detected: ${route.label}`);
      }
      seenLabels.add(route.label);
    });

    const lat = Number(eventData.startLocationCoordinates?.lat);
    const lng = Number(eventData.startLocationCoordinates?.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new Error("Start location coordinates must be valid numbers.");
    }

    const tmpDirName = `.tmp-${eventId}-${Date.now()}`;
    const tmpDir = path.join(gpxRoot, tmpDirName);
    const finalDir = path.join(gpxRoot, eventId);
    let backupDir: string | null = null;

    const cleanupRoutes = async () => {
      for (const route of routes) {
        const base = `${eventId}-${route.label}`;
        const jsonPath = path.join(routesOut, `${base}.json`);
        const geoPath = path.join(routesOut, `${base}.geojson`);
        try {
          if (fs.existsSync(jsonPath)) await fs.promises.unlink(jsonPath);
        } catch {}
        try {
          if (fs.existsSync(geoPath)) await fs.promises.unlink(geoPath);
        } catch {}
      }
    };

    const cleanupGpx = async () => {
      try {
        if (fs.existsSync(finalDir)) {
          await fs.promises.rm(finalDir, { recursive: true, force: true });
        }
      } catch {}
      if (backupDir && fs.existsSync(backupDir)) {
        await fs.promises.rename(backupDir, finalDir).catch(() => {});
      }
    };

    try {
      const sourceRoutes = routes.filter(
        (route) => route.origin.kind === "source"
      );

      if (sourceRoutes.length > 0) {
        await fs.promises.mkdir(tmpDir, { recursive: true });
        await fs.promises.mkdir(gpxRoot, { recursive: true });

        for (const route of routes) {
          if (route.origin.kind === "compiled") {
            // Reuse existing artifacts — no GPX copy, no compiler run
            continue;
          }
          const dest = path.join(tmpDir, `${eventId}-${route.label}.gpx`);
          const sourcePath = route.origin.sourcePath;
          console.log(`Copy GPX: ${sourcePath} -> ${dest}`);
          await fs.promises.copyFile(sourcePath, dest);
        }

        if (fs.existsSync(finalDir)) {
          backupDir = `${finalDir}.bak-${Date.now()}`;
          await fs.promises.rename(finalDir, backupDir);
        }

        await fs.promises.rename(tmpDir, finalDir);

        await fs.promises.mkdir(routesOut, { recursive: true });

        const scriptPath = path.join(
          repoRoot,
          "scripts",
          "convert-gpx-to-geojson.mjs"
        );
        await new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [scriptPath], {
            cwd: repoRoot,
            env: {
              ...process.env,
              ELECTRON_RUN_AS_NODE: "1",
            },
            stdio: "inherit",
          });
          child.on("error", reject);
          child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Compiler exited with code ${code}`));
          });
        });
      }

      const existingMaster = await readJson<EventEntry[]>(
        eventsMasterPath,
        await readJson<EventEntry[]>(eventsPath, [])
      );
      const filteredMaster = existingMaster.filter(
        (ev) => ev && ev.eventId !== eventId
      );
      const routesEntries = routes.map((route: ExportRoute) => {
        if (route.origin.kind === "compiled") {
          return {
            label: route.label,
            statsUrl: route.origin.statsUrl,
            geojsonUrl: route.origin.geojsonUrl,
          };
        }
        return {
          label: route.label,
          statsUrl: `/routes/${eventId}-${route.label}.json`,
          geojsonUrl: `/routes/${eventId}-${route.label}.geojson`,
        };
      });
      const newEvent: EventEntry = {
        eventId,
        eventName: eventData.eventName ?? "",
        eventDescription: eventData.eventDescription ?? "",
        eventDate: eventData.eventDate ?? "",
        eventTime: eventData.eventTime ?? "",
        startLocationName: eventData.startLocationName ?? "",
        startLocationUrl: eventData.startLocationUrl ?? "",
        startLocationCoordinates: {
          lat,
          lng,
        },
        routes: routesEntries,
      };

      const nextMaster = [newEvent, ...filteredMaster];
      await writeJsonAtomic(eventsMasterPath, nextMaster);

      const existingSelection = await readJson<SelectionEntry[]>(
        eventsSelectionPath,
        []
      );
      const filteredSelection = existingSelection.filter(
        (entry) => entry.eventId !== eventId
      );
      const nextSelection = [
        { eventId, enabled: false },
        ...filteredSelection,
      ];
      await writeJsonAtomic(eventsSelectionPath, nextSelection);

      if (backupDir && fs.existsSync(backupDir)) {
        await fs.promises.rm(backupDir, { recursive: true, force: true });
      }

      return { ok: true };
    } catch (err) {
      console.error("Export failed:", err);
      if (fs.existsSync(tmpDir)) {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
      await cleanupRoutes();
      await cleanupGpx();
      throw err;
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
