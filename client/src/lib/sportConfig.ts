// L3: Shared SPORT_CONFIG — single source of truth used by PickCard and PickSubmissionDialog
import { Trophy, Shield, CircleDot, Activity } from "lucide-react";

export const SPORT_CONFIG = {
  "americanfootball_ncaaf": { label: "College Football", icon: Trophy, color: "text-neon-cyan" },
  "americanfootball_nfl": { label: "NFL", icon: Shield, color: "text-neon-magenta" },
  "baseball_mlb": { label: "MLB", icon: CircleDot, color: "text-neon-yellow" },
  "basketball_ncaab": { label: "Men's College Basketball", icon: Activity, color: "text-neon-green" },
  "basketball_nba": { label: "NBA", icon: Activity, color: "text-orange-400" },
} as const;
