import { useEffect, useState } from "react";
import ImportScreen from "./screens/ImportScreen";
import EventBuilderScreen from "./screens/EventBuilderScreen";
import ExportReviewScreen from "./screens/ExportReviewScreen";
import EventCompilerScreen from "./screens/EventCompilerScreen";
import type { EventDraft, StagedRoute } from "./types";

type Screen = "import" | "preview" | "event" | "export";

const emptyEvent: EventDraft = {
  eventId: "",
  eventName: "",
  eventDescription: "",
  eventDate: "",
  eventTime: "",
  startLocationName: "",
  startLocationUrl: "",
  startLocationCoordinates: {
    lat: "",
    lng: "",
  },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("import");
  const [routes, setRoutes] = useState<StagedRoute[]>([]);
  const [eventData, setEventData] = useState<EventDraft>(emptyEvent);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (screen !== "import") return;
    if (eventData.eventId) return;
    window.electron
      .invoke("get-next-event-id")
      .then((nextId) => {
        if (typeof nextId === "string") {
          setEventData((prev) => ({ ...prev, eventId: nextId }));
        }
      })
      .catch(() => {});
  }, [eventData.eventId, screen]);

  const handleBackToImport = () => {
    setScreen("import");
  };

  const handleStartEventBuilder = () => {
    if (routes.length === 0) return;
    setScreen("preview");
  };

  const handleReviewExport = () => {
    setExportError(null);
    setScreen("export");
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      routes.forEach((route) => {
        if (!route.origin) {
          throw new Error(
            "Invariant violation: route missing origin before export"
          );
        }
      });
      console.log(
        "EXPORT ROUTES",
        routes.map((route) => ({
          label: route.label,
          origin: route.origin,
        }))
      );
      const payload = {
        event: eventData,
        routes,
      };

      await window.electron.invoke("export-event", payload);
      setRoutes([]);
      setEventData(emptyEvent);
      setScreen("import");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  if (screen === "preview") {
    return (
      <EventBuilderScreen
        routes={routes}
        eventData={eventData}
        setEventData={setEventData}
        onBack={handleBackToImport}
        onNext={handleReviewExport}
      />
    );
  }

  if (screen === "export") {
    return (
      <ExportReviewScreen
        eventData={eventData}
        routes={routes}
        isExporting={isExporting}
        error={exportError}
        onBack={() => setScreen("preview")}
        onConfirm={handleExport}
      />
    );
  }

  if (screen === "event") {
    return <EventCompilerScreen onBack={() => setScreen("import")} />;
  }

  return (
    <ImportScreen
      routes={routes}
      setRoutes={setRoutes}
      onContinue={handleStartEventBuilder}
      onOpenCompiler={() => setScreen("event")}
      eventId={eventData.eventId}
    />
  );
}
