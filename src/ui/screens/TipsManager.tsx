import { useEffect, useState } from "react";
import { buildStudioApiUrl } from "../utils/studioApi";
import TrainingTipForm from "../components/tips/TrainingTipForm";
import FootwearReviewForm from "../components/tips/FootwearReviewForm";
import GearReviewForm from "../components/tips/GearReviewForm";
import RaceRecapForm from "../components/tips/RaceRecapForm";
import CrewRunRecapForm from "../components/tips/CrewRunRecapForm";

type ContentType = "training-tip" | "footwear-review" | "gear-review" | "race-recap" | "crew-run-recap";

type BaseContent = {
  id: string;
  topics: string[];
  tier: string;
  author: string;
  publishedAt: string;
  status?: "draft" | "published";
};

type ContentItem = BaseContent & {
  contentType: ContentType;
  title?: string;
  name?: string;
  raceName?: string;
  eventName?: string;
  brand?: string;
  model?: string;
};

const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { label: string; apiPath: string; savePath?: string; deletePath?: string; FormComponent: React.ComponentType<any> }
> = {
  "training-tip": {
    label: "Training Tip",
    apiPath: "/training-content",
    savePath: "/training-content/upsert",
    deletePath: "/training-content/archive",
    FormComponent: TrainingTipForm,
  },
  "footwear-review": {
    label: "Footwear Review",
    apiPath: "/footwear-reviews",
    deletePath: "/footwear-reviews/archive",
    FormComponent: FootwearReviewForm,
  },
  "gear-review": {
    label: "Gear Review",
    apiPath: "/gear-reviews",
    deletePath: "/gear-reviews/archive",
    FormComponent: GearReviewForm,
  },
  "race-recap": {
    label: "Race Recap",
    apiPath: "/race-recaps",
    deletePath: "/race-recaps/archive",
    FormComponent: RaceRecapForm,
  },
  "crew-run-recap": {
    label: "Crew Run Recap",
    apiPath: "/crew-run-recaps",
    deletePath: "/crew-run-recaps/archive",
    FormComponent: CrewRunRecapForm,
  },
};

