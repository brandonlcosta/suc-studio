const workoutListEl = document.getElementById("workout-list");
const timelineListEl = document.getElementById("timeline-list");
const timelineEmptyEl = document.getElementById("timeline-empty");
const inspectorFormEl = document.getElementById("inspector-form");
const inspectorEmptyEl = document.getElementById("inspector-empty");
const validationErrorsEl = document.getElementById("validation-errors");
const saveButton = document.getElementById("save-workouts");
const saveStatusEl = document.getElementById("save-status");
const sectionTypeSelect = document.getElementById("section-type");
const addSectionButton = document.getElementById("add-section");
const newWorkoutButton = document.getElementById("new-workout");
const workoutSortSelect = document.getElementById("workout-sort");
const commandRepsUp = document.getElementById("command-reps-up");
const commandRepsDown = document.getElementById("command-reps-down");
const commandExtendFive = document.getElementById("command-extend-5");
const commandExtendTen = document.getElementById("command-extend-10");
const commandExtendWarmCool = document.getElementById("command-extend-warmcool");
const commandAddStrides = document.getElementById("command-add-strides");

let workouts = [];
let selectedWorkoutId = null;
let selectedSectionIndex = null;
let expandedSections = new Set();
let validationErrorsByWorkoutId = {};
let validationTimer = null;
let workoutMetaById = {};
let workoutSortMode = "modified";
let historyPast = [];
let historyFuture = [];
let isRestoringHistory = false;
const durationPattern =
  /^\d+(\.\d+)?(s|sec|secs|second|seconds|min|mins|minute|minutes|hr|hrs|hour|hours|m|meter|meters|km|kilometer|kilometers|mi|mile|miles|yd|yard|yards)$/;
const defaultAthleteProfile = {
  athleteId: "athlete-demo",
  preferredUnits: "mi",
  hr: {
    max: 190,
    zones: {
      Z1: [0.5, 0.6],
      Z2: [0.6, 0.7],
      Z3: [0.7, 0.8],
      Z4: [0.8, 0.9],
      Z5: [0.9, 1.0]
    }
  },
  pace: {
    threshold: "6:30/mi",
    zones: {
      Z1: "9:30-10:30/mi",
      Z2: "8:15-9:00/mi",
      Z3: "7:30-8:00/mi",
      Z4: "6:45-7:15/mi",
      Z5: "6:00-6:30/mi"
    }
  }
};

function clamp01(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function recordHistory() {
  if (isRestoringHistory) return;
  historyPast.push({
    workouts: deepClone(workouts),
    selectedWorkoutId,
    selectedSectionIndex,
    workoutMetaById: deepClone(workoutMetaById)
  });
  if (historyPast.length > 60) {
    historyPast.shift();
  }
  historyFuture = [];
}

function restoreHistory(entry) {
  isRestoringHistory = true;
  workouts = deepClone(entry.workouts);
  selectedWorkoutId = entry.selectedWorkoutId ?? workouts[0]?.workoutId ?? null;
  selectedSectionIndex = entry.selectedSectionIndex ?? null;
  workoutMetaById = deepClone(entry.workoutMetaById ?? {});
  isRestoringHistory = false;
  scheduleValidation();
  render();
}

function undo() {
  if (historyPast.length === 0) return;
  historyFuture.push({
    workouts: deepClone(workouts),
    selectedWorkoutId,
    selectedSectionIndex,
    workoutMetaById: deepClone(workoutMetaById)
  });
  const entry = historyPast.pop();
  restoreHistory(entry);
}

function redo() {
  if (historyFuture.length === 0) return;
  historyPast.push({
    workouts: deepClone(workouts),
    selectedWorkoutId,
    selectedSectionIndex,
    workoutMetaById: deepClone(workoutMetaById)
  });
  const entry = historyFuture.pop();
  restoreHistory(entry);
}

function buildDefaultTarget(type) {
  if (type === "hr") {
    return { type: "hr", percentMax: [0.6, 0.75], zone: "Z2" };
  }
  if (type === "percent") {
    return { type: "percent", range: [0.6, 0.75] };
  }
  return { type: "pace", zone: "Z2" };
}

function buildDefaultSection(sectionType) {
  if (sectionType === "warmup") {
    return {
      type: "warmup",
      duration: "12min",
      target: { type: "pace", zone: "Z1" },
      cues: [],
      label: ""
    };
  }
  if (sectionType === "cooldown") {
    return {
      type: "cooldown",
      duration: "10min",
      target: { type: "pace", zone: "Z1" },
      cues: [],
      label: ""
    };
  }
  if (sectionType === "steady") {
    return {
      type: "steady",
      duration: "20min",
      target: { type: "pace", zone: "Z3" },
      cues: [],
      label: ""
    };
  }
  if (sectionType === "interval") {
    return {
      type: "interval",
      reps: 6,
      work: { duration: "2min", target: { type: "pace", zone: "Z4" }, cues: [] },
      rest: { duration: "1min", target: { type: "pace", zone: "Z1" }, cues: [] },
      cues: [],
      label: ""
    };
  }
  if (sectionType === "progression") {
    return {
      type: "progression",
      duration: "30min",
      target: { type: "percent", range: [0.65, 0.8] },
      cues: [],
      label: ""
    };
  }
  const targetType = sectionType === "free" ? "pace" : "pace";
  return {
    type: sectionType,
    duration: "10min",
    target: buildDefaultTarget(targetType),
    cues: [],
    label: ""
  };
}

function parseCueFields(cues) {
  const fields = { execution: "", mental: "", form: "" };
  if (!Array.isArray(cues)) {
    return fields;
  }
  cues.forEach((cue) => {
    const text = String(cue);
    if (text.toLowerCase().startsWith("execution:")) {
      fields.execution = text.split(":").slice(1).join(":").trim();
    } else if (text.toLowerCase().startsWith("mental:")) {
      fields.mental = text.split(":").slice(1).join(":").trim();
    } else if (text.toLowerCase().startsWith("form:")) {
      fields.form = text.split(":").slice(1).join(":").trim();
    }
  });
  return fields;
}

function buildCuesFromFields(fields) {
  const cues = [];
  if (fields.execution) cues.push(`execution: ${fields.execution}`);
  if (fields.mental) cues.push(`mental: ${fields.mental}`);
  if (fields.form) cues.push(`form: ${fields.form}`);
  return cues;
}

function parseDurationToMinutes(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)([a-z]+)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(unit)) {
    return amount / 60;
  }
  if (["min", "mins", "minute", "minutes"].includes(unit)) {
    return amount;
  }
  if (["hr", "hrs", "hour", "hours"].includes(unit)) {
    return amount * 60;
  }
  return null;
}

