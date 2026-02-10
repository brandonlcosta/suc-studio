import { useState } from "react";
import { toErrorMap, validateGearReview } from "../../utils/validation";

type GearReview = {
  id: string;
  name: string;
  brand?: string;
  gearType: "pack" | "vest" | "poles" | "headlamp" | "hydration" | "apparel" | "watch" | "nutrition" | "accessories";
  useCase: string[];
  pros: string[];
  cons: string[];
  verdict: string;
  rating: number;
  body?: string;
  topics: string[];
  tier: "team" | "public";
  author: string;
  publishedAt: string;
  status?: "draft" | "published";
};

type GearReviewFormProps = {
  initialData?: Partial<GearReview>;
  onSave: (review: GearReview) => void;
  onCancel: () => void;
};

export default function GearReviewForm({ initialData, onSave, onCancel }: GearReviewFormProps) {
  const [formData, setFormData] = useState<Partial<GearReview>>({
    id: initialData?.id || `gear-${Date.now()}`,
    name: initialData?.name || "",
    brand: initialData?.brand || "",
    gearType: initialData?.gearType || "pack",
    useCase: initialData?.useCase || [],
    pros: initialData?.pros || [""],
    cons: initialData?.cons || [""],
    verdict: initialData?.verdict || "",
    rating: initialData?.rating || 3,
    body: initialData?.body || "",
    topics: initialData?.topics || ["gear"],
    tier: initialData?.tier || "team",
    author: initialData?.author || "Coach Brandon",
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    status: initialData?.status || "draft",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const cleanedData = {
      ...formData,
      pros: formData.pros?.filter(p => p.trim()) || [],
      cons: formData.cons?.filter(c => c.trim()) || [],
    };
    const result = validateGearReview(cleanedData);
    if (!result.ok) {
      setErrors(toErrorMap(result.errors));
      return;
    }
    onSave(cleanedData as GearReview);
  };

  const updateField = <K extends keyof GearReview>(field: K, value: GearReview[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleUseCase = (value: string) => {
    const current = formData.useCase || [];
    const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    updateField("useCase", updated);
  };

  const updateListItem = (field: "pros" | "cons", index: number, value: string) => {
    const current = [...(formData[field] || [])];
    current[index] = value;
    updateField(field, current);
  };

  const addListItem = (field: "pros" | "cons") => {
    updateField(field, [...(formData[field] || []), ""]);
  };

  const removeListItem = (field: "pros" | "cons", index: number) => {
    const current = formData[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  const gearTypeToSecondaryTopic: Record<string, string> = {
    pack: "packs",
    vest: "vests",
    poles: "poles",
    headlamp: "lighting",
    hydration: "hydration",
    apparel: "apparel",
    watch: "watches",
    nutrition: "nutrition",
    accessories: "accessories",
  };

  // Auto-update topics when gearType changes
  const handleGearTypeChange = (type: GearReview["gearType"]) => {
    updateField("gearType", type);
    updateField("topics", ["gear", gearTypeToSecondaryTopic[type]]);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Gear Review</h2>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: `1px solid ${errors.name ? "var(--error)" : "var(--border-medium)"}`,
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
          {errors.name && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.name}</div>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Brand</label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => updateField("brand", e.target.value)}
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
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Type</label>
          <select
            value={formData.gearType}
            onChange={(e) => handleGearTypeChange(e.target.value as GearReview["gearType"])}
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
            <option value="pack">Pack</option>
            <option value="vest">Vest</option>
            <option value="poles">Poles</option>
            <option value="headlamp">Headlamp</option>
            <option value="hydration">Hydration</option>
            <option value="apparel">Apparel</option>
            <option value="watch">Watch</option>
            <option value="nutrition">Nutrition</option>
            <option value="accessories">Accessories</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Use Case</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {["racing", "training", "daily", "ultras", "fastpacking"].map((option) => (
            <label
              key={option}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                border: `1px solid ${(formData.useCase || []).includes(option) ? "var(--primary)" : "var(--border-medium)"}`,
                borderRadius: "4px",
                backgroundColor: (formData.useCase || []).includes(option) ? "var(--overlay-dark)" : "transparent",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              <input type="checkbox" checked={(formData.useCase || []).includes(option)} onChange={() => toggleUseCase(option)} />
              {option}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Pros *</label>
        {formData.pros?.map((pro, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={pro}
              onChange={(e) => updateListItem("pros", index, e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem",
                border: `1px solid ${errors.pros && !pro.trim() ? "var(--error)" : "var(--border-medium)"}`,
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={() => removeListItem("pros", index)}
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
          onClick={() => addListItem("pros")}
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
          + Add Pro
        </button>
        {errors.pros && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.pros}</div>}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Cons *</label>
        {formData.cons?.map((con, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={con}
              onChange={(e) => updateListItem("cons", index, e.target.value)}
              style={{
                flex: 1,
                padding: "0.5rem",
                border: `1px solid ${errors.cons && !con.trim() ? "var(--error)" : "var(--border-medium)"}`,
                borderRadius: "4px",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={() => removeListItem("cons", index)}
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
          onClick={() => addListItem("cons")}
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
          + Add Con
        </button>
        {errors.cons && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.cons}</div>}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Verdict *</label>
        <textarea
          value={formData.verdict}
          onChange={(e) => updateField("verdict", e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: `1px solid ${errors.verdict ? "var(--error)" : "var(--border-medium)"}`,
            borderRadius: "4px",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
            resize: "vertical",
          }}
        />
        {errors.verdict && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.verdict}</div>}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Rating</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => updateField("rating", star)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: formData.rating === star ? "var(--primary)" : "transparent",
                color: formData.rating === star ? "white" : "var(--text-secondary)",
                border: `1px solid ${formData.rating === star ? "var(--primary)" : "var(--border-medium)"}`,
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {star} ★
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Full Review (Markdown, Optional)</label>
        <textarea
          value={formData.body}
          onChange={(e) => updateField("body", e.target.value)}
          rows={12}
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
          Save Review
        </button>
      </div>
    </div>
  );
}
