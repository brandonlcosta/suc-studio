const TIME_UNITS_IN_SECONDS = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600
};

const DISTANCE_UNITS = {
  m: "m",
  meter: "m",
  meters: "m",
  km: "km",
  kilometer: "km",
  kilometers: "km",
  mi: "mi",
  mile: "mi",
  miles: "mi",
  yd: "yd",
  yard: "yd",
  yards: "yd"
};

const durationPattern =
  /^(\d+(?:\.\d+)?)(s|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|m|meter|meters|km|kilometer|kilometers|mi|mile|miles|yd|yard|yards)$/;

function formatNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  let text = String(rounded);
  if (text.includes(".")) {
    text = text.replace(/\.?0+$/, "");
  }
  return text;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }
  return `${minutes}:${pad(remainingSeconds)}`;
}

export function formatDuration(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  const match = value.trim().match(durationPattern);
  if (!match) {
    return value;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (Number.isNaN(amount)) {
    return value;
  }
  const timeUnit = TIME_UNITS_IN_SECONDS[unit];
  if (timeUnit) {
    return formatTime(amount * timeUnit);
  }
  const distanceUnit = DISTANCE_UNITS[unit];
  if (distanceUnit) {
    return `${formatNumber(amount)} ${distanceUnit}`;
  }
  return value;
}

function formatPercentValue(value) {
  const percentage = Math.round(value * 1000) / 10;
  if (Number.isInteger(percentage)) {
    return String(percentage);
  }
  return percentage.toFixed(1);
}

function formatPercentRange(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return `${formatPercentValue(low)}\u2013${formatPercentValue(high)}%`;
}

export function formatTarget(target) {
  if (!target) {
    return "";
  }
  if (target.type === "pace") {
    return target.zone ?? "";
  }
  if (target.type === "hr") {
    if (target.zone) {
      return target.zone;
    }
    const range = target.percentMax ?? [];
    if (range.length === 2) {
      return formatPercentRange(range[0], range[1]);
    }
    return "";
  }
  if (target.type === "percent") {
    const range = target.range ?? [];
    if (range.length === 2) {
      return formatPercentRange(range[0], range[1]);
    }
  }
  return "";
}

function appendNote(base, note) {
  if (!note) {
    return base;
  }
  if (!base) {
    return `(${note})`;
  }
  return `${base} (${note})`;
}

function formatIntervalCore(section) {
  const workDuration = formatDuration(section.work?.duration);
  const restDuration = formatDuration(section.rest?.duration);
  const workTarget = formatTarget(section.work?.target);
  const restTarget = formatTarget(section.rest?.target);
  const workSegment = workTarget ? `${workDuration} @ ${workTarget}` : workDuration;
  const restSegment = restTarget ? `${restDuration} ${restTarget}` : restDuration;
  return `${section.reps} \u00d7 ${workSegment} / ${restSegment}`.trim();
}

function formatIntervalSection(section) {
  const workDuration = formatDuration(section.work?.duration);
  const restDuration = formatDuration(section.rest?.duration);
  const workTarget = formatTarget(section.work?.target);
  const restTarget = formatTarget(section.rest?.target);
  const workSegment = workTarget ? `${workDuration} @ ${workTarget}` : workDuration;
  const restSegment = restTarget ? `${restDuration} ${restTarget}` : restDuration;
  const base = `${section.reps} \u00d7 (${workSegment} / ${restSegment})`.trim();
  return appendNote(base, section.label);
}

function formatProgression(section) {
  const duration = formatDuration(section.duration);
  const startTarget = formatTarget(section.startTarget ?? section.target);
  const endTarget = formatTarget(section.endTarget ?? section.target);
  const targets = startTarget && endTarget ? `${startTarget} \u2192 ${endTarget}` : "";
  const base = `${duration} progression${targets ? ` ${targets}` : ""}`.trim();
  return appendNote(base, section.label);
}

function formatSteady(section) {
  const duration = formatDuration(section.duration);
  const target = formatTarget(section.target);
  const base = target ? `${duration} @ ${target}` : duration;
  return appendNote(base, section.label);
}

function formatWarmup(section) {
  const duration = formatDuration(section.duration);
  const base = duration ? `WU ${duration}` : "WU";
  return appendNote(base, section.label);
}

function formatCooldown(section) {
  const duration = formatDuration(section.duration);
  const base = duration ? `CD ${duration}` : "CD";
  return appendNote(base, section.label);
}

function formatFree(section) {
  const duration = formatDuration(section.duration);
  const target = formatTarget(section.target);
  let base = "";
  if (duration && target) {
    base = `${duration} @ ${target}`;
  } else if (duration) {
    base = duration;
  } else if (target) {
    base = `@ ${target}`;
  }
  return appendNote(base, section.label);
}

function formatSection(section) {
  if (section.type === "interval") {
    return formatIntervalSection(section);
  }
  if (section.type === "progression") {
    return formatProgression(section);
  }
  if (section.type === "steady") {
    return formatSteady(section);
  }
  if (section.type === "warmup") {
    return formatWarmup(section);
  }
  if (section.type === "cooldown") {
    return formatCooldown(section);
  }
  if (section.type === "free") {
    return formatFree(section);
  }
  return "";
}

function intervalSignature(section) {
  return [
    section.reps,
    section.work?.duration ?? "",
    formatTarget(section.work?.target),
    section.rest?.duration ?? "",
    formatTarget(section.rest?.target),
    section.label ?? ""
  ].join("|");
}

export function formatWorkoutPreview(workout) {
  if (!workout || !Array.isArray(workout.structure)) {
    return { text: "", tokens: [] };
  }

  const tokens = [];
  const segments = [];
  let index = 0;
  while (index < workout.structure.length) {
    const section = workout.structure[index];
    if (section?.type === "interval") {
      const signature = intervalSignature(section);
      let count = 1;
      let nextIndex = index + 1;
      while (nextIndex < workout.structure.length) {
        const nextSection = workout.structure[nextIndex];
        if (nextSection?.type !== "interval") {
          break;
        }
        if (intervalSignature(nextSection) !== signature) {
          break;
        }
        count += 1;
        nextIndex += 1;
      }
      let text;
      if (count > 1) {
        const base = `${count} \u00d7 (${formatIntervalCore(section)})`;
        text = appendNote(base, section.label);
      } else {
        text = formatIntervalSection(section);
      }
      tokens.push({
        type: "interval",
        text,
        sectionIndices: Array.from({ length: count }, (_, offset) => index + offset)
      });
      segments.push(text);
      index = nextIndex;
      continue;
    }
    const text = formatSection(section);
    tokens.push({
      type: section.type ?? "unknown",
      text,
      sectionIndices: [index]
    });
    segments.push(text);
    index += 1;
  }

  return {
    text: segments.filter(Boolean).join(" \u2192 "),
    tokens
  };
}