function formatMinutes(value) {
  const rounded = Math.max(0, value);
  const display = Number.isInteger(rounded) ? rounded : Number(rounded.toFixed(1));
  return `${display}min`;
}

function getWorkoutMeta(workoutId) {
  if (!workoutMetaById[workoutId]) {
    workoutMetaById[workoutId] = { tags: [], lastModified: Date.now() };
  }
  return workoutMetaById[workoutId];
}

function touchWorkout(workoutId) {
  if (isRestoringHistory) return;
  const meta = getWorkoutMeta(workoutId);
  meta.lastModified = Date.now();
}

function getIntensityScoreFromTarget(target) {
  if (!target) return 2;
  const zone = String(target.zone ?? "").toUpperCase();
  const zoneMatch = zone.match(/Z(\d)/);
  if (zoneMatch) {
    return Number(zoneMatch[1]) || 2;
  }
  if (target.type === "percent") {
    const avg = (target.range?.[0] ?? 0.6) + (target.range?.[1] ?? 0.75);
    const percent = avg / 2;
    if (percent < 0.65) return 1;
    if (percent < 0.75) return 2;
    if (percent < 0.85) return 3;
    if (percent < 0.93) return 4;
    return 5;
  }
  if (target.type === "hr") {
    const avg = (target.percentMax?.[0] ?? 0.6) + (target.percentMax?.[1] ?? 0.8);
    const percent = avg / 2;
    if (percent < 0.65) return 1;
    if (percent < 0.75) return 2;
    if (percent < 0.85) return 3;
    if (percent < 0.93) return 4;
    return 5;
  }
  return 2;
}

function getSectionIntensity(section) {
  if (section.type === "interval") {
    return getIntensityScoreFromTarget(section.work?.target);
  }
  return getIntensityScoreFromTarget(section.target);
}

function getSectionDurationMinutes(section) {
  if (section.type === "interval") {
    const work = parseDurationToMinutes(section.work?.duration);
    const rest = parseDurationToMinutes(section.rest?.duration);
    if (work == null || rest == null) return null;
    return (work + rest) * (section.reps ?? 1);
  }
  return parseDurationToMinutes(section.duration);
}

function getWorkoutDurationMinutes(workout) {
  return workout.structure.reduce((sum, section) => {
    const minutes = getSectionDurationMinutes(section);
    return sum + (minutes ?? 0);
  }, 0);
}

function getWorkoutIntensity(workout) {
  if (!workout.structure.length) return 0;
  const total = workout.structure.reduce((sum, section) => sum + getSectionIntensity(section), 0);
  return total / workout.structure.length;
}

function buildStridesSection() {
  return {
    type: "interval",
    reps: 6,
    work: { duration: "20sec", target: { type: "pace", zone: "Z5" }, cues: [] },
    rest: { duration: "40sec", target: { type: "pace", zone: "Z1" }, cues: [] },
    cues: [],
    label: "Strides"
  };
}

