import { useState, useCallback } from "react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export default function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".gpx")
    );

    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }

    // Reset input
    e.target.value = "";
  }, [disabled, onFilesSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? "var(--accent-green)" : "var(--border-light)"}`,
        borderRadius: "8px",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: isDragging ? "#1a2e22" : "var(--overlay-dark)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ marginBottom: "1rem", fontSize: "2rem" }}>📁</div>
      <div style={{ marginBottom: "0.5rem", fontWeight: "500", color: "var(--text-primary)" }}>
        Drop GPX files here
      </div>
      <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        or
      </div>
      <label>
        <input
          type="file"
          accept=".gpx"
          multiple
          onChange={handleFileInput}
          disabled={disabled}
          style={{ display: "none" }}
        />
        <span
          style={{
            display: "inline-block",
            padding: "0.5rem 1rem",
            backgroundColor: disabled ? "var(--border-light)" : "var(--button-bg)",
            color: "var(--text-primary)",
            borderRadius: "4px",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            border: "1px solid var(--button-border)",
          }}
        >
          Browse Files
        </span>
      </label>
    </div>
  );
}
