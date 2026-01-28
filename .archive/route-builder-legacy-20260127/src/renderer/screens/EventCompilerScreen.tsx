import { useEffect, useMemo, useState } from "react";

type EventRoute = {
  label: string;
  statsUrl: string;
  geojsonUrl: string;
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
  routes: EventRoute[];
};

type SelectionEntry = {
  eventId: string;
  enabled: boolean;
};

interface EventCompilerScreenProps {
  onBack: () => void;
}

function normalizeSelection(
  master: EventEntry[],
  selection: SelectionEntry[]
): SelectionEntry[] {
  const masterIds = new Set(master.map((ev) => ev.eventId));
  const ordered = selection.filter((entry) => masterIds.has(entry.eventId));
  const existing = new Set(ordered.map((entry) => entry.eventId));
  const missing = master
    .filter((ev) => !existing.has(ev.eventId))
    .map((ev) => ({ eventId: ev.eventId, enabled: false }));
  return [...ordered, ...missing];
}

export default function EventCompilerScreen({ onBack }: EventCompilerScreenProps) {
  const [masterEvents, setMasterEvents] = useState<EventEntry[]>([]);
  const [selection, setSelection] = useState<SelectionEntry[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>("");
  const [isSavingMaster, setIsSavingMaster] = useState(false);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.electron
      .invoke("events-load")
      .then((data: { master: EventEntry[]; selection: SelectionEntry[] }) => {
        if (cancelled) return;
        const normalized = normalizeSelection(data.master, data.selection);
        setMasterEvents(data.master);
        setSelection(normalized);
        if (data.master.length > 0) {
          setActiveEventId(data.master[0].eventId);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus(err instanceof Error ? err.message : "Failed to load events");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectionOrdered = useMemo(() => {
    return selection;
  }, [selection]);

  const masterMap = useMemo(() => {
    return new Map(masterEvents.map((ev) => [ev.eventId, ev]));
  }, [masterEvents]);

  const activeEvent = masterMap.get(activeEventId) ?? null;

  const updateEvent = (eventId: string, patch: Partial<EventEntry>) => {
    const nextId = patch.eventId ?? eventId;
    setMasterEvents((prev) =>
      prev.map((ev) =>
        ev.eventId === eventId ? { ...ev, ...patch, eventId: nextId } : ev
      )
    );
    if (nextId !== eventId) {
      setSelection((prev) =>
        prev.map((entry) =>
          entry.eventId === eventId ? { ...entry, eventId: nextId } : entry
        )
      );
      setActiveEventId(nextId);
    }
  };

  const updateCoordinates = (field: "lat" | "lng", value: string) => {
    if (!activeEvent) return;
    const num = Number(value);
    updateEvent(activeEvent.eventId, {
      startLocationCoordinates: {
        ...activeEvent.startLocationCoordinates,
        [field]: Number.isNaN(num) ? activeEvent.startLocationCoordinates[field] : num,
      },
    });
  };

  const toggleEnabled = (eventId: string) => {
    setSelection((prev) =>
      prev.map((entry) =>
        entry.eventId === eventId
          ? { ...entry, enabled: !entry.enabled }
          : entry
      )
    );
  };

  const handleDrag = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setSelection((prev) => {
      const fromIndex = prev.findIndex((entry) => entry.eventId === fromId);
      const toIndex = prev.findIndex((entry) => entry.eventId === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleDuplicate = () => {
    if (!activeEvent) return;
    const baseId = `${activeEvent.eventId}-COPY`;
    let nextId = baseId;
    let counter = 2;
    const existingIds = new Set(masterEvents.map((ev) => ev.eventId));
    while (existingIds.has(nextId)) {
      nextId = `${baseId}-${counter}`;
      counter += 1;
    }
    const duplicated: EventEntry = {
      ...activeEvent,
      eventId: nextId,
      eventName: `${activeEvent.eventName} (Copy)`,
    };
    setMasterEvents((prev) => [duplicated, ...prev]);
    setSelection((prev) => [{ eventId: nextId, enabled: false }, ...prev]);
    setActiveEventId(nextId);
  };

  const handleDelete = () => {
    if (!activeEvent) return;
    const confirmed = window.confirm(`Delete ${activeEvent.eventId}?`);
    if (!confirmed) return;
    setMasterEvents((prev) =>
      prev.filter((ev) => ev.eventId !== activeEvent.eventId)
    );
    setSelection((prev) =>
      prev.filter((entry) => entry.eventId !== activeEvent.eventId)
    );
    setActiveEventId("");
  };

  const saveMaster = async () => {
    setIsSavingMaster(true);
    setStatus(null);
    try {
      await window.electron.invoke("events-save-master", masterEvents);
      setStatus("Master saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save master");
    } finally {
      setIsSavingMaster(false);
    }
  };

  const saveSelection = async () => {
    setIsSavingSelection(true);
    setStatus(null);
    try {
      await window.electron.invoke("events-save-selection", selection);
      setStatus("Selection saved.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to save selection");
    } finally {
      setIsSavingSelection(false);
    }
  };

  const compile = async () => {
    setIsCompiling(true);
    setStatus(null);
    try {
      const result = await window.electron.invoke("events-compile");
      const count =
        result && typeof result.count === "number" ? result.count : null;
      setStatus(
        count !== null ? `Compiled ${count} events.` : "Compiled events."
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Compile failed");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0b0f14",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Event Compiler</h1>
          <div style={{ color: "#9ca3af", marginTop: "0.25rem" }}>
            Curate and compile the public events catalog
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={onBack}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              color: "#f9fafb",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
          <button
            onClick={compile}
            disabled={isCompiling}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              color: "#f9fafb",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isCompiling ? "Compiling..." : "Compile events.json"}
          </button>
        </div>
      </div>

      {status && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            backgroundColor: "#111827",
            borderRadius: "6px",
            border: "1px solid #374151",
          }}
        >
          {status}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "1rem",
            backgroundColor: "#0f172a",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.75rem" }}>Event List</div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {selectionOrdered.map((entry) => {
              const ev = masterMap.get(entry.eventId);
              if (!ev) return null;
              return (
                <div
                  key={entry.eventId}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", entry.eventId);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData("text/plain");
                    handleDrag(fromId, entry.eventId);
                  }}
                  onClick={() => setActiveEventId(entry.eventId)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "16px 1fr auto",
                    gap: "0.5rem",
                    alignItems: "center",
                    padding: "0.5rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #1f2937",
                    backgroundColor:
                      entry.eventId === activeEventId ? "#111827" : "#0b1220",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>≡</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {ev.eventId}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                      {ev.eventName}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEnabled(entry.eventId);
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "999px",
                      border: "1px solid #374151",
                      backgroundColor: entry.enabled ? "#10b981" : "#111827",
                      color: entry.enabled ? "#0b1220" : "#9ca3af",
                      fontSize: "0.7rem",
                      cursor: "pointer",
                    }}
                  >
                    {entry.enabled ? "ON" : "OFF"}
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button
              onClick={saveSelection}
              disabled={isSavingSelection}
              style={{
                padding: "0.4rem 0.75rem",
                backgroundColor: "#111827",
                border: "1px solid #374151",
                color: "#f9fafb",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {isSavingSelection ? "Saving..." : "Save Selection"}
            </button>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #1f2937",
            borderRadius: "8px",
            padding: "1rem",
            backgroundColor: "#0f172a",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600 }}>Event Editor</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleDuplicate}
                disabled={!activeEvent}
                style={{
                  padding: "0.35rem 0.7rem",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  color: "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Duplicate
              </button>
              <button
                onClick={handleDelete}
                disabled={!activeEvent}
                style={{
                  padding: "0.35rem 0.7rem",
                  backgroundColor: "#7f1d1d",
                  border: "1px solid #7f1d1d",
                  color: "#fef2f2",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Delete
              </button>
              <button
                onClick={saveMaster}
                disabled={isSavingMaster}
                style={{
                  padding: "0.35rem 0.7rem",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  color: "#f9fafb",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                {isSavingMaster ? "Saving..." : "Save Master"}
              </button>
            </div>
          </div>

          {!activeEvent && (
            <div style={{ color: "#9ca3af" }}>Select an event to edit.</div>
          )}

          {activeEvent && (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                Event ID
                <input
                  value={activeEvent.eventId}
                  onChange={(e) => updateEvent(activeEvent.eventId, { eventId: e.target.value })}
                  style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                Event Name
                <input
                  value={activeEvent.eventName}
                  onChange={(e) => updateEvent(activeEvent.eventId, { eventName: e.target.value })}
                  style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                Event Description
                <textarea
                  value={activeEvent.eventDescription}
                  onChange={(e) => updateEvent(activeEvent.eventId, { eventDescription: e.target.value })}
                  style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb", minHeight: "90px" }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                  Event Date
                  <input
                    value={activeEvent.eventDate}
                    onChange={(e) => updateEvent(activeEvent.eventId, { eventDate: e.target.value })}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                  Event Time
                  <input
                    value={activeEvent.eventTime}
                    onChange={(e) => updateEvent(activeEvent.eventId, { eventTime: e.target.value })}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                  />
                </label>
              </div>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                Start Location Name
                <input
                  value={activeEvent.startLocationName}
                  onChange={(e) => updateEvent(activeEvent.eventId, { startLocationName: e.target.value })}
                  style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                Start Location URL
                <input
                  value={activeEvent.startLocationUrl}
                  onChange={(e) => updateEvent(activeEvent.eventId, { startLocationUrl: e.target.value })}
                  style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                  Start Latitude
                  <input
                    value={String(activeEvent.startLocationCoordinates.lat)}
                    onChange={(e) => updateCoordinates("lat", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                  />
                </label>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                  Start Longitude
                  <input
                    value={String(activeEvent.startLocationCoordinates.lng)}
                    onChange={(e) => updateCoordinates("lng", e.target.value)}
                    style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#0b1220", color: "#f9fafb" }}
                  />
                </label>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                Routes: {activeEvent.routes.map((route) => route.label).join(", ")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
