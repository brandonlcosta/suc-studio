import { useEffect, useMemo, useState } from "react";
import type { Block, Challenge, Week } from "../types/studio";
import { loadJson, saveJson, exportJson } from "../utils/storage";
import { assertBlocks, assertChallenges, assertWeeks } from "../utils/studioValidation";

const CHALLENGES_FILE = "challenges.json";
const BLOCKS_FILE = "blocks.json";
const WEEKS_FILE = "weeks.json";

const emptyChallenge: Challenge = {
  id: "",
  name: "",
  description: "",
  intent: "",
  startRef: { type: "week", id: "" },
  endRef: { type: "week", id: "" },
  rules: "",
  linkedWorkouts: [],
  linkedRoutes: [],
  status: "active",
};

export default function ChallengeBuilder() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Challenge | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [challengeData, blocksData, weeksData] = await Promise.all([
          loadJson<Challenge[]>(CHALLENGES_FILE, assertChallenges),
          loadJson<Block[]>(BLOCKS_FILE, assertBlocks),
          loadJson<Week[]>(WEEKS_FILE, assertWeeks),
        ]);
        setChallenges(challengeData);
        setBlocks(blocksData);
        setWeeks(weeksData);
        setSelectedId(challengeData[0]?.id ?? null);
        setDraft(challengeData[0] ? { ...challengeData[0] } : null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load challenges: ${msg}`);
      }
    };
    loadData();
  }, []);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((challenge) => challenge.status === filter);
  }, [challenges, filter]);

  const weekOptions = useMemo(
    () =>
      weeks.map((week) => ({
        id: week.id,
        label: `${week.weekKey} · ${week.title}`,
      })),
    [weeks]
  );

  const blockOptions = useMemo(
    () =>
      blocks.map((block) => ({
        id: block.id,
        label: `${block.name} · ${block.startWeek}+${block.lengthWeeks}w`,
      })),
    [blocks]
  );

  const startOptions = draft?.startRef.type === "week" ? weekOptions : blockOptions;
  const endOptions = draft?.endRef.type === "week" ? weekOptions : blockOptions;

  const handleSelect = (challenge: Challenge) => {
    setSelectedId(challenge.id);
    setDraft({ ...challenge });
    setDirty(false);
    setMessage(null);
    setError(null);
  };

  const updateDraft = (updates: Partial<Challenge>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    setMessage(null);

    if (!draft.id.trim() || !draft.name.trim()) {
      setError("Challenge ID and name are required.");
      return;
    }

    const refIds = new Set([
      ...blocks.map((block) => block.id),
      ...weeks.map((week) => week.id),
    ]);

    if (!refIds.has(draft.startRef.id) || !refIds.has(draft.endRef.id)) {
      setError("Start and end references must point to existing blocks or weeks.");
      return;
    }

    const nextChallenges = challenges.some((challenge) => challenge.id === draft.id)
      ? challenges.map((challenge) => (challenge.id === draft.id ? draft : challenge))
      : [...challenges, draft];

    setIsSaving(true);
    try {
      await saveJson(CHALLENGES_FILE, nextChallenges, assertChallenges);
      setChallenges(nextChallenges);
      setMessage("Challenges saved.");
      setDirty(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save challenges: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = () => {
    setDraft({ ...emptyChallenge });
    setSelectedId(null);
    setDirty(true);
    setMessage(null);
    setError(null);
  };

  const handleToggleStatus = (challenge: Challenge) => {
    const nextStatus = challenge.status === "active" ? "archived" : "active";
    setChallenges((prev) =>
      prev.map((item) =>
        item.id === challenge.id ? { ...item, status: nextStatus } : item
      )
    );
    if (draft?.id === challenge.id) {
      setDraft({ ...draft, status: nextStatus });
      setDirty(true);
    }
  };

  return (
    <div style={{ padding: "2rem", display: "grid", gap: "2rem", backgroundColor: "#0a0e14", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginBottom: "0.35rem", color: "#f5f5f5" }}>Challenges</h2>
          <div style={{ color: "#999999" }}>Keep challenges cultural and low pressure.</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleCreate}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#111827",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            New Challenge
          </button>
          <button
            onClick={() => exportJson(CHALLENGES_FILE, challenges)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#1a1a1a",
              color: "#f5f5f5",
              border: "1px solid #3a3a3a",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {message && (
        <div
          style={{
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
        <aside style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setFilter("active")}
              style={{
                flex: 1,
                padding: "0.4rem",
                borderRadius: "4px",
                border: "1px solid #3a3a3a",
                backgroundColor: filter === "active" ? "#111827" : "#1a1a1a",
                color: filter === "active" ? "white" : "#f5f5f5",
              }}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("archived")}
              style={{
                flex: 1,
                padding: "0.4rem",
                borderRadius: "4px",
                border: "1px solid #3a3a3a",
                backgroundColor: filter === "archived" ? "#111827" : "#1a1a1a",
                color: filter === "archived" ? "white" : "#f5f5f5",
              }}
            >
              Archived
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filteredChallenges.map((challenge) => {
              const isActive = challenge.id === selectedId;
              return (
                <div
                  key={challenge.id}
                  style={{
                    border: isActive ? "2px solid #2563eb" : "1px solid #2a2a2a",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    backgroundColor: isActive ? "#1a2332" : "#1a1a1a",
                  }}
                >
                  <button
                    onClick={() => handleSelect(challenge)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "none",
                      textAlign: "left",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#f5f5f5" }}>{challenge.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#999999" }}>
                      {challenge.intent}
                    </div>
                  </button>
                  <label style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", color: "#f5f5f5" }}>
                    <input
                      type="checkbox"
                      checked={challenge.status === "active"}
                      onChange={() => handleToggleStatus(challenge)}
                    />
                    {challenge.status === "active" ? "Active" : "Archived"}
                  </label>
                </div>
              );
            })}
          </div>
        </aside>

        <section>
          {draft ? (
            <div
              style={{
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                padding: "1.5rem",
                backgroundColor: "#1a1a1a",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, color: "#f5f5f5" }}>{draft.name || "New Challenge"}</h3>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {dirty && <span style={{ color: "#ff9999" }}>Unsaved</span>}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
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

              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Challenge ID</label>
                <input
                  value={draft.id}
                  onChange={(event) => updateDraft({ id: event.target.value })}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #2b2b2b",
                    backgroundColor: "#0b0b0b",
                    color: "#f5f5f5",
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Name</label>
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid #2b2b2b",
                    backgroundColor: "#0b0b0b",
                    color: "#f5f5f5",
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Description</label>
                <textarea
                  value={draft.description}
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  rows={2}
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
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Intent</label>
                <textarea
                  value={draft.intent}
                  onChange={(event) => updateDraft({ intent: event.target.value })}
                  rows={2}
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
                  <label style={{ fontSize: "0.75rem", color: "#999999" }}>Start</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={draft.startRef.type}
                      onChange={(event) =>
                        updateDraft({
                          startRef: { type: event.target.value as "week" | "block", id: "" },
                        })
                      }
                      style={{
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="week">Week</option>
                      <option value="block">Block</option>
                    </select>
                    <select
                      value={draft.startRef.id}
                      onChange={(event) =>
                        updateDraft({ startRef: { ...draft.startRef, id: event.target.value } })
                      }
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="">Select</option>
                      {startOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "#999999" }}>End</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={draft.endRef.type}
                      onChange={(event) =>
                        updateDraft({
                          endRef: { type: event.target.value as "week" | "block", id: "" },
                        })
                      }
                      style={{
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="week">Week</option>
                      <option value="block">Block</option>
                    </select>
                    <select
                      value={draft.endRef.id}
                      onChange={(event) =>
                        updateDraft({ endRef: { ...draft.endRef, id: event.target.value } })
                      }
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <option value="">Select</option>
                      {endOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "#999999" }}>Rules</label>
                <textarea
                  value={draft.rules}
                  onChange={(event) => updateDraft({ rules: event.target.value })}
                  rows={4}
                  placeholder="Write rules in plain language. No scoring."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    border: "1px solid #2b2b2b",
                    backgroundColor: "#0b0b0b",
                    color: "#f5f5f5",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: "#999999", marginTop: "0.25rem" }}>
                  Write rules in plain language. No scoring.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "#999999" }}>Select a challenge to edit.</div>
          )}
        </section>
      </div>
    </div>
  );
}
