// ---------------------------------------------------------------------------
// FIFA World Cup 2026 — official group draw (December 5, 2025)
// 48 teams, 12 groups of 4 (A–L)
// Hosts: USA (Group D), Canada (Group B), Mexico (Group A)
// ---------------------------------------------------------------------------

import type { Team, BracketConfig, Stage } from './types';

export const TEAMS: Team[] = [
  // --- Group A ---
  { id: 'mex', name: 'Mexico',          shortName: 'MEX', group: 'A', confederation: 'CONCACAF', flagEmoji: '🇲🇽' },
  { id: 'kor', name: 'South Korea',     shortName: 'KOR', group: 'A', confederation: 'AFC',      flagEmoji: '🇰🇷' },
  { id: 'rsa', name: 'South Africa',    shortName: 'RSA', group: 'A', confederation: 'CAF',      flagEmoji: '🇿🇦' },
  { id: 'cze', name: 'Czechia',         shortName: 'CZE', group: 'A', confederation: 'UEFA',     flagEmoji: '🇨🇿' },

  // --- Group B ---
  { id: 'can', name: 'Canada',          shortName: 'CAN', group: 'B', confederation: 'CONCACAF', flagEmoji: '🇨🇦' },
  { id: 'sui', name: 'Switzerland',     shortName: 'SUI', group: 'B', confederation: 'UEFA',     flagEmoji: '🇨🇭' },
  { id: 'qat', name: 'Qatar',           shortName: 'QAT', group: 'B', confederation: 'AFC',      flagEmoji: '🇶🇦' },
  { id: 'bih', name: 'Bosnia & Herz.', shortName: 'BIH', group: 'B', confederation: 'UEFA',     flagEmoji: '🇧🇦' },

  // --- Group C ---
  { id: 'bra', name: 'Brazil',          shortName: 'BRA', group: 'C', confederation: 'CONMEBOL', flagEmoji: '🇧🇷' },
  { id: 'mar', name: 'Morocco',         shortName: 'MAR', group: 'C', confederation: 'CAF',      flagEmoji: '🇲🇦' },
  { id: 'sco', name: 'Scotland',        shortName: 'SCO', group: 'C', confederation: 'UEFA',     flagEmoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { id: 'hai', name: 'Haiti',           shortName: 'HAI', group: 'C', confederation: 'CONCACAF', flagEmoji: '🇭🇹' },

  // --- Group D ---
  { id: 'usa', name: 'United States',   shortName: 'USA', group: 'D', confederation: 'CONCACAF', flagEmoji: '🇺🇸' },
  { id: 'par', name: 'Paraguay',        shortName: 'PAR', group: 'D', confederation: 'CONMEBOL', flagEmoji: '🇵🇾' },
  { id: 'aus', name: 'Australia',       shortName: 'AUS', group: 'D', confederation: 'AFC',      flagEmoji: '🇦🇺' },
  { id: 'tur', name: 'Turkey',          shortName: 'TUR', group: 'D', confederation: 'UEFA',     flagEmoji: '🇹🇷' },

  // --- Group E ---
  { id: 'ger', name: 'Germany',         shortName: 'GER', group: 'E', confederation: 'UEFA',     flagEmoji: '🇩🇪' },
  { id: 'ecu', name: 'Ecuador',         shortName: 'ECU', group: 'E', confederation: 'CONMEBOL', flagEmoji: '🇪🇨' },
  { id: 'civ', name: 'Ivory Coast',     shortName: 'CIV', group: 'E', confederation: 'CAF',      flagEmoji: '🇨🇮' },
  { id: 'cur', name: 'Curaçao',         shortName: 'CUW', group: 'E', confederation: 'CONCACAF', flagEmoji: '🇨🇼' },

  // --- Group F ---
  { id: 'ned', name: 'Netherlands',     shortName: 'NED', group: 'F', confederation: 'UEFA',     flagEmoji: '🇳🇱' },
  { id: 'jpn', name: 'Japan',           shortName: 'JPN', group: 'F', confederation: 'AFC',      flagEmoji: '🇯🇵' },
  { id: 'tun', name: 'Tunisia',         shortName: 'TUN', group: 'F', confederation: 'CAF',      flagEmoji: '🇹🇳' },
  { id: 'swe', name: 'Sweden',          shortName: 'SWE', group: 'F', confederation: 'UEFA',     flagEmoji: '🇸🇪' },

  // --- Group G ---
  { id: 'bel', name: 'Belgium',         shortName: 'BEL', group: 'G', confederation: 'UEFA',     flagEmoji: '🇧🇪' },
  { id: 'irn', name: 'Iran',            shortName: 'IRN', group: 'G', confederation: 'AFC',      flagEmoji: '🇮🇷' },
  { id: 'egy', name: 'Egypt',           shortName: 'EGY', group: 'G', confederation: 'CAF',      flagEmoji: '🇪🇬' },
  { id: 'nzl', name: 'New Zealand',     shortName: 'NZL', group: 'G', confederation: 'OFC',      flagEmoji: '🇳🇿' },

  // --- Group H ---
  { id: 'esp', name: 'Spain',           shortName: 'ESP', group: 'H', confederation: 'UEFA',     flagEmoji: '🇪🇸' },
  { id: 'uru', name: 'Uruguay',         shortName: 'URU', group: 'H', confederation: 'CONMEBOL', flagEmoji: '🇺🇾' },
  { id: 'ksa', name: 'Saudi Arabia',    shortName: 'KSA', group: 'H', confederation: 'AFC',      flagEmoji: '🇸🇦' },
  { id: 'cpv', name: 'Cape Verde',      shortName: 'CPV', group: 'H', confederation: 'CAF',      flagEmoji: '🇨🇻' },

  // --- Group I ---
  { id: 'fra', name: 'France',          shortName: 'FRA', group: 'I', confederation: 'UEFA',     flagEmoji: '🇫🇷' },
  { id: 'sen', name: 'Senegal',         shortName: 'SEN', group: 'I', confederation: 'CAF',      flagEmoji: '🇸🇳' },
  { id: 'nor', name: 'Norway',          shortName: 'NOR', group: 'I', confederation: 'UEFA',     flagEmoji: '🇳🇴' },
  { id: 'irq', name: 'Iraq',            shortName: 'IRQ', group: 'I', confederation: 'AFC',      flagEmoji: '🇮🇶' },

  // --- Group J ---
  { id: 'arg', name: 'Argentina',       shortName: 'ARG', group: 'J', confederation: 'CONMEBOL', flagEmoji: '🇦🇷' },
  { id: 'aut', name: 'Austria',         shortName: 'AUT', group: 'J', confederation: 'UEFA',     flagEmoji: '🇦🇹' },
  { id: 'alg', name: 'Algeria',         shortName: 'ALG', group: 'J', confederation: 'CAF',      flagEmoji: '🇩🇿' },
  { id: 'jor', name: 'Jordan',          shortName: 'JOR', group: 'J', confederation: 'AFC',      flagEmoji: '🇯🇴' },

  // --- Group K ---
  { id: 'por', name: 'Portugal',        shortName: 'POR', group: 'K', confederation: 'UEFA',     flagEmoji: '🇵🇹' },
  { id: 'col', name: 'Colombia',        shortName: 'COL', group: 'K', confederation: 'CONMEBOL', flagEmoji: '🇨🇴' },
  { id: 'uzb', name: 'Uzbekistan',      shortName: 'UZB', group: 'K', confederation: 'AFC',      flagEmoji: '🇺🇿' },
  { id: 'cod', name: 'DR Congo',        shortName: 'COD', group: 'K', confederation: 'CAF',      flagEmoji: '🇨🇩' },

  // --- Group L ---
  { id: 'eng', name: 'England',         shortName: 'ENG', group: 'L', confederation: 'UEFA',     flagEmoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'cro', name: 'Croatia',         shortName: 'CRO', group: 'L', confederation: 'UEFA',     flagEmoji: '🇭🇷' },
  { id: 'pan', name: 'Panama',          shortName: 'PAN', group: 'L', confederation: 'CONCACAF', flagEmoji: '🇵🇦' },
  { id: 'gha', name: 'Ghana',           shortName: 'GHA', group: 'L', confederation: 'CAF',      flagEmoji: '🇬🇭' },
];

// ---------------------------------------------------------------------------
// Bracket config builder — groups only (no match-level data needed for
// the group-prediction model; knockout matches are placeholders)
// ---------------------------------------------------------------------------

export function buildInitialBracket(): BracketConfig {
  const teams: Record<string, Team> = {};
  for (const t of TEAMS) teams[t.id] = t;

  return {
    teams,
    matches: {},      // not used for group-prediction model
    groupResults: {}, // filled by admin after group stage
    updatedAt: new Date().toISOString(),
  };
}

export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;
export type GroupLetter = typeof GROUPS[number];

export function getGroupTeams(teams: Record<string, Team>, group: string): Team[] {
  return Object.values(teams).filter(t => t.group === group);
}

export const STAGE_LABELS: Record<string, string> = {
  GROUP: 'Group Stage',
  R32:   'Round of 32',
  R16:   'Round of 16',
  QF:    'Quarter-finals',
  SF:    'Semi-finals',
  '3RD': '3rd Place',
  FINAL: 'Final',
};

// All group picks lock at tournament kickoff — Jun 11 12:00 PM PDT (19:00 UTC).
// The 5-min buffer in isGroupLocked means the UI locks at 11:55 AM PDT.
const TOURNAMENT_KICKOFF = '2026-06-11T19:00:00Z';
export const GROUP_LOCK_TIMES: Record<string, string> = {
  A: TOURNAMENT_KICKOFF,
  B: TOURNAMENT_KICKOFF,
  C: TOURNAMENT_KICKOFF,
  D: TOURNAMENT_KICKOFF,
  E: TOURNAMENT_KICKOFF,
  F: TOURNAMENT_KICKOFF,
  G: TOURNAMENT_KICKOFF,
  H: TOURNAMENT_KICKOFF,
  I: TOURNAMENT_KICKOFF,
  J: TOURNAMENT_KICKOFF,
  K: TOURNAMENT_KICKOFF,
  L: TOURNAMENT_KICKOFF,
};

export function isGroupLocked(group: string): boolean {
  const lockTime = GROUP_LOCK_TIMES[group];
  if (!lockTime) return false;
  return Date.now() >= new Date(lockTime).getTime() - 5 * 60 * 1000;
}

// Tournament-wide lock — used for top-3 podium picks (locks with first match)
export function isTournamentLocked(): boolean {
  return isGroupLocked('A');
}

// ---------------------------------------------------------------------------
// USA pool-play matches
// ---------------------------------------------------------------------------

export interface UsaMatch {
  id: string;
  opponentId: string;
  opponentName: string;
  opponentFlag: string;
  displayDate: string; // shown in UI
  startTime: string;   // ISO UTC — used for lock timing
}

export const USA_MATCHES: UsaMatch[] = [
  { id: 'usa_par', opponentId: 'par', opponentName: 'Paraguay',  opponentFlag: '🇵🇾', displayDate: 'Jun 12, 9 PM EDT',  startTime: '2026-06-13T01:00:00Z' },
  { id: 'usa_aus', opponentId: 'aus', opponentName: 'Australia', opponentFlag: '🇦🇺', displayDate: 'Jun 19, 3 PM EDT',  startTime: '2026-06-19T19:00:00Z' },
  { id: 'usa_tur', opponentId: 'tur', opponentName: 'Türkiye',   opponentFlag: '🇹🇷', displayDate: 'Jun 25, 10 PM EDT', startTime: '2026-06-26T02:00:00Z' },
];

export function isUsaMatchLocked(matchId: string): boolean {
  const match = USA_MATCHES.find(m => m.id === matchId);
  if (!match) return false;
  return Date.now() >= new Date(match.startTime).getTime() - 5 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Knockout stage
// ---------------------------------------------------------------------------

// First R32 match: Sun Jun 28 3 PM EDT = 19:00 UTC
export const KNOCKOUT_LOCK_TIME = '2026-06-28T19:00:00Z';
export function isKnockoutLocked(): boolean {
  return Date.now() >= new Date(KNOCKOUT_LOCK_TIME).getTime() - 5 * 60 * 1000;
}

// R32 match IDs in bracket order
export const R32_MATCH_IDS = [
  'r32_01','r32_02','r32_03','r32_04',
  'r32_05','r32_06','r32_07','r32_08',
  'r32_09','r32_10','r32_11','r32_12',
  'r32_13','r32_14','r32_15','r32_16',
] as const;

// Which two feeder matches produce home/away for each later round match.
// sf_3rd is the 3rd-place match: its slots are the LOSERS of sf_01 and sf_02.
export const BRACKET_SOURCES: Record<string, readonly [string, string]> = {
  r16_01: ['r32_01','r32_02'],  r16_02: ['r32_03','r32_04'],
  r16_03: ['r32_05','r32_06'],  r16_04: ['r32_07','r32_08'],
  r16_05: ['r32_09','r32_10'],  r16_06: ['r32_11','r32_12'],
  r16_07: ['r32_13','r32_14'],  r16_08: ['r32_15','r32_16'],
  qf_01:  ['r16_01','r16_02'],  qf_02:  ['r16_03','r16_04'],
  qf_03:  ['r16_05','r16_06'],  qf_04:  ['r16_07','r16_08'],
  sf_01:  ['qf_01','qf_02'],    sf_02:  ['qf_03','qf_04'],
  final:  ['sf_01','sf_02'],
  sf_3rd: ['sf_01','sf_02'],    // losers
};

export const BRACKET_ROUNDS: { stage: Stage; label: string; matchIds: string[] }[] = [
  { stage: 'R32',   label: 'Round of 32',    matchIds: ['r32_01','r32_02','r32_03','r32_04','r32_05','r32_06','r32_07','r32_08','r32_09','r32_10','r32_11','r32_12','r32_13','r32_14','r32_15','r32_16'] },
  { stage: 'R16',   label: 'Round of 16',    matchIds: ['r16_01','r16_02','r16_03','r16_04','r16_05','r16_06','r16_07','r16_08'] },
  { stage: 'QF',    label: 'Quarter-finals', matchIds: ['qf_01','qf_02','qf_03','qf_04'] },
  { stage: 'SF',    label: 'Semi-finals',    matchIds: ['sf_01','sf_02'] },
  { stage: 'FINAL', label: 'Final & 3rd',    matchIds: ['final','sf_3rd'] },
];