function targetSummary(target) {
  if (!target) {
    return "No target";
  }
  if (target.type === "pace") {
    return `Pace ${target.zone ?? "zone"}`;
  }
  if (target.type === "hr") {
    const range = target.percentMax ?? [];
    return `HR ${(range[0] ?? "-")}-${(range[1] ?? "-")} max`;
  }
  if (target.type === "percent") {
    const range = target.range ?? [];
    return `Percent ${(range[0] ?? "-")}-${(range[1] ?? "-")}`;
  }
  return "Target";
}

function setStatus(message, variant = "info") {
  saveStatusEl.textContent = message;
  saveStatusEl.dataset.variant = variant;
}

function setTpExportStatus(message) {
  tpExportStatusEl.textContent = message;
}

function getAthleteProfileInput() {
  try {
    const parsed = JSON.parse(tpAthleteProfileEl.value || "{}");
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Athlete profile must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid athlete profile JSON.";
    throw new Error(message);
  }
}

async function previewTrainingPeaksExport() {
  const workout = getSelectedWorkout();
  if (!workout) {
    setTpExportStatus("Select a workout to export.");
    return;
  }
  clearTpExportPreview();
  setTpExportStatus("Generating export...");
  let athleteProfile;
  try {
    athleteProfile = getAthleteProfileInput();
  } catch (error) {
    setTpExportStatus(error instanceof Error ? error.message : "Invalid athlete profile.");
    return;
  }

  const response = await fetch("/api/workouts/export/trainingpeaks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workout, athlete: athleteProfile })
  });

  const data = await response.json();
  if (!response.ok) {
    setTpExportStatus(data.error || "Export failed.");
    return;
  }

  tpExportPayload = data.workout ?? null;
  tpExportPreviewOutputEl.value = JSON.stringify(tpExportPayload, null, 2);
  tpExportDownloadButton.disabled = !tpExportPayload;
  setTpExportStatus("Export ready.");
}

