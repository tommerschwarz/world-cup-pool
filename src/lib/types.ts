export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC' | 'OTHER';
export type Stage = 'GROUP' | 'R32' | 'R16' | 'QF' | 'SF' | '3RD' | 'FINAL';

// W = USA wins, D = draw, L = USA loses
export type UsaOutcome = 'W' | 'D' | 'L';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  group: string;
  confederation: Confederation;
  flagEmoji: string;
}

export interface Match {
  id: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  group?: string;
  stage: Stage;
  startTime: string;
  matchNumber: number;
  result?: MatchResult;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homeGoalsET?: number;
  awayGoalsET?: number;
  homePenalties?: number;
  awayPenalties?: number;
  winnerId?: string;
}

export interface GroupResult {
  finalStandings: string[];
}

export interface BracketConfig {
  teams: Record<string, Team>;
  matches: Record<string, Match>;
  groupResults?: Record<string, GroupResult>;
  // Actual outcomes of USA's pool play games, set by admin
  usaMatchResults?: Record<string, UsaOutcome>; // usaMatchId → W/D/L
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// User predictions
// ---------------------------------------------------------------------------

export interface GroupPrediction {
  advancingTeamIds: string[];
  topSeedId: string | null;
}

// Unordered — user picks any 3 teams; points awarded based on actual finish position
export interface TopThreePrediction {
  pick1: string | null;
  pick2: string | null;
  pick3: string | null;
}

export interface UserPredictions {
  uid: string;
  displayName: string;
  email: string;
  groupPredictions: Record<string, GroupPrediction>;
  // W/D/L prediction per USA match ID
  usaMatchPredictions: Record<string, UsaOutcome | null>;
  // matchId → predicted winner teamId (knockout rounds)
  knockoutPredictions?: Record<string, string>;
  // Pre-tournament podium picks
  topThreePredictions?: TopThreePrediction;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  group: string;
  points: number;
  details: Record<string, number>;
}

export interface UserScore {
  uid: string;
  displayName: string;
  email: string;
  total: number;
  breakdown: ScoreBreakdown[];
  prizeEligible: boolean;
  updatedAt: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  email: string;
  total: number;
  rank: number;
  prizeEligible: boolean;
}

export interface SimulatedGroupResult {
  group: string;
  advancingTeamIds: string[];
  topSeedId: string | null;
}
