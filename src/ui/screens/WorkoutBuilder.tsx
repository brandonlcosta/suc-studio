import { useState, useEffect, useCallback } from "react";
import type { Workout, WorkoutsMaster, WorkoutStatus, TierLabel, IntervalSegment, TierVariant, TargetType } from "../types";
import { loadWorkoutsMaster, saveWorkoutsMaster } from "../utils/api";

export default function WorkoutBuilder() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // List view state
  const [statusFilter, setStatusFilter] = useState<WorkoutStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Editor state
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load workouts on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const workoutsMaster = await loadWorkoutsMaster();
        setWorkouts(workoutsMaster.workouts || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load workouts: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Validation function
  const validateWorkout = useCallback((workout: Workout): string[] => {
    const errors: string[] = [];

    if (!workout.name || workout.name.trim() === "") {
      errors.push("Name is required");
    }

    const enabledTiers = Object.keys(workout.tiers) as TierLabel[];
    if (enabledTiers.length === 0) {
      errors.push("At least one tier must be enabled");
    }

    for (const tierKey of enabledTiers) {
      const tier = workout.tiers[tierKey];
      if (!tier || tier.structure.length === 0) {
        errors.push(`Tier ${tierKey} must have at least one interval`);
      } else {
        for (let i = 0; i < tier.structure.length; i++) {
          const interval = tier.structure[i];
          if (!interval.work.duration || interval.work.duration.trim() === "") {
            errors.push(`Tier ${tierKey}, Interval ${i + 1}: work duration is required`);
          }
          if (!interval.work.target.zone || interval.work.target.zone.trim() === "") {
            errors.push(`Tier ${tierKey}, Interval ${i + 1}: work zone is required`);
          }
        }
      }
    }

    return errors;
  }, []);

  // Generate workout ID
  const generateWorkoutId = useCallback((name: string): string => {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    const timestamp = Date.now();
    return slug ? `workout-${slug}` : `workout-${timestamp}`;
  }, []);

  // Create new workout
  const handleCreateNew = useCallback(() => {
    const newWorkout: Workout = {
      workoutId: "",
      version: 0,
      status: "draft",
      name: "",
      description: "",
      focus: [],
      coachNotes: "",
      tiers: {
        MED: {
          name: "",
          structure: [],
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };
    setEditingWorkout(newWorkout);
    setIsCreating(true);
    setValidationErrors([]);
    setError(null);
    setSuccess(null);
  }, []);

  // Edit existing workout
  const handleEdit = useCallback((workout: Workout) => {
    setEditingWorkout(JSON.parse(JSON.stringify(workout)));
    setIsCreating(false);
    setValidationErrors([]);
    setError(null);
    setSuccess(null);
  }, []);

  // Cancel editing
  const handleCancel = useCallback(() => {
    setEditingWorkout(null);
    setIsCreating(false);
    setValidationErrors([]);
    setError(null);
  }, []);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    if (!editingWorkout) return;

    const errors = validateWorkout(editingWorkout);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    try {
      const updatedWorkout = {
        ...editingWorkout,
        workoutId: editingWorkout.workoutId || generateWorkoutId(editingWorkout.name),
        updatedAt: new Date().toISOString(),
      };

      // Update tier names
      for (const tierKey of Object.keys(updatedWorkout.tiers) as TierLabel[]) {
        const tier = updatedWorkout.tiers[tierKey];
        if (tier) {
          tier.name = `${updatedWorkout.name} (${tierKey})`;
        }
      }

      let newWorkouts: Workout[];
      if (isCreating) {
        newWorkouts = [...workouts, updatedWorkout];
      } else {
        newWorkouts = workouts.map((w) =>
          w.workoutId === updatedWorkout.workoutId ? updatedWorkout : w
        );
      }

      await saveWorkoutsMaster({ version: 1, workouts: newWorkouts });
      setWorkouts(newWorkouts);
      setSuccess("Draft saved successfully!");
      setEditingWorkout(updatedWorkout);
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to save: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editingWorkout, isCreating, workouts, validateWorkout, generateWorkoutId]);

  // Publish workout
  const handlePublish = useCallback(async () => {
    if (!editingWorkout) return;

    const errors = validateWorkout(editingWorkout);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);
    setValidationErrors([]);

    try {
      const publishedWorkout = {
        ...editingWorkout,
        status: "published" as WorkoutStatus,
        version: editingWorkout.version === 0 ? 1 : editingWorkout.version,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let newWorkouts: Workout[];
      if (isCreating || !workouts.find((w) => w.workoutId === publishedWorkout.workoutId)) {
        publishedWorkout.workoutId = publishedWorkout.workoutId || generateWorkoutId(publishedWorkout.name);
        newWorkouts = [...workouts, publishedWorkout];
      } else {
        newWorkouts = workouts.map((w) =>
          w.workoutId === publishedWorkout.workoutId ? publishedWorkout : w
        );
      }

      await saveWorkoutsMaster({ version: 1, workouts: newWorkouts });
      setWorkouts(newWorkouts);
      setSuccess("Workout published successfully!");
      setEditingWorkout(publishedWorkout);
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to publish: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editingWorkout, isCreating, workouts, validateWorkout, generateWorkoutId]);

  // Archive workout
  const handleArchive = useCallback(async () => {
    if (!editingWorkout || editingWorkout.status !== "published") return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const archivedWorkout = {
        ...editingWorkout,
        status: "archived" as WorkoutStatus,
      };

      const newWorkouts = workouts.map((w) =>
        w.workoutId === archivedWorkout.workoutId ? archivedWorkout : w
      );

      await saveWorkoutsMaster({ version: 1, workouts: newWorkouts });
      setWorkouts(newWorkouts);
      setSuccess("Workout archived successfully!");
      setEditingWorkout(archivedWorkout);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to archive: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editingWorkout, workouts]);

  // Delete workout
  const handleDelete = useCallback(async () => {
    if (!editingWorkout || editingWorkout.status !== "draft") return;

    if (!confirm("Are you sure you want to delete this draft workout? This cannot be undone.")) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const newWorkouts = workouts.filter((w) => w.workoutId !== editingWorkout.workoutId);
      await saveWorkoutsMaster({ version: 1, workouts: newWorkouts });
      setWorkouts(newWorkouts);
      setSuccess("Workout deleted successfully!");
      setEditingWorkout(null);
      setIsCreating(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to delete: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }, [editingWorkout, workouts]);

  // Clone workout
  const handleClone = useCallback(() => {
    if (!editingWorkout) return;

    const clonedWorkout: Workout = {
      ...JSON.parse(JSON.stringify(editingWorkout)),
      workoutId: "",
      version: 0,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };

    setEditingWorkout(clonedWorkout);
    setIsCreating(true);
    setSuccess("Cloned as draft. Modify and save to create a new workout.");
    setError(null);
    setValidationErrors([]);
  }, [editingWorkout]);

  // Update field
  const updateField = useCallback(
    <K extends keyof Workout>(field: K, value: Workout[K]) => {
      if (!editingWorkout) return;
      setEditingWorkout({ ...editingWorkout, [field]: value });
    },
    [editingWorkout]
  );

  // Filtered workouts
  const filteredWorkouts = workouts.filter((workout) => {
    const matchesStatus = statusFilter === "all" || workout.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.focus.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading workouts...</p>
      </div>
    );
  }

  // Show editor view
  if (editingWorkout) {
    return (
      <WorkoutEditor
        workout={editingWorkout}
        isCreating={isCreating}
        isSaving={isSaving}
        error={error}
        success={success}
        validationErrors={validationErrors}
        onCancel={handleCancel}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onClone={handleClone}
        updateField={updateField}
      />
    );
  }

  // Show list view
  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Workout Library Manager</h1>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            borderRadius: "4px",
            color: "#060",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or focus..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as WorkoutStatus | "all")}
          style={{
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <button
          onClick={handleCreateNew}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Create New Workout
        </button>
      </div>

      {filteredWorkouts.length === 0 ? (
        <p style={{ textAlign: "center", color: "#666", marginTop: "2rem" }}>
          No workouts found. {statusFilter !== "all" && "Try changing the filter or "}Create a new
          workout to get started.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #ddd",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f5" }}>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Name
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Status
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Version
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Focus
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Tiers
              </th>
              <th style={{ padding: "0.75rem", textAlign: "left", borderBottom: "2px solid #ddd" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkouts.map((workout) => (
              <tr key={workout.workoutId} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.75rem" }}>{workout.name}</td>
                <td style={{ padding: "0.75rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      backgroundColor:
                        workout.status === "draft"
                          ? "#fef3c7"
                          : workout.status === "published"
                          ? "#d1fae5"
                          : "#e5e7eb",
                      color:
                        workout.status === "draft"
                          ? "#92400e"
                          : workout.status === "published"
                          ? "#065f46"
                          : "#374151",
                    }}
                  >
                    {workout.status}
                  </span>
                </td>
                <td style={{ padding: "0.75rem" }}>v{workout.version}</td>
                <td style={{ padding: "0.75rem" }}>
                  {workout.focus.length > 0 ? workout.focus.join(", ") : "-"}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  {Object.keys(workout.tiers).join(", ")}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <button
                    onClick={() => handleEdit(workout)}
                    style={{
                      padding: "0.25rem 0.75rem",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    {workout.status === "draft" ? "Edit" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Workout Editor Component
interface WorkoutEditorProps {
  workout: Workout;
  isCreating: boolean;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  validationErrors: string[];
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClone: () => void;
  updateField: <K extends keyof Workout>(field: K, value: Workout[K]) => void;
}

function WorkoutEditor({
  workout,
  isCreating,
  isSaving,
  error,
  success,
  validationErrors,
  onCancel,
  onSaveDraft,
  onPublish,
  onArchive,
  onDelete,
  onClone,
  updateField,
}: WorkoutEditorProps) {
  const [activeTier, setActiveTier] = useState<TierLabel>("MED");
  const isDraft = workout.status === "draft";
  const isPublished = workout.status === "published";
  const isArchived = workout.status === "archived";

  // Update tier
  const updateTier = useCallback(
    (tierKey: TierLabel, tier: TierVariant | undefined) => {
      const newTiers = { ...workout.tiers };
      if (tier) {
        newTiers[tierKey] = tier;
      } else {
        delete newTiers[tierKey];
      }
      updateField("tiers", newTiers);
    },
    [workout.tiers, updateField]
  );

  // Enable/disable tier
  const toggleTier = useCallback(
    (tierKey: TierLabel) => {
      if (workout.tiers[tierKey]) {
        updateTier(tierKey, undefined);
      } else {
        updateTier(tierKey, {
          name: `${workout.name} (${tierKey})`,
          structure: [],
        });
        setActiveTier(tierKey);
      }
    },
    [workout.tiers, workout.name, updateTier]
  );

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to List
        </button>
      </div>

      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
        {isCreating ? "Create New Workout" : "Edit Workout"}
      </h1>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#efe",
            border: "1px solid #cfc",
            borderRadius: "4px",
            color: "#060",
          }}
        >
          {success}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "4px",
            color: "#856404",
          }}
        >
          <strong>Validation Errors:</strong>
          <ul style={{ marginTop: "0.5rem", marginBottom: 0, paddingLeft: "1.5rem" }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Workout Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={workout.name}
              onChange={(e) => updateField("name", e.target.value)}
              disabled={!isDraft}
              placeholder="e.g., Threshold 40"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                backgroundColor: isDraft ? "white" : "#f3f4f6",
              }}
            />
          </div>

          <div style={{ width: "120px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Status
            </label>
            <span
              style={{
                display: "inline-block",
                padding: "0.5rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor:
                  workout.status === "draft"
                    ? "#fef3c7"
                    : workout.status === "published"
                    ? "#d1fae5"
                    : "#e5e7eb",
                color:
                  workout.status === "draft"
                    ? "#92400e"
                    : workout.status === "published"
                    ? "#065f46"
                    : "#374151",
              }}
            >
              {workout.status}
            </span>
          </div>

          <div style={{ width: "100px" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
              Version
            </label>
            <span style={{ display: "block", padding: "0.5rem" }}>v{workout.version}</span>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Description
          </label>
          <textarea
            value={workout.description}
            onChange={(e) => updateField("description", e.target.value)}
            disabled={!isDraft}
            placeholder="Brief description of the workout"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              minHeight: "80px",
              backgroundColor: isDraft ? "white" : "#f3f4f6",
            }}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Focus Tags (comma-separated)
          </label>
          <input
            type="text"
            value={workout.focus.join(", ")}
            onChange={(e) =>
              updateField(
                "focus",
                e.target.value.split(",").map((f) => f.trim()).filter(Boolean)
              )
            }
            disabled={!isDraft}
            placeholder="e.g., threshold, tempo, endurance"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              backgroundColor: isDraft ? "white" : "#f3f4f6",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
            Coach Notes
          </label>
          <textarea
            value={workout.coachNotes}
            onChange={(e) => updateField("coachNotes", e.target.value)}
            disabled={!isDraft}
            placeholder="Execution guidance for coaches/athletes"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              minHeight: "80px",
              backgroundColor: isDraft ? "white" : "#f3f4f6",
            }}
          />
        </div>
      </div>

      {/* Tier Section */}
      <div
        style={{
          padding: "1.5rem",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Tier Variants</h2>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {(["MED", "LRG", "XL"] as TierLabel[]).map((tierKey) => (
            <label key={tierKey} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                checked={!!workout.tiers[tierKey]}
                onChange={() => toggleTier(tierKey)}
                disabled={!isDraft}
              />
              <span>{tierKey}</span>
            </label>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {(Object.keys(workout.tiers) as TierLabel[]).map((tierKey) => (
            <button
              key={tierKey}
              onClick={() => setActiveTier(tierKey)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: activeTier === tierKey ? "#007bff" : "#e5e7eb",
                color: activeTier === tierKey ? "white" : "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {tierKey}
            </button>
          ))}
        </div>

        {workout.tiers[activeTier] && (
          <TierEditor
            tier={workout.tiers[activeTier]!}
            tierKey={activeTier}
            isDraft={isDraft}
            onUpdate={(tier) => updateTier(activeTier, tier)}
          />
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          padding: "1.5rem",
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
        }}
      >
        {isDraft && (
          <>
            <button
              onClick={onSaveDraft}
              disabled={isSaving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={onPublish}
              disabled={isSaving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? "Publishing..." : "Publish"}
            </button>
            <button
              onClick={onDelete}
              disabled={isSaving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              Delete
            </button>
          </>
        )}

        {isPublished && (
          <>
            <button
              onClick={onArchive}
              disabled={isSaving}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#ffc107",
                color: "#333",
                border: "none",
                borderRadius: "4px",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              {isSaving ? "Archiving..." : "Archive"}
            </button>
            <button
              onClick={onClone}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Clone to Draft
            </button>
          </>
        )}

        {isArchived && (
          <button
            onClick={onClone}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clone to Draft
          </button>
        )}
      </div>
    </div>
  );
}

// Tier Editor Component
interface TierEditorProps {
  tier: TierVariant;
  tierKey: TierLabel;
  isDraft: boolean;
  onUpdate: (tier: TierVariant) => void;
}

function TierEditor({ tier, tierKey, isDraft, onUpdate }: TierEditorProps) {
  const addInterval = useCallback(() => {
    const newInterval: IntervalSegment = {
      type: "interval",
      reps: 1,
      work: {
        duration: "",
        target: { type: "pace", zone: "Z2" },
        cues: [],
      },
      rest: null,
    };
    onUpdate({
      ...tier,
      structure: [...tier.structure, newInterval],
    });
  }, [tier, onUpdate]);

  const removeInterval = useCallback(
    (index: number) => {
      onUpdate({
        ...tier,
        structure: tier.structure.filter((_, i) => i !== index),
      });
    },
    [tier, onUpdate]
  );

  const updateInterval = useCallback(
    (index: number, interval: IntervalSegment) => {
      const newStructure = [...tier.structure];
      newStructure[index] = interval;
      onUpdate({
        ...tier,
        structure: newStructure,
      });
    },
    [tier, onUpdate]
  );

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        {tier.structure.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: "2rem" }}>
            No intervals yet. Add an interval to get started.
          </p>
        ) : (
          tier.structure.map((interval, idx) => (
            <IntervalEditor
              key={idx}
              interval={interval}
              index={idx}
              isDraft={isDraft}
              onUpdate={(interval) => updateInterval(idx, interval)}
              onRemove={() => removeInterval(idx)}
            />
          ))
        )}
      </div>

      {isDraft && (
        <button
          onClick={addInterval}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + Add Interval
        </button>
      )}
    </div>
  );
}

// Interval Editor Component
interface IntervalEditorProps {
  interval: IntervalSegment;
  index: number;
  isDraft: boolean;
  onUpdate: (interval: IntervalSegment) => void;
  onRemove: () => void;
}

function IntervalEditor({ interval, index, isDraft, onUpdate, onRemove }: IntervalEditorProps) {
  const [showRest, setShowRest] = useState(!!interval.rest);

  const updateWorkCues = useCallback(
    (cuesText: string) => {
      onUpdate({
        ...interval,
        work: {
          ...interval.work,
          cues: cuesText.split("\n").filter(Boolean),
        },
      });
    },
    [interval, onUpdate]
  );

  const updateRestCues = useCallback(
    (cuesText: string) => {
      if (!interval.rest) return;
      onUpdate({
        ...interval,
        rest: {
          ...interval.rest,
          cues: cuesText.split("\n").filter(Boolean),
        },
      });
    },
    [interval, onUpdate]
  );

  const toggleRest = useCallback(() => {
    if (showRest && interval.rest) {
      onUpdate({ ...interval, rest: null });
      setShowRest(false);
    } else {
      onUpdate({
        ...interval,
        rest: {
          duration: "",
          target: { type: "pace", zone: "Z2" },
          cues: [],
        },
      });
      setShowRest(true);
    }
  }, [showRest, interval, onUpdate]);

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        marginBottom: "1rem",
        backgroundColor: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h4 style={{ margin: 0 }}>Interval {index + 1}</h4>
        {isDraft && (
          <button
            onClick={onRemove}
            style={{
              padding: "0.25rem 0.5rem",
              backgroundColor: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Repetitions
        </label>
        <input
          type="number"
          min="1"
          value={interval.reps}
          onChange={(e) => onUpdate({ ...interval, reps: parseInt(e.target.value) || 1 })}
          disabled={!isDraft}
          style={{
            width: "100px",
            padding: "0.5rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            backgroundColor: isDraft ? "white" : "#f3f4f6",
          }}
        />
      </div>

      {/* Work Section */}
      <div
        style={{
          padding: "1rem",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "4px",
          marginBottom: "1rem",
        }}
      >
        <h5 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "0.875rem" }}>Work</h5>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
              Duration <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={interval.work.duration}
              onChange={(e) =>
                onUpdate({
                  ...interval,
                  work: { ...interval.work, duration: e.target.value },
                })
              }
              disabled={!isDraft}
              placeholder="15min"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: isDraft ? "white" : "#f3f4f6",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
              Target Type
            </label>
            <select
              value={interval.work.target.type}
              onChange={(e) =>
                onUpdate({
                  ...interval,
                  work: {
                    ...interval.work,
                    target: { ...interval.work.target, type: e.target.value as TargetType },
                  },
                })
              }
              disabled={!isDraft}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: isDraft ? "white" : "#f3f4f6",
              }}
            >
              <option value="pace">Pace</option>
              <option value="hr">Heart Rate</option>
              <option value="power">Power</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
              Zone <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={interval.work.target.zone}
              onChange={(e) =>
                onUpdate({
                  ...interval,
                  work: {
                    ...interval.work,
                    target: { ...interval.work.target, zone: e.target.value },
                  },
                })
              }
              disabled={!isDraft}
              placeholder="Z4"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: isDraft ? "white" : "#f3f4f6",
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
            Cues (one per line)
          </label>
          <textarea
            value={interval.work.cues.join("\n")}
            onChange={(e) => updateWorkCues(e.target.value)}
            disabled={!isDraft}
            placeholder="Focus on form&#10;Keep cadence steady"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              minHeight: "60px",
              fontSize: "0.875rem",
              backgroundColor: isDraft ? "white" : "#f3f4f6",
            }}
          />
        </div>
      </div>

      {/* Rest Section */}
      {isDraft && !showRest && (
        <button
          onClick={toggleRest}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          + Add Rest Period
        </button>
      )}

      {showRest && interval.rest && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef3c7",
            border: "1px solid #fde047",
            borderRadius: "4px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h5 style={{ marginTop: 0, marginBottom: 0, fontSize: "0.875rem" }}>Rest</h5>
            {isDraft && (
              <button
                onClick={toggleRest}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                }}
              >
                Remove Rest
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                Duration
              </label>
              <input
                type="text"
                value={interval.rest.duration}
                onChange={(e) =>
                  onUpdate({
                    ...interval,
                    rest: interval.rest ? { ...interval.rest, duration: e.target.value } : null,
                  })
                }
                disabled={!isDraft}
                placeholder="3min"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  backgroundColor: isDraft ? "white" : "#f3f4f6",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                Target Type
              </label>
              <select
                value={interval.rest.target.type}
                onChange={(e) =>
                  onUpdate({
                    ...interval,
                    rest: interval.rest
                      ? {
                          ...interval.rest,
                          target: { ...interval.rest.target, type: e.target.value as TargetType },
                        }
                      : null,
                  })
                }
                disabled={!isDraft}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  backgroundColor: isDraft ? "white" : "#f3f4f6",
                }}
              >
                <option value="pace">Pace</option>
                <option value="hr">Heart Rate</option>
                <option value="power">Power</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                Zone
              </label>
              <input
                type="text"
                value={interval.rest.target.zone}
                onChange={(e) =>
                  onUpdate({
                    ...interval,
                    rest: interval.rest
                      ? {
                          ...interval.rest,
                          target: { ...interval.rest.target, zone: e.target.value },
                        }
                      : null,
                  })
                }
                disabled={!isDraft}
                placeholder="Z2"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  backgroundColor: isDraft ? "white" : "#f3f4f6",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
              Cues (one per line)
            </label>
            <textarea
              value={interval.rest.cues.join("\n")}
              onChange={(e) => updateRestCues(e.target.value)}
              disabled={!isDraft}
              placeholder="Active recovery&#10;Stay loose"
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                minHeight: "60px",
                fontSize: "0.875rem",
                backgroundColor: isDraft ? "white" : "#f3f4f6",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
