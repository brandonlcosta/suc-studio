import * as React from "react";

/**
 * DurationInput
 * Controlled Minutes / Seconds input that serializes to a string duration.
 *
 * Output contract (NON-NEGOTIABLE):
 * - onChange is called with:
 *   - "Xmin"
 *   - "Ysec"
 *   - "Xmin Ysec"
 *   - or null (if allowNull=true and both fields empty)
 *
 * Never emits numbers or partial values.
 */

interface DurationInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  allowNull?: boolean;
}

type DurationFields = {
  minutes: number | "";
  seconds: number | "";
};

/* ------------------ helpers ------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDuration(value: string | null | undefined): DurationFields {
  if (!value) return { minutes: "" as "", seconds: "" as "" };

  const raw = value.toLowerCase();

  const minMatch = raw.match(/(\d+)\s*min/);
  const secMatch = raw.match(/(\d+)\s*sec/);

  let minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  let seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

  // Bare number fallback ? minutes
  if (!minMatch && !secMatch) {
    const bare = raw.match(/(\d+)/);
    if (bare) minutes = parseInt(bare[1], 10);
  }

  // Normalize overflow seconds
  if (seconds > 59) {
    const carry = Math.floor(seconds / 60);
    minutes += carry;
    seconds = seconds % 60;
  }

  minutes = clamp(minutes, 0, 99);
  seconds = clamp(seconds, 0, 59);

  return {
    minutes: minutes === 0 ? ("" as "") : minutes,
    seconds: seconds === 0 ? ("" as "") : seconds,
  };
}

function formatDuration(
  minutes: number | "",
  seconds: number | "",
  allowNull: boolean
): string | null {
  const hasMin = minutes !== "" && minutes > 0;
  const hasSec = seconds !== "" && seconds > 0;

  if (!hasMin && !hasSec) {
    return allowNull ? null : "5min";
  }

  if (hasMin && hasSec) return `${minutes}min ${seconds}sec`;
  if (hasMin) return `${minutes}min`;
  return `${seconds}sec`;
}

/* ------------------ component ------------------ */

export default function DurationInput({
  value,
  onChange,
  disabled = false,
  allowNull = false,
}: DurationInputProps) {
  const [fields, setFields] = React.useState<DurationFields>(() =>
    parseDuration(value)
  );

  // Sync local draft ONLY when parent value changes
  React.useEffect(() => {
    setFields(parseDuration(value));
  }, [value]);

  // Contract: only emit formatted string or null (never numbers/partials).
  const commit = (next: DurationFields) => {
    const serialized = formatDuration(next.minutes, next.seconds, allowNull);
    console.log("[DurationInput onChange]", serialized);
    onChange(serialized);
  };

  const updateMinutes = (raw: string) => {
    if (raw === "") {
      const next = { ...fields, minutes: "" as "" };
      setFields(next);
      commit(next);
      return;
    }

    const minutes = clamp(parseInt(raw, 10) || 0, 0, 99);
    const next = { ...fields, minutes };
    setFields(next);
    commit(next);
  };

  const updateSeconds = (raw: string) => {
    if (raw === "") {
      const next = { ...fields, seconds: "" as "" };
      setFields(next);
      commit(next);
      return;
    }

    let seconds = parseInt(raw, 10) || 0;
    let minutes = fields.minutes === "" ? 0 : fields.minutes;

    if (seconds > 59) {
      const carry = Math.floor(seconds / 60);
      minutes = clamp(minutes + carry, 0, 99);
      seconds = seconds % 60;
    }

    const next: DurationFields = {
      minutes: minutes === 0 ? ("" as "") : minutes,
      seconds: clamp(seconds, 0, 59),
    };

    setFields(next);
    commit(next);
  };

  return (
    <div style={containerStyle}>
      <div style={labelRowStyle}>
        <span style={unitLabelStyle}>min</span>
        <span style={unitLabelStyle}>sec</span>
      </div>
      <div style={boxStyle}>
        <input
          type="number"
          min={0}
          max={99}
          step={1}
          value={fields.minutes}
          onChange={(e) => updateMinutes(e.target.value)}
          placeholder="0"
          disabled={disabled}
          style={inputStyle}
        />
        <div style={dividerStyle} />
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={fields.seconds}
          onChange={(e) => updateSeconds(e.target.value)}
          placeholder="0"
          disabled={disabled}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

/* ------------------ styles ------------------ */

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  alignItems: "stretch",
};

const labelRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "6px",
  textAlign: "center",
};

const boxStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  borderRadius: "8px",
  border: "1px solid var(--input-border)",
  backgroundColor: "var(--input-bg)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 6px",
  border: "none",
  backgroundColor: "transparent",
  color: "var(--text-primary)",
  fontSize: "12px",
  textAlign: "center",
  outline: "none",
};

const dividerStyle: React.CSSProperties = {
  width: "1px",
  height: "60%",
  backgroundColor: "var(--input-border)",
};

const unitLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  color: "var(--text-secondary)",
  lineHeight: 1,
};
