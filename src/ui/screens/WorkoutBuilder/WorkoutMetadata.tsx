interface WorkoutMetadataProps {
  name: string | null;
  description: string | null;
  tags: string[];
  isLocked: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}

export default function WorkoutMetadata({
  name,
  description,
  tags,
  isLocked,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
}: WorkoutMetadataProps) {
  const tagsValue = tags.length > 0 ? tags.join(", ") : "";

  return (
    <section
      style={{
        border: "1px solid #2a2f3a",
        borderRadius: "14px",
        padding: "12px",
        backgroundColor: "#0f1115",
        display: "grid",
        gridTemplateColumns: "1fr 3fr",
        gap: "12px",
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={labelStyle}>Workout Name</label>
          <input
            type="text"
            value={name ?? ""}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder=""
            style={inputStyle}
            disabled={isLocked}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={labelStyle}>Tags</label>
          <input
            type="text"
            value={tagsValue}
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder=""
            style={inputStyle}
            disabled={isLocked}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description ?? ""}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder=""
          style={{ ...inputStyle, minHeight: "86px", resize: "vertical" }}
          disabled={isLocked}
        />
      </div>
    </section>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#c9c9c9",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #2b2b2b",
  backgroundColor: "#0b0b0b",
  color: "#f5f5f5",
  fontSize: "12px",
};
