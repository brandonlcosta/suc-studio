import type { CSSProperties } from "react";
import type {
  Event,
  RouteGroupSummary,
  RouteLabel,
  RouteMediaDoc,
  RouteMediaMarker,
  RouteMediaSubtitle,
  RouteMediaTimelineEntry,
} from "../../types";

type MediaInspectorPanelProps = {
  draft: RouteMediaDoc;
  events: Event[];
  routeGroups: RouteGroupSummary[];
  availableVariants: RouteLabel[];
  activeVariant: RouteLabel | null;
  selectedEntry: RouteMediaTimelineEntry | null;
  selectedSubtitle: RouteMediaSubtitle | null;
  selectedMarker: RouteMediaMarker | null;
  selectedEntryHoldSeconds: number;
  validationErrors: Record<string, string>;
  onSetDraftField: (updates: Partial<RouteMediaDoc>) => void;
  onSetPlaybackField: <K extends keyof RouteMediaDoc["playback"]>(
    key: K,
    value: RouteMediaDoc["playback"][K]
  ) => void;
  onSetCameraField: <K extends keyof RouteMediaDoc["camera"]>(
    key: K,
    value: RouteMediaDoc["camera"][K]
  ) => void;
  onSetActiveVariant: (variant: RouteLabel) => void;
  onClearSelection: () => void;
  onUpdateSelectedEntryField: (updates: Partial<RouteMediaTimelineEntry>) => void;
  onUpdateSelectedSubtitleText: (text: string) => void;
  onUpdateSelectedMarkerTitle: (title: string) => void;
  onUpdateSelectedMarkerBody: (body: string) => void;
  onUpdateSelectedMarkerType: (type: RouteMediaMarker["type"]) => void;
  onUpdateSelectedHoldSeconds: (seconds: number) => void;
  onRemoveSelectedEntry: () => void;
};

