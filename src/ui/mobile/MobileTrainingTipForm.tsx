import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildStudioApiUrl } from "../utils/studioApi";

const PRIMARY_TOPICS = ["training", "fueling", "gear", "recovery", "injury-prevention", "strategy"];

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
    maxWidth: "500px",
    margin: "0 auto",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#999",
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    background: "#1a1f28",
    color: "#f5f5f5",
    outline: "none",
  },
  textarea: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    background: "#1a1f28",
    color: "#f5f5f5",
    outline: "none",
    resize: "vertical" as const,
    minHeight: "100px",
  },
  select: {
    padding: "0.75rem",
    fontSize: "1rem",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    background: "#1a1f28",
    color: "#f5f5f5",
    outline: "none",
  },
  button: {
    padding: "1rem",
    fontSize: "1rem",
    fontWeight: 600,
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  primaryButton: {
    background: "#3b82f6",
    color: "white",
  },
  secondaryButton: {
    background: "transparent",
    border: "1px solid #2a2a2a",
    color: "#999",
  },
  error: {
    color: "#ef4444",
    fontSize: "0.875rem",
    padding: "0.75rem",
    background: "rgba(239, 68, 68, 0.1)",
    borderRadius: "8px",
  },
  success: {
    color: "#22c55e",
    fontSize: "0.875rem",
    padding: "0.75rem",
    background: "rgba(34, 197, 94, 0.1)",
    borderRadius: "8px",
  },
  loading: {
    textAlign: "center" as const,
    padding: "2rem",
    color: "#999",
  },
};

type FormData = {
  title: string;
  summary: string;
  body: string;
  topics: string[];
  author: string;
};

export default function MobileTrainingTipForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    summary: "",
    body: "",
    topics: [],
    author: "Coach Brandon",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing draft if editing
  useEffect(() => {
    if (!id) return;

    const loadDraft = async () => {
      setIsLoading(true);
      try {
        const url = buildStudioApiUrl(`/drafts/training-content/${id}`);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Draft not found");
        }
        const draft = await response.json();
        setFormData({
          title: draft.data.title || "",
          summary: draft.data.summary || "",
          body: draft.data.body || "",
          topics: draft.data.topics || [],
          author: draft.data.author || "Coach Brandon",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load draft");
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [id]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!formData.summary.trim()) {
      setError("Summary is required");
      return;
    }
    if (formData.topics.length === 0) {
      setError("Please select a topic");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        id: id || `tip-${Date.now()}`,
        type: "training-tip",
        title: formData.title.trim(),
        summary: formData.summary.trim(),
        body: formData.body.trim(),
        topics: formData.topics,
        tier: "team",
        author: formData.author,
        status: "draft",
      };

      const url = isEditing
        ? buildStudioApiUrl(`/drafts/training-content/${id}`)
        : buildStudioApiUrl("/drafts/training-content?source=mobile");

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? payload : payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save draft");
      }

      setSuccess("Draft saved!");
      setTimeout(() => {
        navigate("/mobile/drafts");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={styles.loading}>Loading draft...</div>;
  }

  return (
    <div style={styles.container}>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Enter a catchy title"
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Summary *</label>
        <textarea
          value={formData.summary}
          onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
          placeholder="Brief description of the tip"
          style={{ ...styles.textarea, minHeight: "80px" }}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Topic *</label>
        <select
          value={formData.topics[0] || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, topics: e.target.value ? [e.target.value] : [] }))}
          style={styles.select}
        >
          <option value="">Select a topic</option>
          {PRIMARY_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Content (optional)</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
          placeholder="Full content in Markdown (can be added later on desktop)"
          style={{ ...styles.textarea, minHeight: "150px" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSaving}
        style={{
          ...styles.button,
          ...styles.primaryButton,
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        {isSaving ? "Saving..." : isEditing ? "Update Draft" : "Save Draft"}
      </button>

      <button
        onClick={() => navigate("/mobile")}
        style={{ ...styles.button, ...styles.secondaryButton }}
      >
        Cancel
      </button>
    </div>
  );
}
