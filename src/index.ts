import {
  listRouteGroups,
  loadEventsMaster,
  loadEventsSelection,
  loadWorkoutsMaster,
} from "./sharedData";
import { SHARED_DATA_ROOT } from "./paths";

function assertArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`[Studio] Expected ${label} to be an array.`);
  }
  return value;
}

function main(): void {
  console.log("[Studio] Shared data root resolved");
  console.log(`[Studio] Root: ${SHARED_DATA_ROOT}`);

  const routeGroups = listRouteGroups();
  console.log(`[Studio] Routes: ${routeGroups.length} group(s)`);

  const eventsMaster = loadEventsMaster() as { events?: unknown };
  const events = assertArray(eventsMaster.events, "events in events.master.json");
  console.log(`[Studio] Events (master): ${events.length}`);

  const eventsSelection = loadEventsSelection() as { selectedEventIds?: unknown };
  const selectedEvents = assertArray(
    eventsSelection.selectedEventIds,
    "selectedEventIds in events.selection.json"
  );
  console.log(`[Studio] Events (selected): ${selectedEvents.length}`);

  const workoutsMaster = loadWorkoutsMaster() as { workouts?: unknown };
  const workouts = assertArray(workoutsMaster.workouts, "workouts in workouts.master.json");
  console.log(`[Studio] Workouts: ${workouts.length}`);
}

main();
