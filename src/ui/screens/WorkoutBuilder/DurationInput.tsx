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
 *   - "Xhr"
 *   - "Xhr Ymin"
 *   - "Xhr Ymin Ysec"
 *   - "Xhr Ysec"
 *   - or null (if allowNull=true and all fields empty)
 *
 * Never emits numbers or partial values.
 */

interface DurationInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  allowNull?: boolean;
  allowHours?: boolean;
}

type DurationFields = {
  hours: number | "";
  minutes: number | "";
  seconds: number | "";
};

/* ------------------ helpers ------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseDuration(
  value: string | null | undefined,
  allowHours: boolean
): DurationFields {
  if (!value) return { hours: "" as "", minutes: "" as "", seconds: "" as "" };

  const raw = value.toLowerCase();

  const hrMatch = raw.match(/(\d+)\s*hr/);
  const minMatch = raw.match(/(\d+)\s*min/);
  const secMatch = raw.match(/(\d+)\s*sec/);

  let hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  let minutes = minMatch ? parseInt(minMatch[1], 10) : 0;
  let seconds = secMatch ? parseInt(secMatch[1], 10) : 0;

  // Bare number fallback ? minutes
  if (!hrMatch && !minMatch && !secMatch) {
    const bare = raw.match(/(\d+)/);
    if (bare) minutes = parseInt(bare[1], 10);
  }

  // Normalize overflow seconds
  if (seconds > 59) {
    const carry = Math.floor(seconds / 60);
    minutes += carry;
    seconds = seconds % 60;
  }

  if (!allowHours && hours > 0) {
    minutes += hours * 60;
    hours = 0;
  }

  if (allowHours && minutes > 59) {
    const carry = Math.floor(minutes / 60);
    hours += carry;
    minutes = minutes % 60;
  }

  hours = clamp(hours, 0, 99);
  minutes = clamp(minutes, 0, allowHours ? 59 : 99);
  seconds = clamp(seconds, 0, 59);

  return {
    hours: hours === 0 ? ("" as "") : hours,
    minutes: minutes === 0 ? ("" as "") : minutes,
    seconds: seconds === 0 ? ("" as "") : seconds,
  };
}

function formatDuration(
  hours: number | "",
  minutes: number | "",
  seconds: number | "",
  allowNull: boolean,
  allowHours: boolean
): string | null {
  const hasHours = allowHours && hours !== "" && hours > 0;
  const hasMin = minutes !== "" && minutes > 0;
  const hasSec = seconds !== "" && seconds > 0;

  if (!hasHours && !hasMin && !hasSec) {
    return allowNull ? null : "5min";
  }

  if (hasHours && hasMin && hasSec) return `${hours}hr ${minutes}min ${seconds}sec`;
  if (hasHours && hasMin) return `${hours}hr ${minutes}min`;
  if (hasHours && hasSec) return `${hours}hr ${seconds}sec`;
  if (hasHours) return `${hours}hr`;
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
  allowHours = false,
}: DurationInputProps) {
  const [fields, setFields] = React.useState<DurationFields>(() =>
    parseDuration(value, allowHours)
  );

  // Sync local draft ONLY when parent value changes
  React.useEffect(() => {
    setFields(parseDuration(value, allowHours));
  }, [value, allowHours]);

  // Contract: only emit formatted string or null (never numbers/partials).
  const commit = (next: DurationFields) => {
    const serialized = formatDuration(next.hours, next.minutes, next.seconds, allowNull, allowHours);
    console.log("[DurationInput onChange]", serialized);
    onChange(serialized);
  };

  const updateHours = (raw: string) => {
    if (raw === "") {
      const next = { ...fields, hours: "" as "" };
      setFields(next);
      commit(next);
      return;
    }

    const hours = clamp(parseInt(raw, 10) || 0, 0, 99);
    const next = { ...fields, hours };
    setFields(next);
    commit(next);
  };

  const updateMinutes = (raw: string) => {
    if (raw === "") {
      const next = { ...fields, minutes: "" as "" };
      setFields(next);
      commit(next);
      return;
    }

    let minutes = parseInt(raw, 10) || 0;
    let hours = fields.hours === "" ? 0 : fields.hours;

    if (allowHours && minutes > 59) {
      const carry = Math.floor(minutes / 60);
      hours = clamp(hours + carry, 0, 99);
      minutes = minutes % 60;
    }

    minutes = clamp(minutes, 0, allowHours ? 59 : 99);
    const next = { ...fields, hours: hours === 0 ? ("" as "") : hours, minutes };
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
    let hours = fields.hours === "" ? 0 : fields.hours;

    if (seconds > 59) {
      const carry = Math.floor(seconds / 60);
      minutes = minutes + carry;
      seconds = seconds % 60;
    }

    if (allowHours && minutes > 59) {
      const carry = Math.floor(minutes / 60);
      hours = clamp(hours + carry, 0, 99);
      minutes = minutes % 60;
    }

    const clampedMinutes = clamp(minutes, 0, allowHours ? 59 : 99);
    const next: DurationFields = {
      hours: hours === 0 ? ("" as "") : hours,
      minutes: clampedMinutes === 0 ? ("" as "") : clampedMinutes,
      seconds: clamp(seconds, 0, 59),
    };

    setFields(next);
    commit(next);
  };

  const showHours = allowHours;
  const labelColumns = showHours ? "1fr 1fr 1fr" : "1fr 1fr";
  const inputColumns = showHours ? "1fr auto 1fr auto 1fr" : "1fr auto 1fr";

  return (
    <div style={containerStyle}>
      <div style={{ ...labelRowStyle, gridTemplateColumns: labelColumns }}>
        {showHours && <span style={unitLabelStyle}>hr</span>}
        <span style={unitLabelStyle}>min</span>
        <span style={unitLabelStyle}>sec</span>
      </div>
      <div style={{ ...boxStyle, gridTemplateColumns: inputColumns }}>
        {showHours && (
          <>
            <input
              type="number"
              min={0}
              max={99}
              step={1}
              value={fields.hours}
              onChange={(e) => updateHours(e.target.value)}
              placeholder="0"
              disabled={disabled}
              style={inputStyle}
            />
            <div style={dividerStyle} />
          </>
        )}
        <input
          type="number"
          min={0}
          max={allowHours ? 59 : 99}
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
