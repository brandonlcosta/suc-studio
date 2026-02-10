import { useState } from "react";
import { toErrorMap, validateFootwearReview } from "../../utils/validation";

type FootwearReview = {
  id: string;
  brand: string;
  model: string;
  category: "trail" | "road" | "ultra" | "recovery" | "racing";
  useCase: string[];
  terrain: string[];
  fit: "narrow" | "medium" | "wide";
  cushioning: "minimal" | "low" | "medium" | "high" | "maximal";
  stability: "neutral" | "support" | "motion-control";
  drop?: number;
  stackHeight?: number;
  weight?: number;
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
  photos?: Array<{ url: string; caption?: string }>;
};

type FootwearReviewFormProps = {
  initialData?: Partial<FootwearReview>;
  onSave: (review: FootwearReview) => void;
  onCancel: () => void;
};

export default function FootwearReviewForm({ initialData, onSave, onCancel }: FootwearReviewFormProps) {
  const [formData, setFormData] = useState<Partial<FootwearReview>>({
    id: initialData?.id || `footwear-${Date.now()}`,
    brand: initialData?.brand || "",
    model: initialData?.model || "",
    category: initialData?.category || "trail",
    useCase: initialData?.useCase || [],
    terrain: initialData?.terrain || [],
    fit: initialData?.fit || "medium",
    cushioning: initialData?.cushioning || "medium",
    stability: initialData?.stability || "neutral",
    drop: initialData?.drop,
    stackHeight: initialData?.stackHeight,
    weight: initialData?.weight,
    pros: initialData?.pros || [""],
    cons: initialData?.cons || [""],
    verdict: initialData?.verdict || "",
    rating: initialData?.rating || 3,
    body: initialData?.body || "",
    topics: ["gear", "footwear"],
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

    const result = validateFootwearReview(cleanedData);
    if (!result.ok) {
      setErrors(toErrorMap(result.errors));
      return;
    }

    onSave(cleanedData as FootwearReview);
  };

  const updateField = <K extends keyof FootwearReview>(field: K, value: FootwearReview[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const toggleArrayValue = (field: "useCase" | "terrain", value: string) => {
    const current = formData[field] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateField(field, updated);
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

  return (
    <div style={{ padding: "1.5rem", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Footwear Review</h2>

      {/* Brand and Model */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Brand *
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => updateField("brand", e.target.value)}
            placeholder="e.g., Hoka, Altra, Salomon"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: `1px solid ${errors.brand ? "var(--error)" : "var(--border-medium)"}`,
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
          {errors.brand && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.brand}</div>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Model *
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => updateField("model", e.target.value)}
            placeholder="e.g., Speedgoat 5"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: `1px solid ${errors.model ? "var(--error)" : "var(--border-medium)"}`,
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
          {errors.model && <div style={{ color: "var(--error)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.model}</div>}
        </div>
      </div>

      {/* Category, Fit, Cushioning, Stability */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Category</label>
          <select
            value={formData.category}
            onChange={(e) => updateField("category", e.target.value as FootwearReview["category"])}
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
            <option value="trail">Trail</option>
            <option value="road">Road</option>
            <option value="ultra">Ultra</option>
            <option value="recovery">Recovery</option>
            <option value="racing">Racing</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Fit</label>
          <select
            value={formData.fit}
            onChange={(e) => updateField("fit", e.target.value as FootwearReview["fit"])}
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
            <option value="narrow">Narrow</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Cushioning</label>
          <select
            value={formData.cushioning}
            onChange={(e) => updateField("cushioning", e.target.value as FootwearReview["cushioning"])}
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
            <option value="minimal">Minimal</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="maximal">Maximal</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Stability</label>
          <select
            value={formData.stability}
            onChange={(e) => updateField("stability", e.target.value as FootwearReview["stability"])}
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
            <option value="neutral">Neutral</option>
            <option value="support">Support</option>
            <option value="motion-control">Motion Control</option>
          </select>
        </div>
      </div>

      {/* Drop, Stack Height, Weight */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Drop (mm)
          </label>
          <input
            type="number"
            value={formData.drop ?? ""}
            onChange={(e) => updateField("drop", e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g., 4"
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
            Stack Height (mm)
          </label>
          <input
            type="number"
            value={formData.stackHeight ?? ""}
            onChange={(e) => updateField("stackHeight", e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g., 32"
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
            Weight (oz)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.weight ?? ""}
            onChange={(e) => updateField("weight", e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="e.g., 9.5"
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

      {/* Use Case */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Use Case (select all that apply)
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {["racing", "training", "daily", "long-runs", "speed-work"].map((option) => (
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
              <input
                type="checkbox"
                checked={(formData.useCase || []).includes(option)}
                onChange={() => toggleArrayValue("useCase", option)}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* Terrain */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Terrain (select all that apply)
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {["rocky", "muddy", "mixed", "smooth", "technical"].map((option) => (
            <label
              key={option}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                border: `1px solid ${(formData.terrain || []).includes(option) ? "var(--primary)" : "var(--border-medium)"}`,
                borderRadius: "4px",
                backgroundColor: (formData.terrain || []).includes(option) ? "var(--overlay-dark)" : "transparent",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              <input
                type="checkbox"
                checked={(formData.terrain || []).includes(option)}
                onChange={() => toggleArrayValue("terrain", option)}
              />
              {option}
            </label>
          ))}
        </div>
      </div>

      {/* Pros */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Pros *
        </label>
        {formData.pros?.map((pro, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={pro}
              onChange={(e) => updateListItem("pros", index, e.target.value)}
              placeholder="Enter a pro..."
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

      {/* Cons */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Cons *
        </label>
        {formData.cons?.map((con, index) => (
          <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              type="text"
              value={con}
              onChange={(e) => updateListItem("cons", index, e.target.value)}
              placeholder="Enter a con..."
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

      {/* Verdict */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Verdict *
        </label>
        <textarea
          value={formData.verdict}
          onChange={(e) => updateField("verdict", e.target.value)}
          rows={3}
          placeholder="One paragraph summary verdict..."
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

      {/* Rating */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Rating
        </label>
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

      {/* Full Body (Optional) */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
          Full Review (Markdown, Optional)
        </label>
        <textarea
          value={formData.body}
          onChange={(e) => updateField("body", e.target.value)}
          rows={12}
          placeholder="Optional longer-form review content in markdown..."
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
          Save Review
        </button>
      </div>
    </div>
  );
}