function downloadTrainingPeaksExport() {
  if (!tpExportPayload) {
    setTpExportStatus("Generate an export first.");
    return;
  }
  const workout = getSelectedWorkout();
  const filename = `${workout?.workoutId || "workout"}-trainingpeaks.json`;
  const blob = new Blob([JSON.stringify(tpExportPayload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setTpExportStatus("Download started.");
}

async function fetchWorkouts() {
  const response = await fetch("/api/workouts");
  const data = await response.json();
  workouts = Array.isArray(data.workouts) ? data.workouts : [];
  const now = Date.now();
  workoutMetaById = {};
  workouts.forEach((workout, index) => {
    workoutMetaById[workout.workoutId] = {
      tags: [],
      lastModified: now - index * 1000
    };
  });
  if (workouts.length > 0) {
    selectedWorkoutId = workouts[0].workoutId;
  }
  scheduleValidation();
  render();
}

function selectWorkout(id) {
  selectedWorkoutId = id;
  selectedSectionIndex = null;
  expandedSections = new Set();
  clearTpExportPreview();
  render();
}

function getSelectedWorkout() {
  return workouts.find((workout) => workout.workoutId === selectedWorkoutId);
}

function updateWorkout(updatedWorkout) {
  recordHistory();
  workouts = workouts.map((workout) =>
    workout.workoutId === updatedWorkout.workoutId ? updatedWorkout : workout
  );
  touchWorkout(updatedWorkout.workoutId);
  scheduleValidation();
  render();
}

function updateSection(index, updater) {
  const workout = getSelectedWorkout();
  if (!workout) return;
  const updatedStructure = workout.structure.map((section, idx) =>
    idx === index ? updater(section) : section
  );
  updateWorkout({ ...workout, structure: updatedStructure });
}

function scheduleValidation() {
  if (validationTimer) {
    window.clearTimeout(validationTimer);
  }
  validationTimer = window.setTimeout(() => {
    validateWorkouts();
  }, 200);
}

async function validateWorkouts() {
  const response = await fetch("/api/workouts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workouts })
  });
  const data = await response.json();
  validationErrorsByWorkoutId = data.errorsById ?? {};
  renderValidation();
  renderSaveState();
}

function renderSaveState() {
  const hasErrors = Object.keys(validationErrorsByWorkoutId).length > 0;
  saveButton.disabled = hasErrors;
  if (hasErrors) {
    setStatus("Resolve validation errors before saving.", "error");
  } else {
    setStatus("");
  }
}

function clearTpExportPreview() {
  tpExportPayload = null;
  tpExportPreviewOutputEl.value = "";
  tpExportDownloadButton.disabled = true;
  setTpExportStatus("");
}

function renderValidation() {
  const workout = getSelectedWorkout();
  const errors = workout ? validationErrorsByWorkoutId[workout.workoutId] : [];
  validationErrorsEl.innerHTML = "";
  if (!errors || errors.length === 0) {
    validationErrorsEl.innerHTML = "<li>All sections are schema-valid.</li>";
    validationErrorsEl.style.color = "#047857";
    return;
  }
  validationErrorsEl.style.color = "#b91c1c";
  errors.forEach((error) => {
    const li = document.createElement("li");
    li.textContent = error;
    validationErrorsEl.appendChild(li);
  });
}

function renderWorkoutList() {
  workoutListEl.innerHTML = "";
  const sortedWorkouts = [...workouts].sort((a, b) => {
    if (workoutSortMode === "duration") {
      return getWorkoutDurationMinutes(b) - getWorkoutDurationMinutes(a);
    }
    if (workoutSortMode === "intensity") {
      return getWorkoutIntensity(b) - getWorkoutIntensity(a);
    }
    return getWorkoutMeta(b.workoutId).lastModified - getWorkoutMeta(a.workoutId).lastModified;
  });
  sortedWorkouts.forEach((workout) => {
    const item = document.createElement("li");
    item.className = "workout-item";
    if (workout.workoutId === selectedWorkoutId) {
      item.classList.add("active");
    }
    const titleInput = document.createElement("input");
    titleInput.value = workout.name || "Untitled workout";
    titleInput.addEventListener("input", (event) => {
      const value = event.target.value.trim();
      updateWorkout({ ...workout, name: value || "Untitled workout" });
    });
    const subtitle = document.createElement("span");
    subtitle.className = "timeline-meta";
    const duration = getWorkoutDurationMinutes(workout);
    const intensity = getWorkoutIntensity(workout).toFixed(1);
    subtitle.textContent = `${workout.workoutId} · ${formatMinutes(duration)} · Intensity ${intensity}`;
    const tagsWrapper = document.createElement("div");
    tagsWrapper.className = "workout-tags";
    const tagsLabel = document.createElement("span");
    tagsLabel.className = "timeline-meta";
    tagsLabel.textContent = "Tags";
    const tagsInput = document.createElement("input");
    tagsInput.placeholder = "tempo, hills, long run";
    tagsInput.value = getWorkoutMeta(workout.workoutId).tags.join(", ");
    tagsInput.addEventListener("input", (event) => {
      const value = event.target.value;
      workoutMetaById[workout.workoutId].tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      touchWorkout(workout.workoutId);
      renderWorkoutList();
    });
    tagsWrapper.append(tagsLabel, tagsInput);
    const actions = document.createElement("div");
    actions.className = "workout-actions";
    const selectButton = document.createElement("button");
    selectButton.textContent = "Edit";
    selectButton.addEventListener("click", () => selectWorkout(workout.workoutId));
    const duplicateButton = document.createElement("button");
    duplicateButton.textContent = "Duplicate";
    duplicateButton.addEventListener("click", () => duplicateWorkout(workout));
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteWorkout(workout.workoutId));
    actions.append(selectButton, duplicateButton, deleteButton);
    item.append(titleInput, subtitle, tagsWrapper, actions);
    workoutListEl.appendChild(item);
  });
}

function renderTimeline() {
  const workout = getSelectedWorkout();
  timelineListEl.innerHTML = "";
  if (!workout) {
    timelineEmptyEl.style.display = "block";
    return;
  }
  timelineEmptyEl.style.display = "none";
  workout.structure.forEach((section, index) => {
    const item = document.createElement("li");
    item.className = "timeline-item";
    item.setAttribute("draggable", "true");
    item.style.setProperty("--intensity", String(getSectionIntensity(section)));
    if (index === selectedSectionIndex) {
      item.classList.add("selected");
    }
    if (item.classList.contains("dragging")) {
      item.classList.remove("dragging");
    }

    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", String(index));
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
      reorderSection(fromIndex, index);
    });

    item.addEventListener("click", () => {
      selectedSectionIndex = index;
      render();
    });

    const header = document.createElement("div");
    header.className = "timeline-row";
    const label = document.createElement("strong");
    label.textContent = `${section.type.toUpperCase()}${section.label ? ` — ${section.label}` : ""}`;
    const meta = document.createElement("span");
    meta.className = "timeline-meta";
    if (section.type === "interval") {
      meta.textContent = `${section.reps}x ${section.work.duration} / ${section.rest.duration}`;
    } else if (section.duration) {
      meta.textContent = section.duration;
    } else {
      meta.textContent = "Open duration";
    }
    header.append(label, meta);

    const targetRow = document.createElement("div");
    targetRow.className = "timeline-row";
    const targetText = document.createElement("span");
    targetText.className = "target-badge";
    targetText.textContent = section.type === "interval" ? "Interval set" : targetSummary(section.target);
    const actions = document.createElement("div");
    actions.className = "timeline-actions-inline";
    const convertOptions = getConversionOptions(section.type);
    if (convertOptions.length > 0) {
      const convertSelect = document.createElement("select");
      convertSelect.className = "convert-select";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Convert";
      convertSelect.appendChild(placeholder);
      convertOptions.forEach((option) => {
        const entry = document.createElement("option");
        entry.value = option.value;
        entry.textContent = option.label;
        convertSelect.appendChild(entry);
      });
      convertSelect.value = "";
      convertSelect.addEventListener("click", (event) => event.stopPropagation());
      convertSelect.addEventListener("change", (event) => {
        event.stopPropagation();
        const value = event.target.value;
        if (value) {
          convertSection(index, value);
        }
        event.target.value = "";
      });
      actions.appendChild(convertSelect);
    }
    const expandButton = document.createElement("button");
    expandButton.textContent = expandedSections.has(index) ? "Collapse" : "Expand";
    expandButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleExpanded(index);
    });
    const duplicateButton = document.createElement("button");
    duplicateButton.textContent = "Duplicate";
    duplicateButton.addEventListener("click", (event) => {
      event.stopPropagation();
      duplicateSection(index);
    });
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSection(index);
    });
    actions.append(expandButton, duplicateButton, deleteButton);
    targetRow.append(targetText, actions);

    item.append(header, targetRow);

    if (section.type === "interval" && expandedSections.has(index)) {
      const details = document.createElement("div");
      details.className = "interval-details";
      details.innerHTML = `
        <div><strong>Work:</strong> ${escapeHtml(section.work.duration)} · ${escapeHtml(
        targetSummary(section.work.target)
      )}</div>
        <div><strong>Rest:</strong> ${escapeHtml(section.rest.duration)} · ${escapeHtml(
        targetSummary(section.rest.target)
      )}</div>
      `;
      item.appendChild(details);
    }

    timelineListEl.appendChild(item);
  });
}

