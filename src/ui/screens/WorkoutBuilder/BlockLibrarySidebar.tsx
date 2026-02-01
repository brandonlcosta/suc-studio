import EffortBlockCard from "./EffortBlockCard";
import { effortBlocks } from "./effortBlocks";

export default function BlockLibrarySidebar() {
  return (
    <aside
      style={{
        width: "240px",
        borderRight: "1px solid var(--border-dark)",
        padding: "16px",
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "sticky",
        top: "16px",
        alignSelf: "flex-start",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.6px" }}>
        EFFORT BLOCKS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {effortBlocks.map((block) => (
          <EffortBlockCard key={block.id} block={block} />
        ))}
      </div>
    </aside>
  );
}
