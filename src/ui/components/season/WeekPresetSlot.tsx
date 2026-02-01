import type { CSSProperties, ReactNode } from "react";
import { Flame, Layers, Target, Zap } from "lucide-react";
import type { WeekInstance } from "../../../season";

const focusColor: Record<string, string> = {
  base: "#3b82f6",
  deload: "#94a3b8",
  speed: "#22d3ee",
  "hill-power": "#f97316",
  mileage: "#22c55e",
  ultra: "#a855f7",
  heat: "#ef4444",
  taper: "#facc15",
  none: "#4b5563",
};

const intensityColor: Record<WeekInstance["stress"], string> = {
  "low": "#94a3b8",
  "low-med": "#93c5fd",
  "med": "#60a5fa",
  "med-high": "#f59e0b",
  "high": "#f97316",
  "very-high": "#ef4444",
};

const FOCUS_OPTIONS: Array<WeekInstance["focus"]> = [
  "base",
  "deload",
  "speed",
  "hill-power",
  "mileage",
  "ultra",
  "heat",
  "taper",
  null,
];

const INTENSITY_OPTIONS: Array<WeekInstance["stress"]> = [
  "low",
  "low-med",
  "med",
  "med-high",
  "high",
  "very-high",
];

type WeekPresetSlotProps = {
  label: string | null;
  isDragActive: boolean;
  isTargeted: boolean;
  dragLabel: string | null;
  focus: WeekInstance["focus"];
  stress: WeekInstance["stress"];
  volume: WeekInstance["volume"];
  intensity: WeekInstance["intensity"];
  onUpdate: (patch: Partial<WeekInstance>) => void;
  onFocusChange: (nextFocus: WeekInstance["focus"]) => void;
};

type MetricPillProps = {
  title: string;
  value: string;
  color: string;
  icon: ReactNode;
  children?: ReactNode;
};

function MetricPill({ title, value, color, icon, children }: MetricPillProps) {
  return (
    <div style={{ ...pillStyle, borderColor: color, color }}>
      <div style={labelRowStyle}>
        {icon}
        <span style={{ fontSize: "0.42rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>
          {title}
        </span>
      </div>
      <div style={valueRowStyle}>
        <span style={{ fontSize: "0.58rem", fontWeight: 600, lineHeight: 1.1 }}>{value}</span>
        <span style={chevronStyle}>v</span>
        {children}
      </div>
    </div>
  );
}

export default function WeekPresetSlot({
  label,
  isDragActive,
  isTargeted,
  dragLabel,
  focus,
  stress,
  volume,
  intensity,
  onUpdate,
  onFocusChange,
}: WeekPresetSlotProps) {
  const displayLabel = isTargeted && dragLabel ? dragLabel : label ?? "Drop preset";
  const focusColorValue = focus ? focusColor[focus] ?? focusColor.none : focusColor.none;

  return (
    <div
      style={{
        ...slotStyle,
        borderStyle: label ? "solid" : "dashed",
        borderColor: isTargeted ? "#60a5fa" : "#334155",
        backgroundColor: isTargeted ? "rgba(37, 99, 235, 0.12)" : "#0b1220",
        color: label ? "#e5e7eb" : "#94a3b8",
        boxShadow: isDragActive && !isTargeted ? "0 0 0 1px #1f2937 inset" : "none",
      }}
    >
      <div style={{ display: "grid", gap: "0.2rem" }}>
        <div style={{ display: "grid", gap: "0.1rem" }}>
          <div style={{ fontSize: "0.48rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Preset</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: label ? focusColorValue : "#94a3b8" }}>
            {displayLabel}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.18rem" }}>
          <MetricPill
            title="Focus"
            value={focus ?? "-"}
            color={focusColorValue}
            icon={<Target size={9} style={iconStyle} />}
          >
            <select
              value={focus ?? ""}
              onChange={(event) => onFocusChange(event.target.value === "" ? null : (event.target.value as WeekInstance["focus"]))}
              style={selectOverlayStyle}
            >
              <option value="">None</option>
              {FOCUS_OPTIONS.filter((option) => option !== null).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </MetricPill>
          <MetricPill
            title="Stress"
            value={stress ?? "-"}
            color={intensityColor[stress]}
            icon={<Zap size={9} style={iconStyle} />}
          >
            <select
              value={stress}
              onChange={(event) => onUpdate({ stress: event.target.value as WeekInstance["stress"] })}
              style={selectOverlayStyle}
            >
              {INTENSITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </MetricPill>
          <MetricPill
            title="Volume"
            value={volume ?? "-"}
            color={intensityColor[volume]}
            icon={<Layers size={9} style={iconStyle} />}
          >
            <select
              value={volume}
              onChange={(event) => onUpdate({ volume: event.target.value as WeekInstance["volume"] })}
              style={selectOverlayStyle}
            >
              {INTENSITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </MetricPill>
          <MetricPill
            title="Intensity"
            value={intensity ?? "-"}
            color={intensityColor[intensity]}
            icon={<Flame size={9} style={iconStyle} />}
          >
            <select
              value={intensity}
              onChange={(event) => onUpdate({ intensity: event.target.value as WeekInstance["intensity"] })}
              style={selectOverlayStyle}
            >
              {INTENSITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </MetricPill>
        </div>
      </div>
    </div>
  );
}

const slotStyle: CSSProperties = {
  minWidth: "120px",
  padding: "0.32rem 0.42rem",
  borderRadius: "7px",
  border: "1px solid #334155",
  display: "grid",
  gap: "0.12rem",
  alignContent: "center",
};

const pillStyle: CSSProperties = {
  minWidth: "52px",
  padding: "0.14rem 0.24rem",
  borderRadius: "5px",
  border: "1px solid",
  backgroundColor: "rgba(15, 23, 42, 0.7)",
  textAlign: "left",
  lineHeight: 1.1,
  display: "grid",
  gap: "0.08rem",
  position: "relative",
};

const labelRowStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.18rem",
};

const valueRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "0.18rem",
  position: "relative",
};

const chevronStyle: CSSProperties = {
  fontSize: "0.5rem",
  opacity: 0.7,
  lineHeight: 1,
};

const iconStyle: CSSProperties = {
  opacity: 0.7,
};

const selectOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0,
  cursor: "pointer",
};
