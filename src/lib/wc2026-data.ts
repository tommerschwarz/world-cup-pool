// ---------------------------------------------------------------------------
// FIFA World Cup 2026 — official group draw (December 5, 2025)
// 48 teams, 12 groups of 4 (A–L)
// Hosts: USA (Group D), Canada (Group B), Mexico (Group A)
// ---------------------------------------------------------------------------

import type { Team, BracketConfig } from './types';

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

// Group stage locks when the first match of the group kicks off.
// These are approximate UTC times — update with official FIFA schedule.
export const GROUP_LOCK_TIMES: Record<string, string> = {
  A: '2026-06-11T20:00:00Z',
  B: '2026-06-12T17:00:00Z',
  C: '2026-06-12T20:00:00Z',
  D: '2026-06-12T23:00:00Z',
  E: '2026-06-13T17:00:00Z',
  F: '2026-06-13T20:00:00Z',
  G: '2026-06-13T23:00:00Z',
  H: '2026-06-14T17:00:00Z',
  I: '2026-06-14T20:00:00Z',
  J: '2026-06-14T23:00:00Z',
  K: '2026-06-15T17:00:00Z',
  L: '2026-06-15T20:00:00Z',
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
