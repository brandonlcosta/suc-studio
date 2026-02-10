import { useState } from "react";
import { toErrorMap, validateCrewRunRecap } from "../../utils/validation";

type CrewRunRecap = {
  id: string;
  eventName: string;
  eventDate: string;
  routeId?: string;
  routeName?: string;
  distance?: string;
  vert?: string;
  conditions?: string;
  highlights?: string[];
  crewShoutouts?: string[];
  body?: string;
  topics: string[];
  tier: "team" | "public";
  author: string;
  publishedAt: string;
  status?: "draft" | "published";
};

type CrewRunRecapFormProps = {
  initialData?: Partial<CrewRunRecap>;
  onSave: (recap: CrewRunRecap) => void;
  onCancel: () => void;
};

export default function CrewRunRecapForm({ initialData, onSave, onCancel }: CrewRunRecapFormProps) {
  const [formData, setFormData] = useState<Partial<CrewRunRecap>>({
    id: initialData?.id || `crew-run-${Date.now()}`,
    eventName: initialData?.eventName || "",
    eventDate: initialData?.eventDate || "",
    routeId: initialData?.routeId || "",
    routeName: initialData?.routeName || "",
    distance: initialData?.distance || "",
    vert: initialData?.vert || "",
    conditions: initialData?.conditions || "",
    highlights: initialData?.highlights || [""],
    crewShoutouts: initialData?.crewShoutouts || [""],
    body: initialData?.body || "",
    topics: initialData?.topics || ["crew", "weekend-runs"],
    tier: initialData?.tier || "team",
    author: initialData?.author || "Coach Brandon",
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    status: initialData?.status || "draft",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const cleanedData = {
      ...formData,
      highlights: formData.highlights?.filter(h => h.trim()) || [],
      crewShoutouts: formData.crewShoutouts?.filter(c => c.trim()) || [],
    };
    const result = validateCrewRunRecap(cleanedData);
    if (!result.ok) {
      setErrors(toErrorMap(result.errors));
      return;
    }
    onSave(cleanedData as CrewRunRecap);
  };

  const updateField = <K extends keyof CrewRunRecap>(field: K, value: CrewRunRecap[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateListItem = (field: "highlights" | "crewShoutouts", index: number, value: string) => {
    const current = [...(formData[field] || [])];
    current[index] = value;
    updateField(field, current);
  };

  const addListItem = (field: "highlights" | "crewShoutouts") => {
    updateField(field, [...(formData[field] || []), ""]);
  };

  const removeListItem = (field: "highlights" | "crewShoutouts", index: number) => {
    const current = formData[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Crew Run Recap</h2>

      {/* Event Name */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Event Name *
        </label>
        <input
          type="text"
          value={formData.eventName}
          onChange={(e) => updateField("eventName", e.target.value)}
          placeholder="e.g., SUC Saturday Long Run - Marin Headlands"
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.eventName ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "1rem",
          }}
        />
        {errors.eventName && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.eventName}</div>}
      </div>

      {/* Event Date */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Event Date *
        </label>
        <input
          type="date"
          value={formData.eventDate}
          onChange={(e) => updateField("eventDate", e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.eventDate ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        />
        {errors.eventDate && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.eventDate}</div>}
      </div>

      {/* Route Details */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Route ID</label>
          <input
            type="text"
            value={formData.routeId}
            onChange={(e) => updateField("routeId", e.target.value)}
            placeholder="e.g., route-123"
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Route Name</label>
          <input
            type="text"
            value={formData.routeName}
            onChange={(e) => updateField("routeName", e.target.value)}
            placeholder="e.g., Marin Headlands Loop"
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

      {/* Distance, Vert, Conditions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Distance</label>
          <input
            type="text"
            value={formData.distance}
            onChange={(e) => updateField("distance", e.target.value)}
            placeholder="e.g., 18 miles"
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Vert</label>
          <input
            type="text"
            value={formData.vert}
            onChange={(e) => updateField("vert", e.target.value)}
            placeholder="e.g., 3,500 ft"
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Conditions</label>
          <input
            type="text"
            value={formData.conditions}
            onChange={(e) => updateField("conditions", e.target.value)}
            placeholder="e.g., Foggy, 55°F"
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

      {/* Highlights */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Highlights</label>
        {formData.highlights?.map((highlight, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={highlight}
              onChange={(e) => updateListItem("highlights", index, e.target.value)}
              placeholder="Notable moment or highlight..."
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
              onClick={() => removeListItem("highlights", index)}
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
          onClick={() => addListItem("highlights")}
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
          + Add Highlight
        </button>
      </div>

      {/* Crew Shoutouts */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Crew Shoutouts</label>
        {formData.crewShoutouts?.map((shoutout, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={shoutout}
              onChange={(e) => updateListItem("crewShoutouts", index, e.target.value)}
              placeholder="Shout out to a crew member..."
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
              onClick={() => removeListItem("crewShoutouts", index)}
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
          onClick={() => addListItem("crewShoutouts")}
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
          + Add Shoutout
        </button>
      </div>

      {/* Full Recap Body */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Full Recap (Markdown, Optional)</label>
        <textarea
          value={formData.body}
          onChange={(e) => updateField("body", e.target.value)}
          rows={12}
          placeholder="Full recap story in markdown format..."
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
