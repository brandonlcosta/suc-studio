import { useState } from "react";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onPathsSelected: (paths: string[]) => void;
}

export default function DropZone({
  onFilesSelected,
  onPathsSelected,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".gpx")
    );

    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleBrowseClick = async () => {
    const paths = await window.electron.invoke("open-gpx-dialog");
    if (Array.isArray(paths) && paths.length > 0) {
      onPathsSelected(paths);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? "#4CAF50" : "#ccc"}`,
        borderRadius: "8px",
        padding: "3rem",
        textAlign: "center",
        backgroundColor: isDragging ? "#f0f8f0" : "#fafafa",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <div style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
        {isDragging ? "Drop GPX files here" : "Drag & drop GPX files here"}
      </div>
      <div style={{ marginBottom: "1rem", color: "#666" }}>or</div>
      <button
        type="button"
        onClick={handleBrowseClick}
        style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#4CAF50",
          color: "white",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "500",
          border: "none",
        }}
      >
        Browse Files
      </button>
    </div>
  );
}
