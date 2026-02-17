import type { WeekInstance } from "../../../season";

export type WeekWithIndex = {
  blockId: string;
  week: WeekInstance;
  globalWeekIndex: number;
  weekStartDate: Date;
  sucWeekId: string;
  weekLabel: string;
  weekRangeLabel: string;
  weekBounds: {
    monday: Date;
    sunday: Date;
  };
  weekBoundsIso: {
    monday: string;
    sunday: string;
  };
  eventBadgeNames: string[];
};

