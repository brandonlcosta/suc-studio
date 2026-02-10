import { useEffect, useState } from "react";
import { loadEventsMaster } from "../utils/api";
import type { Event } from "../types";

export type EventSummary = {
  eventId: string;
  eventName: string;
  eventDate?: string;
  type: "crew-run" | "training-run" | "race" | "camp" | "social";
};

type UseEventsResult = {
  events: EventSummary[];
  isLoading: boolean;
  error: string | null;
};

function normalizeEvent(event: Event): EventSummary | null {
  if (!event || !event.eventId) return null;
  return {
    eventId: event.eventId,
    eventName: event.eventName || event.eventId,
    eventDate: event.eventDate,
    type: event.type ?? "training-run",
  };
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const master = await loadEventsMaster();
        const list = Array.isArray(master.events) ? master.events : [];
        const normalized = list.map(normalizeEvent).filter(Boolean) as EventSummary[];
        normalized.sort((a, b) => a.eventName.localeCompare(b.eventName));
        if (active) {
          setEvents(normalized);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load events.";
        if (active) {
          setError(message);
          setEvents([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return { events, isLoading, error };
}
