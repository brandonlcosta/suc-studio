import {
  listRouteGroups,
  loadEventsMaster,
  loadEventsSelection,
  loadWorkoutsMaster,
} from "./sharedData";
import { SHARED_DATA_ROOT } from "./paths";
import { selectEventInSelection } from "./writeSelection";

function assertArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`[Studio] Expected ${label} to be an array.`);
  }
  return value;
}

function printHelp(): void {
  console.log("Usage:");
  console.log("  npm run studio");
  console.log("  npm run studio select-event <EVENT_ID>");
}

function runSummary(): void {
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

function runSelectEvent(args: string[]): void {
  if (args.length !== 1) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const eventId = args[0];
  const result = selectEventInSelection(eventId);
  if (result === "already") {
    console.log(`[Studio] Event ${eventId} already selected — no changes made`);
    return;
  }

  console.log(`[Studio] Selected event: ${eventId}`);
  console.log("[Studio] events.selection.json updated");
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    runSummary();
    return;
  }

  const [command, ...rest] = args;
  if (command === "select-event") {
    runSelectEvent(rest);
    return;
  }

  printHelp();
  process.exitCode = 1;
}

main();
