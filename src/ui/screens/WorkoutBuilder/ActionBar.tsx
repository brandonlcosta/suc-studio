import type { CSSProperties, MouseEventHandler } from "react";
import type { WorkoutDomain } from "../../types";

interface ActionBarProps {
  onNewWorkout?: MouseEventHandler<HTMLButtonElement>;
  onLibrary?: MouseEventHandler<HTMLButtonElement>;
  onDuplicate?: MouseEventHandler<HTMLButtonElement>;
  onSaveDraft?: MouseEventHandler<HTMLButtonElement>;
  onPublish?: MouseEventHandler<HTMLButtonElement>;
  onDelete?: MouseEventHandler<HTMLButtonElement>;
  domain?: WorkoutDomain;
  onDomainChange?: (domain: WorkoutDomain) => void;
  domainLocked?: boolean;
}

export default function ActionBar({
  onNewWorkout,
  onLibrary,
  onDuplicate,
  onSaveDraft,
  onPublish,
  onDelete,
  domain,
  onDomainChange,
  domainLocked = false,
}: ActionBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 20px",
        borderBottom: "1px solid var(--border-medium)",
        backgroundColor: "var(--bg-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-primary)" }}>
          WORKOUT BUILDER
        </div>
        {domain && onDomainChange && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "4px",
              borderRadius: "999px",
              border: "1px solid var(--border-medium)",
              backgroundColor: "var(--overlay-dark)",
              opacity: domainLocked ? 0.6 : 1,
            }}
          >
            <button
              type="button"
              onClick={() => onDomainChange("run")}
              disabled={domainLocked}
              style={{
                ...toggleButtonStyle,
                backgroundColor: domain === "run" ? "var(--button-hover-bg)" : "transparent",
                color: domain === "run" ? "var(--text-primary)" : "var(--text-secondary)",
                borderColor: domain === "run" ? "var(--button-hover-border)" : "transparent",
                cursor: domainLocked ? "not-allowed" : "pointer",
              }}
            >
              Run Workout
            </button>
            <button
              type="button"
              onClick={() => onDomainChange("strength")}
              disabled={domainLocked}
              style={{
                ...toggleButtonStyle,
                backgroundColor: domain === "strength" ? "var(--button-hover-bg)" : "transparent",
                color: domain === "strength" ? "var(--text-primary)" : "var(--text-secondary)",
                borderColor: domain === "strength" ? "var(--button-hover-border)" : "transparent",
                cursor: domainLocked ? "not-allowed" : "pointer",
              }}
            >
              Strength Workout
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          type="button"
          onClick={onNewWorkout}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          New Workout
        </button>
        <button
          type="button"
          onClick={onLibrary}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          Library
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onSaveDraft}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={onPublish}
          style={buttonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          Publish
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{
            ...buttonStyle,
            borderColor: "var(--button-border)",
            color: "var(--text-secondary)",
            fontSize: "12px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--button-hover-border)";
            e.currentTarget.style.backgroundColor = "var(--button-hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--button-border)";
            e.currentTarget.style.backgroundColor = "var(--button-bg)";
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid var(--button-border)",
  backgroundColor: "var(--button-bg)",
  color: "var(--text-primary)",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.2px",
  cursor: "pointer",
  transition: "border-color 0.15s ease, background-color 0.15s ease",
};

const toggleButtonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: "999px",
  border: "1px solid transparent",
  backgroundColor: "transparent",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.3px",
  cursor: "pointer",
};
