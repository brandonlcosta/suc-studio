import { useState } from "react";
import { toErrorMap, validateTrainingTip } from "../../utils/validation";

type TrainingTip = {
  id: string;
  type: "training-tip" | "workshop";
  title: string;
  summary: string;
  body: string;
  topics: string[];
  tier: "team" | "public";
  series?: string | null;
  part?: number | null;
  author: string;
  publishedAt: string;
  status?: "draft" | "published";
  references?: string[];
  media?: Array<{ type: "image" | "video"; url: string; caption?: string }>;
};

type TrainingTipFormProps = {
  initialData?: Partial<TrainingTip>;
  onSave: (tip: TrainingTip) => void;
  onCancel: () => void;
};

const PRIMARY_TOPICS = ["training", "fueling", "gear", "recovery", "injury-prevention", "strategy"];
const SECONDARY_TOPICS: Record<string, string[]> = {
  training: ["heat-acclimation", "climbing", "tempo", "intervals", "long-runs", "recovery-runs"],
  fueling: ["race-day", "training-nutrition", "hydration", "supplements", "gut-training"],
  gear: ["footwear", "hydration", "apparel", "navigation", "accessories"],
  recovery: ["sleep", "nutrition", "stretching", "foam-rolling", "active-recovery"],
  "injury-prevention": ["knee-health", "foot-health", "hip-strength", "core", "mobility"],
  strategy: ["pacing", "race-tactics", "mental-prep", "crew-support", "drop-bags"],
};

export default function TrainingTipForm({ initialData, onSave, onCancel }: TrainingTipFormProps) {
  const [formData, setFormData] = useState<Partial<TrainingTip>>({
    id: initialData?.id || `tip-${Date.now()}`,
    type: initialData?.type || "training-tip",
    title: initialData?.title || "",
    summary: initialData?.summary || "",
    body: initialData?.body || "",
    topics: initialData?.topics || [],
    tier: initialData?.tier || "team",
    author: initialData?.author || "Coach Brandon",
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    status: initialData?.status || "draft",
    series: initialData?.series || null,
    part: initialData?.part || null,
    references: initialData?.references || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const result = validateTrainingTip(formData);
    if (!result.ok) {
      setErrors(toErrorMap(result.errors));
      return;
    }
    onSave(formData as TrainingTip);
  };

  const updateField = <K extends keyof TrainingTip>(field: K, value: TrainingTip[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const primaryTopic = formData.topics?.[0] || "";
  const secondaryTopic = formData.topics?.[1] || "";

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Training Tip</h2>

      {/* Type */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Type
        </label>
        <select
          value={formData.type}
          onChange={(e) => updateField("type", e.target.value as "training-tip" | "workshop")}
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

      {/* Title */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => updateField("title", e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.title ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "1rem",
          }}
        />
        {errors.title && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.title}</div>}
      </div>

      {/* Summary */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Summary *
        </label>
        <textarea
          value={formData.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.summary ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            resize: "vertical",
          }}
        />
        {errors.summary && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.summary}</div>}
      </div>

      {/* Topics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Primary Topic *
          </label>
          <select
            value={primaryTopic}
            onChange={(e) => {
              const newTopics = [e.target.value, secondaryTopic].filter(Boolean);
              updateField("topics", newTopics);
            }}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: `1px solid ${errors.topics ? "var(--error)" : "var(--border-medium)"}`,
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          >
            <option value="">Select primary topic</option>
            {PRIMARY_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Secondary Topic
          </label>
          <select
            value={secondaryTopic}
            onChange={(e) => {
              const newTopics = [primaryTopic, e.target.value].filter(Boolean);
              updateField("topics", newTopics);
            }}
            disabled={!primaryTopic}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid var(--border-medium)",
              borderRadius: "4px",
              backgroundColor: primaryTopic ? "var(--bg-primary)" : "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          >
            <option value="">Select secondary topic</option>
            {primaryTopic &&
              SECONDARY_TOPICS[primaryTopic]?.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
          </select>
        </div>
      </div>
      {errors.topics && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "-0.5rem", marginBottom: "1rem" }}>{errors.topics}</div>}

      {/* Series and Part */}
      {formData.type === "workshop" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
              Series (optional)
            </label>
            <input
              type="text"
              value={formData.series ?? ""}
              onChange={(e) => updateField("series", e.target.value || null)}
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
              value={formData.part ?? ""}
              onChange={(e) => updateField("part", e.target.value ? parseInt(e.target.value, 10) : null)}
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
      )}

      {/* Body */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Content (Markdown) *
        </label>
        <textarea
          value={formData.body}
          onChange={(e) => updateField("body", e.target.value)}
          rows={20}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: `1px solid ${errors.body ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            resize: "vertical",
          }}
        />
        {errors.body && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.body}</div>}
      </div>

      {/* Status and Tier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Status
          </label>
          <select
            value={formData.status ?? "draft"}
            onChange={(e) => updateField("status", e.target.value as "draft" | "published")}
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

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Tier
          </label>
          <select
            value={formData.tier}
            onChange={(e) => updateField("tier", e.target.value as "team" | "public")}
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
            <option value="team">Team</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-medium)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSubmit}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "0.875rem",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