function renderInspector() {
  const workout = getSelectedWorkout();
  const section = workout ? workout.structure[selectedSectionIndex] : null;
  inspectorFormEl.innerHTML = "";
  if (!section) {
    inspectorEmptyEl.style.display = "block";
    inspectorFormEl.style.display = "none";
    return;
  }
  inspectorEmptyEl.style.display = "none";
  inspectorFormEl.style.display = "flex";

  const headerGroup = document.createElement("div");
  headerGroup.className = "form-group";
  headerGroup.innerHTML = `
    <label>Section type</label>
    <input type="text" value="${escapeHtml(section.type)}" disabled />
  `;
  inspectorFormEl.appendChild(headerGroup);

  const labelGroup = document.createElement("div");
  labelGroup.className = "form-group";
  const labelInput = document.createElement("input");
  labelInput.value = section.label ?? "";
  labelInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    updateSection(selectedSectionIndex, (current) => ({ ...current, label: value || undefined }));
  });
  labelGroup.innerHTML = "<label>Optional label</label>";
  labelGroup.appendChild(labelInput);
  inspectorFormEl.appendChild(labelGroup);

  if (section.type !== "interval") {
    renderDurationGroup(section, section.type === "free");
    renderTargetEditor(section, "target", section.target, (target) => {
      updateSection(selectedSectionIndex, (current) => ({ ...current, target }));
    });
  }

  if (section.type === "interval") {
    const repsGroup = document.createElement("div");
    repsGroup.className = "form-group";
    repsGroup.innerHTML = "<label>Repetitions</label>";
    const repsInput = document.createElement("input");
    repsInput.type = "number";
    repsInput.min = "1";
    repsInput.value = section.reps ?? 1;
    repsInput.addEventListener("input", (event) => {
      const value = Math.max(1, Number(event.target.value || 1));
      updateSection(selectedSectionIndex, (current) => ({ ...current, reps: value }));
    });
    repsGroup.appendChild(repsInput);
    inspectorFormEl.appendChild(repsGroup);

    renderIntervalBlockEditor(section, "work", "Work block");
    renderIntervalBlockEditor(section, "rest", "Rest block");
  }

  renderCuesEditor(section, (cues) => {
    updateSection(selectedSectionIndex, (current) => ({ ...current, cues }));
  });
}

function getConversionOptions(type) {
  if (type === "steady") {
    return [
      { value: "progression", label: "→ Progression" },
      { value: "interval", label: "→ Interval" }
    ];
  }
  if (type === "progression") {
    return [{ value: "steady", label: "→ Steady" }];
  }
  if (type === "interval") {
    return [{ value: "steady", label: "→ Steady" }];
  }
  return [];
}

function convertSection(index, newType) {
  updateSection(index, (current) => {
    if (current.type === newType) return current;
    if (current.type === "interval" && newType === "steady") {
      const totalMinutes = getSectionDurationMinutes(current);
      return {
        type: "steady",
        duration: totalMinutes ? formatMinutes(totalMinutes) : "20min",
        target: current.work?.target ?? { type: "pace", zone: "Z3" },
        cues: current.cues ?? [],
        label: current.label ?? ""
      };
    }
    if (current.type === "progression" && newType === "steady") {
      return {
        type: "steady",
        duration: current.duration ?? "20min",
        target: { type: "pace", zone: "Z3" },
        cues: current.cues ?? [],
        label: current.label ?? ""
      };
    }
    if (current.type === "steady" && newType === "progression") {
      return {
        type: "progression",
        duration: current.duration ?? "30min",
        target: { type: "percent", range: [0.65, 0.8] },
        cues: current.cues ?? [],
        label: current.label ?? ""
      };
    }
    if (current.type === "steady" && newType === "interval") {
      const base = buildDefaultSection("interval");
      return { ...base, label: current.label ?? "" };
    }
    return buildDefaultSection(newType);
  });
}