export default function TipsManager() {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>("training-tip");
  const [allContent, setAllContent] = useState<Map<ContentType, any[]>>(new Map());
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showingForm, setShowingForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load all content types
  useEffect(() => {
    const loadAllContent = async () => {
      const contentMap = new Map<ContentType, any[]>();

      for (const [contentType, config] of Object.entries(CONTENT_TYPE_CONFIG)) {
        try {
    const apiUrl = buildStudioApiUrl(config.apiPath);
          const response = await fetch(apiUrl);
          if (response.ok) {
            const data = await response.json();
            const itemsWithType = (Array.isArray(data) ? data : data.items || []).map((item: any) => ({
              ...item,
              contentType,
            }));
            contentMap.set(contentType as ContentType, itemsWithType);
          }
        } catch (err) {
          console.error(`Failed to load ${contentType}:`, err);
        }
      }

      setAllContent(contentMap);
    };

    loadAllContent();
  }, []);

  const currentContent = allContent.get(selectedContentType) || [];
  const config = CONTENT_TYPE_CONFIG[selectedContentType];
  const FormComponent = config.FormComponent;

  const handleNewContent = () => {
    setSelectedItem(null);
    setShowingForm(true);
  };

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setShowingForm(true);
  };

  const handleSave = async (data: any) => {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const saveUrl = buildStudioApiUrl(config.savePath ?? config.apiPath);
      const listUrl = buildStudioApiUrl(config.apiPath);
      const response = await fetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Save failed: ${response.status}`);
      }

      // Reload content for this type
      const updatedResponse = await fetch(listUrl);
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        const itemsWithType = (Array.isArray(updatedData) ? updatedData : updatedData.items || []).map((item: any) => ({
          ...item,
          contentType: selectedContentType,
        }));

        setAllContent((prev) => {
          const next = new Map(prev);
          next.set(selectedContentType, itemsWithType);
          return next;
        });
      }

      setMessage(`${config.label} saved successfully!`);
      setShowingForm(false);
      setSelectedItem(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: ContentItem) => {
    if (!config.deletePath) return;
    if (!window.confirm(`Delete "${getDisplayName(item)}"? This cannot be undone.`)) return;

    setError(null);
    setMessage(null);

    try {
      const deleteUrl = buildStudioApiUrl(config.deletePath);
      const response = await fetch(deleteUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Delete failed: ${response.status}`);
      }

      setAllContent((prev) => {
        const next = new Map(prev);
        const items = next.get(selectedContentType) || [];
        next.set(
          selectedContentType,
          items.filter((tip: ContentItem) => tip.id !== item.id)
        );
        return next;
      });

      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
        setShowingForm(false);
      }

      setMessage(`${config.label} deleted.`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Delete failed: ${msg}`);
    }
  };

  const handleCancel = () => {
    setShowingForm(false);
    setSelectedItem(null);
  };

  const handlePublishAll = async () => {
    setError(null);
    setMessage(null);
    setIsPublishing(true);
    try {
      const apiUrl = buildStudioApiUrl("/training-content/publish");
      const response = await fetch(apiUrl, { method: "POST" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Publish failed: ${response.status}`);
      }
      setMessage("Training content published to broadcast viewer data.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Publish failed: ${msg}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const getDisplayName = (item: ContentItem): string => {
    if (item.title) return item.title;
    if (item.name) return item.name;
    if (item.raceName) return item.raceName;
    if (item.eventName) return item.eventName;
    if (item.brand && item.model) return `${item.brand} ${item.model}`;
    return item.id;
  };

  const handleExportMedia = (item: ContentItem) => {
    // Deep link to Broadcast Composer with training tip preloaded
    const broadcastUrl = import.meta.env.VITE_BROADCAST_URL || "http://localhost:5175";
    const exportUrl = `${broadcastUrl}/api/media/training-tip/${item.id}/carousel`;
    // Trigger download directly
    window.open(exportUrl, "_blank");
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
        {/* Content Type Selector */}
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-medium)" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Content Type
          </label>
          <select
            value={selectedContentType}
            onChange={(e) => {
              setSelectedContentType(e.target.value as ContentType);
              setShowingForm(false);
              setSelectedItem(null);
            }}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid var(--border-medium)",
              borderRadius: "4px",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              marginBottom: "0.75rem",
            }}
          >
            {Object.entries(CONTENT_TYPE_CONFIG).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleNewContent}
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
            New {config.label}
          </button>

          <button
            onClick={handlePublishAll}
            disabled={isPublishing}
            style={{
              width: "100%",
              marginTop: "0.5rem",
              padding: "0.6rem 0.75rem",
              backgroundColor: isPublishing ? "var(--overlay-dark)" : "transparent",
              color: isPublishing ? "var(--text-primary)" : "var(--text-secondary)",
              border: "1px solid var(--border-medium)",
              borderRadius: "6px",
              cursor: isPublishing ? "wait" : "pointer",
              fontWeight: "600",
              fontSize: "0.75rem",
            }}
          >
            {isPublishing ? "Publishing..." : "Publish Training Tips"}
          </button>
        </div>

        {/* Content List */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {currentContent.length === 0 ? (
            <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              No {config.label.toLowerCase()}s yet
            </div>
          ) : (
            currentContent.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderBottom: "1px solid var(--border-light)",
                }}
              >
                <button
                  onClick={() => handleSelectItem(item)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    backgroundColor: selectedItem?.id === item.id ? "var(--overlay-dark)" : "transparent",
                    color: selectedItem?.id === item.id ? "var(--text-primary)" : "var(--text-secondary)",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.875rem",
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{getDisplayName(item)}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                    {item.topics?.join(" > ")} - {item.status === "draft" ? "Draft" : "Published"}
                  </div>
                </button>
                {/* Export Media button for published training tips */}
                {item.contentType === "training-tip" && item.status === "published" && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleExportMedia(item);
                    }}
                    title="Export carousel slides"
                    style={{
                      padding: "0 0.5rem",
                      backgroundColor: "transparent",
                      color: "var(--primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                    }}
                  >
                    Export
                  </button>
                )}
                {config.deletePath && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteItem(item);
                    }}
                    style={{
                      padding: "0 0.75rem",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Status Messages */}
        {(message || error) && (
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid var(--border-medium)",
              backgroundColor: error ? "var(--error-bg)" : "var(--success-bg)",
            }}
          >
            <div style={{ color: error ? "var(--error)" : "var(--success)", fontSize: "0.875rem" }}>
              {error || message}
            </div>
          </div>
        )}

        {/* Form or Empty State */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {showingForm ? (
            <FormComponent
              initialData={selectedItem}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--text-secondary)",
                fontSize: "1rem",
              }}
            >
              Select an item to edit or create a new {config.label.toLowerCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
