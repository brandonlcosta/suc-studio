import { useEffect, useMemo, useState } from "react";
import type { RosterMember } from "../types/studio";
import { loadJson, saveJson, exportJson } from "../utils/storage";
import { assertRoster } from "../utils/studioValidation";

const ROSTER_FILE = "roster.json";

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
        const rosterData = await loadJson<RosterMember[]>(ROSTER_FILE, assertRoster);
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

    const nextRoster = roster.map((member) =>
      member.id === selectedId ? draft : member
    );

    setIsSaving(true);
    try {
      await saveJson(ROSTER_FILE, nextRoster, assertRoster);
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

  return (
    <div style={{ padding: "2rem", display: "flex", gap: "2rem" }}>
      <aside style={{ width: "320px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Roster</h2>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
            }}
          />
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
                  border: isActive ? "2px solid #111827" : "1px solid #e5e7eb",
                  backgroundColor: isActive ? "#f3f4f6" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{member.name}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{member.tier}</div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "0.35rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    backgroundColor:
                      member.status === "active"
                        ? "#dcfce7"
                        : member.status === "paused"
                        ? "#fef9c3"
                        : "#e5e7eb",
                  }}
                >
                  {member.status}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={() => exportJson(ROSTER_FILE, roster)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              backgroundColor: "#f9fafb",
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
          <h2 style={{ margin: 0 }}>Profile</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {dirty && <span style={{ color: "#dc2626" }}>Unsaved</span>}
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
              backgroundColor: "#ecfdf3",
              border: "1px solid #bbf7d0",
              borderRadius: "4px",
              color: "#166534",
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
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              color: "#991b1b",
            }}
          >
            {error}
          </div>
        )}

        {draft ? (
          <div
            style={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1.5rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Name</label>
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Email</label>
              <input
                value={draft.email}
                onChange={(event) => updateDraft({ email: event.target.value })}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Status</label>
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
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Tier</label>
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
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Training Goal</label>
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
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>
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
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Consent</div>
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
          <div>Select a roster member to edit.</div>
        )}
      </section>
    </div>
  );
}
