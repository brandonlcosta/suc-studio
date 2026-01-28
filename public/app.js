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
const tpExportStatusEl = document.getElementById("tp-export-status");
const tpAthleteProfileEl = document.getElementById("tp-athlete-profile");
const tpExportPreviewButton = document.getElementById("tp-export-preview");
const tpExportDownloadButton = document.getElementById("tp-export-download");
const tpExportPreviewOutputEl = document.getElementById("tp-export-preview-output");

let workouts = [];
let selectedWorkoutId = null;
let selectedSectionIndex = null;
let expandedSections = new Set();
let validationErrorsByWorkoutId = {};
let validationTimer = null;
let tpExportPayload = null;
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
  if (sectionType === "interval") {
    return {
      type: "interval",
      reps: 4,
      work: { duration: "2min", target: buildDefaultTarget("pace"), cues: [] },
      rest: { duration: "1min", target: buildDefaultTarget("pace"), cues: [] },
      cues: [],
      label: ""
    };
  }
  const targetType = sectionType === "progression" ? "percent" : "pace";
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
  workouts = workouts.map((workout) =>
    workout.workoutId === updatedWorkout.workoutId ? updatedWorkout : workout
  );
  clearTpExportPreview();
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
  workouts.forEach((workout) => {
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
    subtitle.textContent = workout.workoutId;
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
    item.append(titleInput, subtitle, actions);
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
  scheduleValidation();
  render();
}

function deleteWorkout(id) {
  workouts = workouts.filter((workout) => workout.workoutId !== id);
  if (selectedWorkoutId === id) {
    selectedWorkoutId = workouts[0]?.workoutId ?? null;
    selectedSectionIndex = null;
  }
  scheduleValidation();
  render();
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
tpExportPreviewButton.addEventListener("click", (event) => {
  event.preventDefault();
  previewTrainingPeaksExport();
});
tpExportDownloadButton.addEventListener("click", (event) => {
  event.preventDefault();
  downloadTrainingPeaksExport();
});

tpAthleteProfileEl.value = JSON.stringify(defaultAthleteProfile, null, 2);
fetchWorkouts();
