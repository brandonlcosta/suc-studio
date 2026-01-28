export type RouteLabel = "MED" | "LRG" | "XL" | "XXL";

export type RouteOrigin =
  | {
      kind: "source";
      sourcePath: string;
    }
  | {
      kind: "compiled";
      statsUrl: string;
      geojsonUrl: string;
    };

export interface StagedRoute {
  id: string;
  fileName: string;
  coords: [number, number][]; // [lon, lat] pairs
  elevations: number[]; // meters
  distanceMi: number;
  elevationFt: number;
  label: RouteLabel;
  origin: RouteOrigin;
  geojsonPreview?: GeoJSON.Feature;
}

export interface EventDraft {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventTime: string;
  startLocationName: string;
  startLocationUrl: string;
  startLocationCoordinates: {
    lat: string;
    lng: string;
  };
}