function renderDurationGroup(section, allowEmpty = false) {
  const durationGroup = document.createElement("div");
  durationGroup.className = "form-group";
  durationGroup.innerHTML = "<label>Duration</label>";
  const durationInput = document.createElement("input");
  durationInput.placeholder = "e.g. 10min";
  durationInput.value = section.duration ?? "";
  durationInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    if (!value && allowEmpty) {
      updateSection(selectedSectionIndex, (current) => {
        const updated = { ...current };
        delete updated.duration;
        return updated;
      });
      return;
    }
    if (!durationPattern.test(value)) {
      setStatus("Duration must match schema patterns (e.g. 10min or 2km).", "error");
      return;
    }
    setStatus("");
    updateSection(selectedSectionIndex, (current) => ({ ...current, duration: value }));
  });
  durationGroup.appendChild(durationInput);
  inspectorFormEl.appendChild(durationGroup);
}

function renderTargetEditor(section, key, target, onChange) {
  const group = document.createElement("div");
  group.className = "form-group";
  group.innerHTML = "<label>Target</label>";

  const select = document.createElement("select");
  const targetOptions =
    section.type === "progression" ? ["percent", "hr"] : ["pace", "hr", "percent"];
  targetOptions.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type.toUpperCase();
    select.appendChild(option);
  });
  select.value = target?.type ?? targetOptions[0];
  if (!targetOptions.includes(select.value)) {
    select.value = targetOptions[0];
  }
  select.addEventListener("change", (event) => {
    const type = event.target.value;
    onChange(buildDefaultTarget(type));
  });

  const fields = document.createElement("div");
  fields.className = "form-grid";

  const renderFields = (currentTarget) => {
    fields.innerHTML = "";
    if (currentTarget.type === "pace") {
      const zoneInput = document.createElement("input");
      zoneInput.placeholder = "Zone (e.g. Z2)";
      zoneInput.value = currentTarget.zone ?? "";
      zoneInput.addEventListener("input", (event) => {
        onChange({ ...currentTarget, zone: event.target.value.trim() });
      });
      fields.appendChild(zoneInput);
    } else if (currentTarget.type === "hr") {
      const startInput = document.createElement("input");
      startInput.type = "number";
      startInput.step = "0.01";
      startInput.placeholder = "Start % max";
      startInput.value = currentTarget.percentMax?.[0] ?? 0.6;
      const endInput = document.createElement("input");
      endInput.type = "number";
      endInput.step = "0.01";
      endInput.placeholder = "End % max";
      endInput.value = currentTarget.percentMax?.[1] ?? 0.75;
      const zoneInput = document.createElement("input");
      zoneInput.placeholder = "Zone label";
      zoneInput.value = currentTarget.zone ?? "";
      const updateHr = () => {
        onChange({
          ...currentTarget,
          percentMax: [clamp01(Number(startInput.value)), clamp01(Number(endInput.value))],
          zone: zoneInput.value.trim() || undefined
        });
      };
      startInput.addEventListener("input", updateHr);
      endInput.addEventListener("input", updateHr);
      zoneInput.addEventListener("input", updateHr);
      fields.append(startInput, endInput, zoneInput);
    } else {
      const startInput = document.createElement("input");
      startInput.type = "number";
      startInput.step = "0.01";
      startInput.placeholder = "Start %";
      startInput.value = currentTarget.range?.[0] ?? 0.6;
      const endInput = document.createElement("input");
      endInput.type = "number";
      endInput.step = "0.01";
      endInput.placeholder = "End %";
      endInput.value = currentTarget.range?.[1] ?? 0.75;
      const updatePercent = () => {
        onChange({
          ...currentTarget,
          range: [clamp01(Number(startInput.value)), clamp01(Number(endInput.value))]
        });
      };
      startInput.addEventListener("input", updatePercent);
      endInput.addEventListener("input", updatePercent);
      fields.append(startInput, endInput);
    }
  };

  const initialTarget =
    target && targetOptions.includes(target.type) ? target : buildDefaultTarget(select.value);
  renderFields(initialTarget);
  select.addEventListener("change", () => renderFields(buildDefaultTarget(select.value)));

  group.append(select, fields);
  inspectorFormEl.appendChild(group);
}