function parseNumber(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

const labelStyle: CSSProperties = {
  fontSize: "0.76rem",
  color: "#94a3b8",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.48rem 0.55rem",
  borderRadius: "6px",
  border: "1px solid #334155",
  backgroundColor: "#0b1220",
  color: "#f8fafc",
  fontSize: "0.84rem",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <div style={{ fontSize: "0.72rem", color: "#fda4af" }}>{message}</div>;
}

export default function MediaInspectorPanel({
  draft,
  events,
  routeGroups,
  availableVariants,
  activeVariant,
  selectedEntry,
  selectedSubtitle,
  selectedMarker,
  selectedEntryHoldSeconds,
  validationErrors,
  onSetDraftField,
  onSetPlaybackField,
  onSetCameraField,
  onSetActiveVariant,
  onClearSelection,
  onUpdateSelectedEntryField,
  onUpdateSelectedSubtitleText,
  onUpdateSelectedMarkerTitle,
  onUpdateSelectedMarkerBody,
  onUpdateSelectedMarkerType,
  onUpdateSelectedHoldSeconds,
  onRemoveSelectedEntry,
}: MediaInspectorPanelProps) {
  if (!selectedEntry) {
    return (
      <div style={{ display: "grid", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#f8fafc" }}>Plan Settings</div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "#64748b" }}>
            Select a timeline marker to edit title, subtitle, and camera details.
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Plan ID</label>
          <input
            value={draft.id}
            onChange={(event) => onSetDraftField({ id: event.target.value })}
            style={fieldStyle}
            placeholder="SUC-036-MEDIA"
          />
          <FieldError message={validationErrors.id} />
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Event</label>
          <select
            value={draft.eventId}
            onChange={(event) => onSetDraftField({ eventId: event.target.value })}
            style={fieldStyle}
          >
            <option value="">Select event</option>
            {events.map((event) => (
              <option key={event.eventId} value={event.eventId}>
                {event.eventName || event.eventId}
              </option>
            ))}
          </select>
          <FieldError message={validationErrors.eventId} />
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Route</label>
          <select
            value={draft.routeId}
            onChange={(event) =>
              onSetDraftField({
                routeId: event.target.value,
                distanceVariantId: "",
              })
            }
            style={fieldStyle}
          >
            <option value="">Select route</option>
            {routeGroups.map((route) => (
              <option key={route.routeGroupId} value={route.routeGroupId}>
                {route.routeGroupId} - {route.name}
              </option>
            ))}
          </select>
          <FieldError message={validationErrors.routeId} />
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Variant</label>
          <select
            value={activeVariant || ""}
            onChange={(event) => {
              const next = event.target.value as RouteLabel;
              if (next) onSetActiveVariant(next);
            }}
            style={fieldStyle}
            disabled={availableVariants.length === 0}
          >
            <option value="">Select variant</option>
            {availableVariants.map((variant) => (
              <option key={variant} value={variant}>
                {variant}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Title</label>
          <input
            value={draft.title || ""}
            onChange={(event) => onSetDraftField({ title: event.target.value })}
            style={fieldStyle}
            placeholder="Cinematic title"
          />
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={draft.description || ""}
            onChange={(event) => onSetDraftField({ description: event.target.value })}
            rows={3}
            style={fieldStyle}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={labelStyle}>Visibility</label>
            <select
              value={draft.visibility}
              onChange={(event) =>
                onSetDraftField({ visibility: event.target.value as RouteMediaDoc["visibility"] })
              }
              style={fieldStyle}
            >
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            <label style={labelStyle}>Status</label>
            <select
              value={draft.status || "active"}
              onChange={(event) =>
                onSetDraftField({ status: event.target.value as RouteMediaDoc["status"] })
              }
              style={fieldStyle}
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
              <option value="deprecated">deprecated</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.4rem" }}>
          <label style={labelStyle}>Publish</label>
          <select
            value={draft.publish === false ? "false" : "true"}
            onChange={(event) => onSetDraftField({ publish: event.target.value === "true" })}
            style={fieldStyle}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.8rem", display: "grid", gap: "0.55rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>Playback</div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>Miles Per Second</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={draft.playback.milesPerSecond}
              onChange={(event) =>
                onSetPlaybackField("milesPerSecond", parseNumber(event.target.value, 1))
              }
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>FPS</label>
            <input
              type="number"
              min="12"
              max="60"
              value={draft.playback.fps}
              onChange={(event) => onSetPlaybackField("fps", Math.round(parseNumber(event.target.value, 24)))}
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>Default Hold (sec)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={draft.playback.holdSeconds}
              onChange={(event) => onSetPlaybackField("holdSeconds", parseNumber(event.target.value, 0.75))}
              style={fieldStyle}
            />
          </div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>Output Format</label>
            <select
              value={draft.playback.outputFormat}
              onChange={(event) =>
                onSetPlaybackField(
                  "outputFormat",
                  event.target.value as RouteMediaDoc["playback"]["outputFormat"]
                )
              }
              style={fieldStyle}
            >
              <option value="story">story</option>
              <option value="square">square</option>
              <option value="landscape">landscape</option>
            </select>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.8rem", display: "grid", gap: "0.55rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>Default Camera</div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>Mode</label>
            <select
              value={draft.camera.mode}
              onChange={(event) =>
                onSetCameraField("mode", event.target.value as RouteMediaDoc["camera"]["mode"])
              }
              style={fieldStyle}
            >
              <option value="third-person-follow">third-person-follow</option>
              <option value="overview-lock">overview-lock</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <label style={labelStyle}>Follow Distance (m)</label>
            <input
              type="number"
              min="0"
              value={draft.camera.followDistanceMeters ?? 0}
              onChange={(event) =>
                onSetCameraField("followDistanceMeters", parseNumber(event.target.value, 0))
              }
              style={fieldStyle}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#f8fafc" }}>Entry Settings</div>
          <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "#64748b" }}>
            Edit the selected map/timeline beat.
          </div>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          style={{
            padding: "0.35rem 0.55rem",
            borderRadius: "6px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#cbd5e1",
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          Plan
        </button>
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        <label style={labelStyle}>Entry ID</label>
        <input value={selectedEntry.id} style={fieldStyle} readOnly />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Start Mile</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={selectedEntry.startMi}
            onChange={(event) =>
              onUpdateSelectedEntryField({ startMi: parseNumber(event.target.value, selectedEntry.startMi) })
            }
            style={fieldStyle}
          />
        </div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>End Mile</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={selectedEntry.endMi}
            onChange={(event) =>
              onUpdateSelectedEntryField({ endMi: parseNumber(event.target.value, selectedEntry.endMi) })
            }
            style={fieldStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        <label style={labelStyle}>Entry Title</label>
        <input
          value={selectedEntry.title || ""}
          onChange={(event) => onUpdateSelectedEntryField({ title: event.target.value })}
          style={fieldStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Camera Preset</label>
          <select
            value={selectedEntry.cameraMode}
            onChange={(event) =>
              onUpdateSelectedEntryField({
                cameraMode: event.target.value as RouteMediaTimelineEntry["cameraMode"],
              })
            }
            style={fieldStyle}
          >
            <option value="third-person-follow">third-person-follow</option>
            <option value="overview-lock">overview-lock</option>
          </select>
        </div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Speed Override</label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={selectedEntry.speedMiPerSec ?? ""}
            onChange={(event) =>
              onUpdateSelectedEntryField({
                speedMiPerSec: event.target.value
                  ? parseNumber(event.target.value, draft.playback.milesPerSecond)
                  : undefined,
              })
            }
            style={fieldStyle}
            placeholder="optional"
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.75rem", display: "grid", gap: "0.55rem" }}>
        <div style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>Subtitle</div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Subtitle Text</label>
          <textarea
            value={selectedSubtitle?.text || ""}
            onChange={(event) => onUpdateSelectedSubtitleText(event.target.value)}
            rows={3}
            style={fieldStyle}
          />
        </div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Hold Duration (sec)</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={selectedEntryHoldSeconds.toFixed(2)}
            onChange={(event) => onUpdateSelectedHoldSeconds(parseNumber(event.target.value, selectedEntryHoldSeconds))}
            style={fieldStyle}
            disabled={!selectedSubtitle}
          />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.75rem", display: "grid", gap: "0.55rem" }}>
        <div style={{ fontSize: "0.78rem", color: "#e2e8f0", fontWeight: 600 }}>Marker</div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Marker Type</label>
          <select
            value={selectedMarker?.type || "title"}
            onChange={(event) => onUpdateSelectedMarkerType(event.target.value as RouteMediaMarker["type"])}
            style={fieldStyle}
            disabled={!selectedMarker}
          >
            <option value="poi">poi</option>
            <option value="title">title</option>
            <option value="subtitle">subtitle</option>
            <option value="custom">custom</option>
          </select>
        </div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Marker Title</label>
          <input
            value={selectedMarker?.title || ""}
            onChange={(event) => onUpdateSelectedMarkerTitle(event.target.value)}
            style={fieldStyle}
            disabled={!selectedMarker}
          />
        </div>
        <div style={{ display: "grid", gap: "0.45rem" }}>
          <label style={labelStyle}>Marker Body</label>
          <textarea
            value={selectedMarker?.body || ""}
            onChange={(event) => onUpdateSelectedMarkerBody(event.target.value)}
            rows={2}
            style={fieldStyle}
            disabled={!selectedMarker}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemoveSelectedEntry}
        style={{
          marginTop: "0.3rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "7px",
          border: "1px solid #7f1d1d",
          background: "#2a1212",
          color: "#fecaca",
          cursor: "pointer",
          fontSize: "0.8rem",
          fontWeight: 600,
        }}
      >
        Remove Entry
      </button>
    </div>
  );
}
