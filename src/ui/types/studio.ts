export type WeekKey = `${number}-${number}`;

export interface Season {
  id: string;
  name: string;
  description?: string;
  startWeek: string;
  endWeek: string;
}

export type MilestoneType = "race" | "milestone";

export interface BlockMilestone {
  week: string;
  type: MilestoneType;
  label?: string;
}

export interface Block {
  id: string;
  seasonId: string;
  name: string;
  startWeek: string;
  lengthWeeks: number;
  intent: string;
  focusTags: string[];
  milestones: BlockMilestone[];
}

export interface Week {
  id: string;
  blockId: string;
  weekKey: string;
  indexInBlock: number;
  title: string;
  focusTags: string[];
  notes?: string;
}

export type RosterStatus = "active" | "paused" | "alumni";
export type RosterTier = "MED" | "LRG" | "XL";

export interface RosterMember {
  id: string;
  name: string;
  email: string;
  status: RosterStatus;
  tier: RosterTier;
  joinedDate: string;
  trainingGoal?: string;
  weeklyMileageRange?: string;
  consent: {
    publicName: boolean;
    publicStory: boolean;
    publicPhotos: boolean;
    publicMetrics: boolean;
  };
}

export type ChallengeRef = {
  type: "week" | "block";
  id: string;
};

export type ChallengeStatus = "active" | "archived";

export interface Challenge {
  id: string;
  name: string;
  description: string;
  intent: string;
  startRef: ChallengeRef;
  endRef: ChallengeRef;
  rules: string;
  linkedWorkouts?: string[];
  linkedRoutes?: string[];
  status: ChallengeStatus;
}
