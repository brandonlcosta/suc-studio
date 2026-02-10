import { useEffect, useMemo, useState } from "react";
import { buildStudioApiUrl } from "../utils/studioApi";

type TrainingContent = {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  topics: string[];
  tier: string;
  series?: string | null;
  part?: number | null;
  author?: string;
  publishedAt?: string;
  status?: "draft" | "published";
};

const TIPS_API = buildStudioApiUrl("/training-content");

export default function TipsManager() {
  const [tips, setTips] = useState<TrainingContent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrainingContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedPrimaryTopics, setExpandedPrimaryTopics] = useState<Set<string>>(new Set());
  const [expandedSecondaryTopics, setExpandedSecondaryTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(TIPS_API);
        if (!response.ok) {
          throw new Error(`Failed to load tips: ${response.status}`);
        }
        const data = (await response.json()) as TrainingContent[];
        setTips(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
          setDraft({ ...data[0] });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load tips: ${msg}`);
      }
    };
    loadData();
  }, []);

  const groupedTips = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tips.filter((tip) =>
      term
        ? tip.title.toLowerCase().includes(term) ||
          tip.topics.some((t) => t.toLowerCase().includes(term))
        : true
    );

    // Group by primary topic (first) and secondary topic (second)
    // Structure: Map<primaryTopic, Map<secondaryTopic, TrainingContent[]>>
    const grouped = new Map<string, Map<string, TrainingContent[]>>();

    filtered.forEach((tip) => {
      const primaryTopic = tip.topics[0] || "uncategorized";
      const secondaryTopic = tip.topics[1] || "general";

      if (!grouped.has(primaryTopic)) {
        grouped.set(primaryTopic, new Map());
      }

      const secondaryMap = grouped.get(primaryTopic)!;
      const existing = secondaryMap.get(secondaryTopic) || [];
      secondaryMap.set(secondaryTopic, [...existing, tip]);
    });

    // Sort tips within each secondary topic alphabetically
    grouped.forEach((secondaryMap) => {
      secondaryMap.forEach((tipList) => {
        tipList.sort((a, b) => a.title.localeCompare(b.title));
      });
    });

    // Convert to sorted array structure
    return Array.from(grouped.entries())
      .map(([primary, secondaryMap]) => ({
        primary,
        secondaryTopics: Array.from(secondaryMap.entries())
          .map(([secondary, tips]) => ({ secondary, tips }))
          .sort((a, b) => a.secondary.localeCompare(b.secondary)),
      }))
      .sort((a, b) => a.primary.localeCompare(b.primary));
  }, [tips, search]);

  const togglePrimaryTopic = (topic: string) => {
    setExpandedPrimaryTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleSecondaryTopic = (primaryTopic: string, secondaryTopic: string) => {
    const key = `${primaryTopic}/${secondaryTopic}`;
    setExpandedSecondaryTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelect = (tip: TrainingContent) => {
    setSelectedId(tip.id);
    setDraft({ ...tip });
    setDirty(false);
    setMessage(null);
    setError(null);
  };

  const handleNew = () => {
    const newTip: TrainingContent = {
      id: `tip-${Date.now()}`,
      type: "training-tip",
      title: "New Training Tip",
      summary: "",
      body: "",
      topics: [],
      tier: "team",
      status: "draft",
      author: "Coach Brandon",
      publishedAt: new Date().toISOString(),
    };
    setDraft(newTip);
    setSelectedId(newTip.id);
    setDirty(true);
    setMessage(null);
    setError(null);
  };

  const updateDraft = (updates: Partial<TrainingContent>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft) return;
    setError(null);
    setMessage(null);

    if (!draft.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!draft.id.trim()) {
      setError("ID is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${TIPS_API}/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft, null, 2),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Save failed: ${response.status}`);
      }

      const updatedData = await response.json();
      const existingIndex = tips.findIndex((t) => t.id === draft.id);
      const nextTips =
        existingIndex >= 0
          ? tips.map((t) => (t.id === draft.id ? draft : t))
          : [...tips, draft];

      setTips(nextTips);
      setDirty(false);
      setMessage("Tip saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!draft || !draft.id) return;
    if (!window.confirm(`Archive "${draft.title}"?`)) return;

    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`${TIPS_API}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Archive failed: ${response.status}`);
      }

      const nextTips = tips.filter((t) => t.id !== draft.id);
      setTips(nextTips);
      setDraft(nextTips[0] ?? null);
      setSelectedId(nextTips[0]?.id ?? null);
      setDirty(false);
      setMessage("Tip archived successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Archive failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left Sidebar */}
      <div
        style={{
          width: "320px",
          borderRight: "1px solid var(--border-medium)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-secondary)",
        }}
      >
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-medium)" }}>
          <button
            onClick={handleNew}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.875rem",
            }}
          >
            New Tip
          </button>
          <input
            type="text"
            placeholder="Search tips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              marginTop: "0.75rem",
              padding: "0.5rem",
              border: "1px solid var(--border-medium)",
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
        </div>

        <div style={{ flex: 1, overflow: "auto" }}>
          {groupedTips.map((primaryGroup) => (
            <div key={primaryGroup.primary}>
              {/* Primary Topic Header */}
              <button
                onClick={() => togglePrimaryTopic(primaryGroup.primary)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  border: "none",
                  borderBottom: "1px solid var(--border-medium)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  textTransform: "capitalize",
                }}
              >
                <span style={{ fontSize: "0.75rem" }}>
                  {expandedPrimaryTopics.has(primaryGroup.primary) ? "▼" : "▶"}
                </span>
                {primaryGroup.primary}
              </button>

              {/* Secondary Topics (shown when primary is expanded) */}
              {expandedPrimaryTopics.has(primaryGroup.primary) &&
                primaryGroup.secondaryTopics.map((secondaryGroup) => {
                  const secondaryKey = `${primaryGroup.primary}/${secondaryGroup.secondary}`;
                  return (
                    <div key={secondaryKey}>
                      {/* Secondary Topic Header */}
                      <button
                        onClick={() => toggleSecondaryTopic(primaryGroup.primary, secondaryGroup.secondary)}
                        style={{
                          width: "100%",
                          padding: "0.65rem 1rem 0.65rem 2rem",
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          border: "none",
                          borderBottom: "1px solid var(--border-light)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: "0.8rem",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          textTransform: "capitalize",
                        }}
                      >
                        <span style={{ fontSize: "0.7rem" }}>
                          {expandedSecondaryTopics.has(secondaryKey) ? "▼" : "▶"}
                        </span>
                        {secondaryGroup.secondary}
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "0.7rem",
                            fontWeight: "400",
                            opacity: 0.6,
                          }}
                        >
                          {secondaryGroup.tips.length}
                        </span>
                      </button>

                      {/* Tip Articles (shown when secondary is expanded) */}
                      {expandedSecondaryTopics.has(secondaryKey) &&
                        secondaryGroup.tips.map((tip) => (
                          <button
                            key={tip.id}
                            onClick={() => handleSelect(tip)}
                            style={{
                              width: "100%",
                              padding: "0.65rem 1rem 0.65rem 3.5rem",
                              backgroundColor: selectedId === tip.id ? "var(--overlay-dark)" : "transparent",
                              color: selectedId === tip.id ? "var(--text-primary)" : "var(--text-secondary)",
                              border: "none",
                              borderBottom: "1px solid var(--border-light)",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "0.8rem",
                            }}
                          >
                            <div style={{ fontWeight: "500", marginBottom: "0.25rem" }}>{tip.title}</div>
                            <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                              {tip.status === "draft" ? "Draft" : "Published"}
                            </div>
                          </button>
                        ))}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Toolbar */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid var(--border-medium)",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <button
            onClick={handleSave}
            disabled={!dirty || isSaving}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: dirty ? "var(--primary)" : "var(--border-medium)",
              color: dirty ? "white" : "var(--text-muted)",
              border: "none",
              borderRadius: "4px",
              cursor: dirty ? "pointer" : "not-allowed",
              fontWeight: "600",
              fontSize: "0.875rem",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handleArchive}
            disabled={!draft || isSaving}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "transparent",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-medium)",
              borderRadius: "4px",
              cursor: draft ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
            }}
          >
            Archive
          </button>

          {message && (
            <div style={{ color: "var(--success)", fontSize: "0.875rem", marginLeft: "auto" }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ color: "var(--error)", fontSize: "0.875rem", marginLeft: "auto" }}>
              {error}
            </div>
          )}
        </div>

        {/* Editor */}
        {draft && (
          <div style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "2rem" }}>
              {/* Form */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "1rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                    ID (slug)
                  </label>
                  <input
                    type="text"
                    value={draft.id}
                    onChange={(e) => updateDraft({ id: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                    Summary
                  </label>
                  <textarea
                    value={draft.summary}
                    onChange={(e) => updateDraft({ summary: e.target.value })}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                      Topics (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={draft.topics.join(", ")}
                      onChange={(e) =>
                        updateDraft({
                          topics: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                      Type
                    </label>
                    <select
                      value={draft.type}
                      onChange={(e) => updateDraft({ type: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                      }}
                    >
                      <option value="training-tip">Training Tip</option>
                      <option value="workshop">Workshop</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                      Series (optional)
                    </label>
                    <input
                      type="text"
                      value={draft.series ?? ""}
                      onChange={(e) => updateDraft({ series: e.target.value || null })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                      Part
                    </label>
                    <input
                      type="number"
                      value={draft.part ?? ""}
                      onChange={(e) => updateDraft({ part: e.target.value ? parseInt(e.target.value, 10) : null })}
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "4px",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.875rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                    Status
                  </label>
                  <select
                    value={draft.status ?? "draft"}
                    onChange={(e) => updateDraft({ status: e.target.value as "draft" | "published" })}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
                    Content (Markdown)
                  </label>
                  <textarea
                    value={draft.body}
                    onChange={(e) => updateDraft({ body: e.target.value })}
                    rows={20}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                      resize: "vertical",
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              <div style={{ flex: 1, borderLeft: "1px solid var(--border-medium)", paddingLeft: "2rem" }}>
                <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Preview</h3>
                <div
                  style={{
                    padding: "1.5rem",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "8px",
                    backgroundColor: "var(--bg-secondary)",
                    minHeight: "400px",
                  }}
                >
                  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>{draft.title || "Untitled"}</h2>
                  {draft.summary && (
                    <p style={{ margin: "0 0 1rem", fontSize: "1rem", opacity: 0.8 }}>{draft.summary}</p>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                    {draft.topics.map((topic) => (
                      <span
                        key={topic}
                        style={{
                          padding: "0.25rem 0.75rem",
                          backgroundColor: "var(--overlay-dark)",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                        }}
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      fontSize: "0.875rem",
                    }}
                  >
                    {draft.body || "No content yet..."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
