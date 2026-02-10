import { useState } from "react";
import { toErrorMap, validateRaceRecap } from "../../utils/validation";

type RaceRecap = {
  id: string;
  raceName: string;
  raceDate?: string;
  distance: string;
  vert?: string;
  conditions?: string;
  strategySummary?: string;
  whatWorked?: string[];
  whatDidnt?: string[];
  lessons?: string[];
  result?: string;
  finishTime?: string;
  placement?: string;
  body?: string;
  topics: string[];
  tier: "team" | "public";
  author: string;
  publishedAt: string;
  status?: "draft" | "published";
};

type RaceRecapFormProps = {
  initialData?: Partial<RaceRecap>;
  onSave: (recap: RaceRecap) => void;
  onCancel: () => void;
};

export default function RaceRecapForm({ initialData, onSave, onCancel }: RaceRecapFormProps) {
  const [formData, setFormData] = useState<Partial<RaceRecap>>({
    id: initialData?.id || `race-recap-${Date.now()}`,
    raceName: initialData?.raceName || "",
    raceDate: initialData?.raceDate || "",
    distance: initialData?.distance || "",
    vert: initialData?.vert || "",
    conditions: initialData?.conditions || "",
    strategySummary: initialData?.strategySummary || "",
    whatWorked: initialData?.whatWorked || [""],
    whatDidnt: initialData?.whatDidnt || [""],
    lessons: initialData?.lessons || [""],
    result: initialData?.result || "",
    finishTime: initialData?.finishTime || "",
    placement: initialData?.placement || "",
    body: initialData?.body || "",
    topics: initialData?.topics || ["strategy", "race-recaps"],
    tier: initialData?.tier || "team",
    author: initialData?.author || "Coach Brandon",
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    status: initialData?.status || "draft",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const cleanedData = {
      ...formData,
      whatWorked: formData.whatWorked?.filter(w => w.trim()) || [],
      whatDidnt: formData.whatDidnt?.filter(w => w.trim()) || [],
      lessons: formData.lessons?.filter(l => l.trim()) || [],
    };
    const result = validateRaceRecap(cleanedData);
    if (!result.ok) {
      setErrors(toErrorMap(result.errors));
      return;
    }
    onSave(cleanedData as RaceRecap);
  };

  const updateField = <K extends keyof RaceRecap>(field: K, value: RaceRecap[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateListItem = (field: "whatWorked" | "whatDidnt" | "lessons", index: number, value: string) => {
    const current = [...(formData[field] || [])];
    current[index] = value;
    updateField(field, current);
  };

  const addListItem = (field: "whatWorked" | "whatDidnt" | "lessons") => {
    updateField(field, [...(formData[field] || []), ""]);
  };

  const removeListItem = (field: "whatWorked" | "whatDidnt" | "lessons", index: number) => {
    const current = formData[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Race Recap</h2>

      {/* Race Name */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Race Name *
        </label>
        <input
          type="text"
          value={formData.raceName}
          onChange={(e) => updateField("raceName", e.target.value)}
          placeholder="e.g., Western States 100"
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.raceName ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "1rem",
          }}
        />
        {errors.raceName && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.raceName}</div>}
      </div>

      {/* Race Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Race Date</label>
          <input
            type="date"
            value={formData.raceDate}
            onChange={(e) => updateField("raceDate", e.target.value)}
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Distance *</label>
          <input
            type="text"
            value={formData.distance}
            onChange={(e) => updateField("distance", e.target.value)}
            placeholder="e.g., 100 miles"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: `1px solid ${errors.distance ? "var(--error)" : "var(--border-medium)"}`,
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
          {errors.distance && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.distance}</div>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Vert</label>
          <input
            type="text"
            value={formData.vert}
            onChange={(e) => updateField("vert", e.target.value)}
            placeholder="e.g., 18,000 ft"
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

      {/* Result Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Finish Time</label>
          <input
            type="text"
            value={formData.finishTime}
            onChange={(e) => updateField("finishTime", e.target.value)}
            placeholder="e.g., 22:45:30"
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Placement</label>
          <input
            type="text"
            value={formData.placement}
            onChange={(e) => updateField("placement", e.target.value)}
            placeholder="e.g., 12th Overall, 3rd AG"
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Result</label>
          <input
            type="text"
            value={formData.result}
            onChange={(e) => updateField("result", e.target.value)}
            placeholder="e.g., Finished, DNF"
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

      {/* Conditions */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Conditions</label>
        <input
          type="text"
          value={formData.conditions}
          onChange={(e) => updateField("conditions", e.target.value)}
          placeholder="e.g., Hot and dry, 85-95°F, dusty trails"
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

      {/* Strategy Summary */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Strategy Summary</label>
        <textarea
          value={formData.strategySummary}
          onChange={(e) => updateField("strategySummary", e.target.value)}
          rows={3}
          placeholder="Brief overview of race strategy and approach..."
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

      {/* What Worked */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>What Worked</label>
        {formData.whatWorked?.map((item, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={item}
              onChange={(e) => updateListItem("whatWorked", index, e.target.value)}
              placeholder="Something that went well..."
              style={{
                flex: 1,
                padding: "0.5rem",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={() => removeListItem("whatWorked", index)}
              style={{
                padding: "0.5rem",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              −
            </button>
          </div>
        ))}
        <button
          onClick={() => addListItem("whatWorked")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: "var(--primary)",
            border: "1px solid var(--primary)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          + Add Item
        </button>
      </div>

      {/* What Didn't Work */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>What Didn't Work</label>
        {formData.whatDidnt?.map((item, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={item}
              onChange={(e) => updateListItem("whatDidnt", index, e.target.value)}
              placeholder="Something that didn't go as planned..."
              style={{
                flex: 1,
                padding: "0.5rem",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={() => removeListItem("whatDidnt", index)}
              style={{
                padding: "0.5rem",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              −
            </button>
          </div>
        ))}
        <button
          onClick={() => addListItem("whatDidnt")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: "var(--primary)",
            border: "1px solid var(--primary)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          + Add Item
        </button>
      </div>

      {/* Lessons Learned */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Lessons Learned</label>
        {formData.lessons?.map((lesson, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={lesson}
              onChange={(e) => updateListItem("lessons", index, e.target.value)}
              placeholder="Key takeaway or lesson..."
              style={{
                flex: 1,
                padding: "0.5rem",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={() => removeListItem("lessons", index)}
              style={{
                padding: "0.5rem",
                backgroundColor: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-medium)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              −
            </button>
          </div>
        ))}
        <button
          onClick={() => addListItem("lessons")}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "transparent",
            color: "var(--primary)",
            border: "1px solid var(--primary)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          + Add Lesson
        </button>
      </div>

      {/* Full Recap Body */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Full Recap (Markdown, Optional)</label>
        <textarea
          value={formData.body}
          onChange={(e) => updateField("body", e.target.value)}
          rows={12}
          placeholder="Full race report in markdown format..."
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

      {/* Status and Tier */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Status</label>
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Tier</label>
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
          Save Recap
        </button>
      </div>
    </div>
  );
}
