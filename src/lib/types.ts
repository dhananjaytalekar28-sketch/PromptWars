export type Role = "person" | "caregiver";

export interface Profile {
  role: Role;
  nickname?: string;
}

export interface Moment {
  id: string;
  updatedAt: string;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  chips: string[];
  voiceOrTextNote?: string;
  lastIntervention?: { steps: { title: string; body: string }[]; at: string };
  lastScripts?: {
    personScript: string;
    caregiverScript: string;
    at: string;
  };
  lastBriefing?: {
    briefing: string;
    doSay: string[];
    dontSay: string[];
    at: string;
  };
  lastLearnBlurb?: { cardId: string; blurb: string; at: string };
}

export const ALLOWED_CHIPS = [
  "craving",
  "triggered",
  "alone",
  "with-people",
  "after-slip",
  "anxious",
  "angry",
  "tired",
  "need-to-leave",
] as const;

export type ChipId = (typeof ALLOWED_CHIPS)[number];