function renderIntervalBlockEditor(section, key, label) {
  const block = section[key];
  const heading = document.createElement("h3");
  heading.textContent = label;
  heading.style.margin = "8px 0 0";
  inspectorFormEl.appendChild(heading);

  const durationGroup = document.createElement("div");
  durationGroup.className = "form-group";
  durationGroup.innerHTML = "<label>Duration</label>";
  const durationInput = document.createElement("input");
  durationInput.value = block.duration ?? "";
  durationInput.addEventListener("input", (event) => {
    const value = event.target.value.trim();
    if (!durationPattern.test(value)) {
      setStatus("Interval duration must match schema patterns (e.g. 2min).", "error");
      return;
    }
    setStatus("");
    updateSection(selectedSectionIndex, (current) => ({
      ...current,
      [key]: { ...current[key], duration: value }
    }));
  });
  durationGroup.appendChild(durationInput);
  inspectorFormEl.appendChild(durationGroup);

  renderTargetEditor(section, key, block.target, (target) => {
    updateSection(selectedSectionIndex, (current) => ({
      ...current,
      [key]: { ...current[key], target }
    }));
  });

  renderCuesEditor(block, (cues) => {
    updateSection(selectedSectionIndex, (current) => ({
      ...current,
      [key]: { ...current[key], cues }
    }));
  });
}

function renderCuesEditor(section, onChange) {
  const cueFields = parseCueFields(section.cues);
  const wrapper = document.createElement("div");
  wrapper.className = "form-group";
  wrapper.innerHTML = "<label>Structured cues</label>";
  const grid = document.createElement("div");
  grid.className = "form-grid";

  const executionInput = document.createElement("input");
  executionInput.placeholder = "Execution cue";
  executionInput.value = cueFields.execution;
  const mentalInput = document.createElement("input");
  mentalInput.placeholder = "Mental cue";
  mentalInput.value = cueFields.mental;
  const formInput = document.createElement("input");
  formInput.placeholder = "Form cue";
  formInput.value = cueFields.form;

  const update = () => {
    const cues = buildCuesFromFields({
      execution: executionInput.value.trim(),
      mental: mentalInput.value.trim(),
      form: formInput.value.trim()
    });
    onChange(cues);
  };
  executionInput.addEventListener("input", update);
  mentalInput.addEventListener("input", update);
  formInput.addEventListener("input", update);

  grid.append(executionInput, mentalInput, formInput);
  wrapper.appendChild(grid);
  inspectorFormEl.appendChild(wrapper);
}

function toggleExpanded(index) {
  if (expandedSections.has(index)) {
    expandedSections.delete(index);
  } else {
    expandedSections.add(index);
  }
  renderTimeline();
}

function reorderSection(fromIndex, toIndex) {
  const workout = getSelectedWorkout();
  if (!workout || fromIndex === toIndex) {
    return;
  }
  const structure = [...workout.structure];
  const [moved] = structure.splice(fromIndex, 1);
  structure.splice(toIndex, 0, moved);
  updateWorkout({ ...workout, structure });
  selectedSectionIndex = toIndex;
}

function duplicateSection(index) {
  const workout = getSelectedWorkout();
  if (!workout) return;
  const section = workout.structure[index];
  const structure = [...workout.structure];
  structure.splice(index + 1, 0, JSON.parse(JSON.stringify(section)));
  updateWorkout({ ...workout, structure });
}

function deleteSection(index) {
  const workout = getSelectedWorkout();
  if (!workout) return;
  if (workout.structure.length <= 1) {
    setStatus("At least one section is required.", "error");
    return;
  }
  const structure = workout.structure.filter((_, idx) => idx !== index);
  updateWorkout({ ...workout, structure });
  selectedSectionIndex = null;
}

function addSection() {
  const workout = getSelectedWorkout();
  if (!workout) return;
  const type = sectionTypeSelect.value;
  const newSection = buildDefaultSection(type);
  const structure = [...workout.structure, newSection];
  updateWorkout({ ...workout, structure });
  selectedSectionIndex = structure.length - 1;
}

function createWorkout() {
  const id = `workout-${Date.now()}`;
  const newWorkout = {
    workoutId: id,
    name: "New workout",
    structure: [buildDefaultSection("warmup")],
    cues: []
  };
  workouts = [newWorkout, ...workouts];
  selectedWorkoutId = id;
  selectedSectionIndex = 0;
  workoutMetaById[id] = { tags: [], lastModified: Date.now() };
  recordHistory();
  scheduleValidation();
  render();
}

function duplicateWorkout(workout) {
  const id = `workout-${Date.now()}`;
  const clone = JSON.parse(JSON.stringify(workout));
  clone.workoutId = id;
  clone.name = `${clone.name} (Copy)`;
  workouts = [clone, ...workouts];
  selectedWorkoutId = id;
  selectedSectionIndex = 0;
  workoutMetaById[id] = {
    tags: [...(getWorkoutMeta(workout.workoutId).tags ?? [])],
    lastModified: Date.now()
  };
  recordHistory();
  scheduleValidation();
  render();
}

