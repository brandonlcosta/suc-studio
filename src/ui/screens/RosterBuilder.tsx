import { useEffect, useMemo, useState } from "react";
import type { RosterMember } from "../types/studio";
import { exportJson } from "../utils/storage";
import { assertRoster } from "../utils/studioValidation";
import { parseRosterCsv } from "../../utils/parseRosterCsv";

const ROSTER_FILE = "roster.json";
const ROSTER_API = "/api/roster";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RosterBuilder() {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RosterMember | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(ROSTER_API);
        if (!response.ok) {
          throw new Error(`Failed to load roster: ${response.status}`);
        }
        const rosterData = (await response.json()) as unknown;
        assertRoster(rosterData);
        setRoster(rosterData);
        setSelectedId(rosterData[0]?.id ?? null);
        setDraft(rosterData[0] ?? null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load roster: ${msg}`);
      }
    };
    loadData();
  }, []);

  const filteredRoster = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roster
      .filter((member) =>
        term ? member.name.toLowerCase().includes(term) || member.email.toLowerCase().includes(term) : true
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roster, search]);

  const handleSelect = (member: RosterMember) => {
    setSelectedId(member.id);
    setDraft({ ...member });
    setDirty(false);
    setMessage(null);
    setError(null);
  };

  const updateDraft = (updates: Partial<RosterMember>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    setMessage(null);

    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!draft.id.trim()) {
      setError("ID is required.");
      return;
    }
    if (!isValidEmail(draft.email)) {
      setError("Email must be valid.");
      return;
    }

    const existingIndex = roster.findIndex((member) => member.id === draft.id);
    const nextRoster =
      existingIndex >= 0
        ? roster.map((member) => (member.id === draft.id ? draft : member))
        : [...roster, draft];

    setIsSaving(true);
    try {
      assertRoster(nextRoster);
      const response = await fetch(ROSTER_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRoster, null, 2),
      });
      if (!response.ok) {
        throw new Error(`Failed to save roster: ${response.status}`);
      }
      setRoster(nextRoster);
      setSelectedId(draft.id);
      setMessage("Roster saved.");
      setDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save roster: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = () => {
    setSelectedId(null);
    setDraft({
      id: "",
      name: "",
      email: "",
      status: "active",
      tier: "MED",
      joinedDate: "",
      trainingGoal: "",
      weeklyMileageRange: "",
      consent: {
        publicName: false,
        publicStory: false,
        publicPhotos: false,
        publicMetrics: false,
      },
    });
    setDirty(true);
    setMessage(null);
    setError(null);
  };

  const handleCsvDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    // TODO(shared-import): Extract file validation + text loading for reuse across CSV importers.
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      setError("No file dropped.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }

    setIsSaving(true);
    try {
      const text = await file.text();
      // TODO(shared-import): Extract CSV parsing per domain (roster/routes/events/workouts).
      const incomingRoster = parseRosterCsv(text);
      // TODO(shared-import): Extract merge-by-id utility for CSV imports with conflict resolution.
      const mergedRosterMap = new Map<string, RosterMember>();

      roster.forEach((member) => {
        mergedRosterMap.set(member.id, member);
      });
      incomingRoster.forEach((member) => {
        mergedRosterMap.set(member.id, member);
      });

      const mergedRoster = Array.from(mergedRosterMap.values());
      // TODO(shared-import): Extract validate + persist step shared by CSV importers.
      assertRoster(mergedRoster);
      const response = await fetch(ROSTER_API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedRoster, null, 2),
      });
      if (!response.ok) {
        throw new Error(`Failed to save roster: ${response.status}`);
      }

      setRoster(mergedRoster);
      const nextSelected = selectedId && mergedRosterMap.has(selectedId) ? selectedId : mergedRoster[0]?.id ?? null;
      setSelectedId(nextSelected);
      setDraft(nextSelected ? { ...mergedRosterMap.get(nextSelected)! } : null);
      setDirty(false);
      setMessage(`Imported ${incomingRoster.length} CSV record${incomingRoster.length === 1 ? "" : "s"}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to import CSV: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: "2rem", display: "flex", gap: "2rem", backgroundColor: "#0a0e14", minHeight: "100%" }}>
      <aside style={{ width: "320px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginBottom: "0.5rem", color: "#f5f5f5" }}>Roster</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #2b2b2b",
              backgroundColor: "#0b0b0b",
              color: "#f5f5f5",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <button
            onClick={handleCreate}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #111827",
              backgroundColor: "#111827",
              color: "white",
              cursor: "pointer",
            }}
          >
            Add Member
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filteredRoster.map((member) => {
            const isActive = member.id === selectedId;
            return (
              <button
                key={member.id}
                onClick={() => handleSelect(member)}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: isActive ? "2px solid #2563eb" : "1px solid #2a2a2a",
                  backgroundColor: isActive ? "#1a2332" : "#1a1a1a",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, color: "#f5f5f5" }}>{member.name}</div>
                <div style={{ fontSize: "0.8rem", color: "#999999" }}>{member.tier}</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "0.35rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    backgroundColor:
                      member.status === "active"
                        ? "#1a2e22"
                        : member.status === "paused"
                        ? "#3a3a1a"
                        : "#2a2a2a",
                    color:
                      member.status === "active"
                        ? "#4ade80"
                        : member.status === "paused"
                        ? "#fbbf24"
                        : "#999999",
                  }}
                >
                  {member.status}
                </span>
              </button>
            );
          })}
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleCsvDrop}
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "6px",
            border: "1px dashed #3a3a3a",
            backgroundColor: "#0f0f0f",
            color: "#b3b3b3",
            textAlign: "center",
          }}
        >
          Drop CSV to import
        </div>
        <div style={{ marginTop: "0.5rem", color: "#999999", fontSize: "0.75rem", textAlign: "center" }}>
          CSV is the source of truth
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={() => exportJson(ROSTER_FILE, roster)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #3a3a3a",
              backgroundColor: "#1a1a1a",
              color: "#f5f5f5",
              cursor: "pointer",
            }}
          >
            Export Roster JSON
          </button>
        </div>
      </aside>

      <section style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0, color: "#f5f5f5" }}>Profile</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {dirty && <span style={{ color: "#ff9999" }}>Unsaved</span>}
            <button
              onClick={handleSave}
              disabled={isSaving || !draft}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#111827",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Save
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: "#1a2e22",
              border: "1px solid #16a34a",
              borderRadius: "4px",
              color: "#4ade80",
            }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: "#2a1a1a",
              border: "1px solid #ff5a5a",
              borderRadius: "4px",
              color: "#ff9999",
            }}
          >
            {error}
          </div>
        )}

        {draft ? (
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              padding: "1.5rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div>
              <label style={{ fontSize: "0.75rem", color: "#999999" }}>Name</label>
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #2b2b2b",
                  backgroundColor: "#0b0b0b",
                  color: "#f5f5f5",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#999999" }}>Email</label>
              <input
                value={draft.email}
                onChange={(event) => updateDraft({ email: event.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #2b2b2b",
                  backgroundColor: "#0b0b0b",
                  color: "#f5f5f5",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#999999" }}>Joined Date</label>
              <input
                value={draft.joinedDate}
                onChange={(event) => updateDraft({ joinedDate: event.target.value })}
                placeholder="YYYY-MM-DD"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #2b2b2b",
                  backgroundColor: "#0b0b0b",
                  color: "#f5f5f5",
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Status</label>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    updateDraft({ status: event.target.value as RosterMember["status"] })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="alumni">Alumni</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Tier</label>
                <select
                  value={draft.tier}
                  onChange={(event) =>
                    updateDraft({ tier: event.target.value as RosterMember["tier"] })
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="MED">MED</option>
                  <option value="LRG">LRG</option>
                  <option value="XL">XL</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Training Goal</label>
                <input
                  value={draft.trainingGoal ?? ""}
                  onChange={(event) => updateDraft({ trainingGoal: event.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>
                  Weekly Mileage Range
                </label>
                <input
                  value={draft.weeklyMileageRange ?? ""}
                  onChange={(event) => updateDraft({ weeklyMileageRange: event.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #d1d5db",
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#f5f5f5" }}>Consent</div>
              {(
                [
                  ["publicName", "Use name publicly"],
                  ["publicStory", "Share training story"],
                  ["publicPhotos", "Share photos"],
                  ["publicMetrics", "Share performance metrics"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                    color: "#f5f5f5",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={draft.consent[key]}
                    onChange={(event) =>
                      updateDraft({
                        consent: { ...draft.consent, [key]: event.target.checked },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: "#999999" }}>Select a roster member to edit.</div>
        )}
      </section>
    </div>
  );
}
