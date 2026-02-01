import type { CSSProperties, MouseEventHandler } from "react";

interface ActionBarProps {
  onLibrary?: MouseEventHandler<HTMLButtonElement>;
  onDuplicate?: MouseEventHandler<HTMLButtonElement>;
  onSaveDraft?: MouseEventHandler<HTMLButtonElement>;
  onPublish?: MouseEventHandler<HTMLButtonElement>;
  onDelete?: MouseEventHandler<HTMLButtonElement>;
}

export default function ActionBar({
  onLibrary,
  onDuplicate,
  onSaveDraft,
  onPublish,
  onDelete,
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
      <div style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-primary)" }}>
        WORKOUT BUILDER
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
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