function deleteWorkout(id) {
  recordHistory();
  workouts = workouts.filter((workout) => workout.workoutId !== id);
  delete workoutMetaById[id];
  if (selectedWorkoutId === id) {
    selectedWorkoutId = workouts[0]?.workoutId ?? null;
    selectedSectionIndex = null;
  }
  scheduleValidation();
  render();
}

function adjustSelectedReps(delta) {
  const workout = getSelectedWorkout();
  if (!workout || selectedSectionIndex == null) return;
  const section = workout.structure[selectedSectionIndex];
  if (section.type !== "interval") {
    setStatus("Select an interval section to adjust reps.", "error");
    return;
  }
  const nextValue = Math.max(1, (section.reps ?? 1) + delta);
  updateSection(selectedSectionIndex, (current) => ({ ...current, reps: nextValue }));
}

function extendSelectedDuration(minutes) {
  const workout = getSelectedWorkout();
  if (!workout || selectedSectionIndex == null) return;
  const section = workout.structure[selectedSectionIndex];
  if (section.type === "interval") {
    setStatus("Extend duration applies to non-interval sections.", "error");
    return;
  }
  const currentMinutes = parseDurationToMinutes(section.duration);
  if (currentMinutes == null) {
    setStatus("Duration must be time-based to extend.", "error");
    return;
  }
  updateSection(selectedSectionIndex, (current) => ({
    ...current,
    duration: formatMinutes(currentMinutes + minutes)
  }));
}

function extendWarmupCooldown(minutes) {
  const workout = getSelectedWorkout();
  if (!workout) return;
  const structure = workout.structure.map((section) => {
    if (section.type !== "warmup" && section.type !== "cooldown") {
      return section;
    }
    const currentMinutes = parseDurationToMinutes(section.duration);
    if (currentMinutes == null) {
      return section;
    }
    return { ...section, duration: formatMinutes(currentMinutes + minutes) };
  });
  updateWorkout({ ...workout, structure });
}

function addStridesToWorkout() {
  const workout = getSelectedWorkout();
  if (!workout) return;
  const structure = [...workout.structure, buildStridesSection()];
  updateWorkout({ ...workout, structure });
  selectedSectionIndex = structure.length - 1;
}

function handleKeydown(event) {
  const target = event.target;
  const isInput =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;
  const isMeta = event.metaKey || event.ctrlKey;

  if (isMeta && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveWorkouts();
    return;
  }
  if (isMeta && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  if (isInput) return;

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelectedSection(-1);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelectedSection(1);
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    if (selectedSectionIndex != null) {
      deleteSection(selectedSectionIndex);
    }
  }
  if (isMeta && event.key.toLowerCase() === "d") {
    event.preventDefault();
    if (selectedSectionIndex != null) {
      duplicateSection(selectedSectionIndex);
    }
  }
  if (event.key === "Escape") {
    selectedSectionIndex = null;
    render();
  }
}

function moveSelectedSection(delta) {
  if (selectedSectionIndex == null) return;
  const workout = getSelectedWorkout();
  if (!workout) return;
  const nextIndex = selectedSectionIndex + delta;
  if (nextIndex < 0 || nextIndex >= workout.structure.length) return;
  reorderSection(selectedSectionIndex, nextIndex);
}

async function saveWorkouts() {
  setStatus("Saving...");
  const validationResponse = await fetch("/api/workouts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workouts })
  });
  const validationData = await validationResponse.json();
  validationErrorsByWorkoutId = validationData.errorsById ?? {};
  if (!validationData.valid) {
    renderValidation();
    renderSaveState();
    setStatus("Fix validation errors before saving.", "error");
    return;
  }
  const response = await fetch("/api/workouts", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workouts })
  });
  if (response.ok) {
    setStatus("Saved to workouts.master.json.");
  } else {
    const data = await response.json();
    setStatus(data.error || "Save failed.", "error");
  }
}

function render() {
  renderWorkoutList();
  renderTimeline();
  renderInspector();
  renderValidation();
  renderSaveState();
}

addSectionButton.addEventListener("click", addSection);
newWorkoutButton.addEventListener("click", createWorkout);
saveButton.addEventListener("click", saveWorkouts);
workoutSortSelect.addEventListener("change", (event) => {
  workoutSortMode = event.target.value;
  renderWorkoutList();
});
commandRepsUp.addEventListener("click", () => adjustSelectedReps(1));
commandRepsDown.addEventListener("click", () => adjustSelectedReps(-1));
commandExtendFive.addEventListener("click", () => extendSelectedDuration(5));
commandExtendTen.addEventListener("click", () => extendSelectedDuration(10));
commandExtendWarmCool.addEventListener("click", () => extendWarmupCooldown(5));
commandAddStrides.addEventListener("click", addStridesToWorkout);
document.addEventListener("keydown", handleKeydown);

fetchWorkouts();
