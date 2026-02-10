export type TrackPoint = {
  lat: number;
  lon: number;
  ele?: number | null;
};

export type HighlightRange = {
  startIndex: number;
  endIndex: number;
};

export type RoutePoiMarker = {
  id: string;
  type: string;
  title?: string;
  label?: string;
  routePointIndex?: number;
};
