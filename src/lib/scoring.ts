import type {
  UserPredictions,
  BracketConfig,
  GroupPrediction,
  GroupResult,
  ScoreBreakdown,
  SimulatedGroupResult,
  Stage,
  Match,
} from './types';
import { USA_MATCHES, BRACKET_SOURCES, BRACKET_ROUNDS } from './wc2026-data';

// ---------------------------------------------------------------------------
// Scoring constants — imported by the rules page for display
// ---------------------------------------------------------------------------

export const SCORING = {
  // Group stage (per group, 12 groups)
  ADVANCE_PTS:  3,   // per correctly predicted advancing team (max 2 × 12 = 24 picks → 72 pts)
  TOP_SEED_PTS: 2,   // bonus for correct group winner             (max 12 picks → 24 pts)

  // USA pool play — 8 pts per correct W/D/L prediction (max 3 × 8 = 24)
  USA_PER_MATCH_PTS: 8,

  // Knockout stage — each MAIN round is worth ROUND_TOTAL_PTS pts total
  // Points per correct pick = ROUND_TOTAL_PTS / number_of_matches_in_round
  ROUND_TOTAL_PTS: 32,
  KNOCKOUT_PER_MATCH: {
    R32:   2,   // 16 matches × 2 = 32
    R16:   4,   //  8 matches × 4 = 32
    QF:    8,   //  4 matches × 8 = 32
    SF:   16,   //  2 matches × 16 = 32
    '3RD':  8,  //  1 match  ×  8 =  8 (consolation — quarter round)
    FINAL: 32,  //  1 match  × 32 = 32
  } as Partial<Record<Stage, number>>,

  // Pre-tournament top-3 picks (unordered) — points by actual finishing position
  TOP3_FIRST_PTS:  15,  // one of your picks finishes 1st
  TOP3_SECOND_PTS:  8,  // one of your picks finishes 2nd
  TOP3_THIRD_PTS:   4,  // one of your picks finishes 3rd
} as const;

// ---------------------------------------------------------------------------
// stageFromMatchId — derives Stage from the match ID string, used as a
// fallback when Firestore data is missing the stage field (setResult stored
// only winnerId for R16+ matches).
// ---------------------------------------------------------------------------

export function stageFromMatchId(matchId: string): Stage | null {
  if (matchId.startsWith('r32'))   return 'R32';
  if (matchId.startsWith('r16'))   return 'R16';
  if (matchId.startsWith('qf'))    return 'QF';
  if (matchId === 'sf_3rd')        return '3RD';
  if (matchId.startsWith('sf'))    return 'SF';
  if (matchId === 'final')         return 'FINAL';
  return null;
}

// ---------------------------------------------------------------------------
// calculateScore
//
// Pure function — no Firestore access. Called from /api/recalculate and
// the client-side What If simulator.
//
// Max possible score:
//   Group stage:  96 pts  (72 advance + 24 top seed)
//   USA W/D/L:    24 pts  (8 pts × 3 matches)
//   Knockout:    176 pts  (32×5 rounds + 16 3rd-place match)
//   Top 3 bonus:  27 pts  (15 + 8 + 4)
//   ─────────────────────
//   Total:       323 pts
// ---------------------------------------------------------------------------

export function calculateScore(
  predictions: UserPredictions,
  bracket: BracketConfig,
  simulatedResults?: Record<string, SimulatedGroupResult>
): { total: number; breakdown: ScoreBreakdown[] } {
  const breakdown: ScoreBreakdown[] = [];
  let total = 0;

  // ── Group stage ────────────────────────────────────────────────────────────

  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  for (const group of groups) {
    const result: GroupResult | undefined =
      simulatedResults?.[group]
        ? toGroupResult(simulatedResults[group])
        : bracket.groupResults?.[group];

    if (!result) continue;

    const prediction: GroupPrediction | undefined =
      predictions.groupPredictions?.[group];

    if (!prediction) continue;

    const details: Record<string, number> = {};
    let groupPoints = 0;

    const numAdvancers    = result.thirdAdvances ? 3 : 2;
    const actualAdvancers = new Set(result.finalStandings.slice(0, numAdvancers));
    const actualTopSeed   = result.finalStandings[0];

    for (const teamId of prediction.advancingTeamIds) {
      if (actualAdvancers.has(teamId)) {
        details[`advance_${teamId}`] = SCORING.ADVANCE_PTS;
        groupPoints += SCORING.ADVANCE_PTS;
      }
    }

    if (prediction.topSeedId && prediction.topSeedId === actualTopSeed) {
      details.topSeed = SCORING.TOP_SEED_PTS;
      groupPoints += SCORING.TOP_SEED_PTS;
    }

    breakdown.push({ group, points: groupPoints, details });
    total += groupPoints;
  }

  // ── USA pool play (8 pts per correct match) ───────────────────────────────

  const usaResults = bracket.usaMatchResults ?? {};
  const usaPreds   = predictions.usaMatchPredictions ?? {};
  const usaDetails: Record<string, number> = {};
  let usaPts = 0;

  for (const match of USA_MATCHES) {
    if (usaResults[match.id] != null && usaPreds[match.id] === usaResults[match.id]) {
      usaDetails[match.id] = SCORING.USA_PER_MATCH_PTS;
      usaPts += SCORING.USA_PER_MATCH_PTS;
    }
  }

  if (USA_MATCHES.some(m => !!usaResults[m.id])) {
    breakdown.push({ group: 'USA', points: usaPts, details: usaDetails });
    total += usaPts;
  }

  // ── Knockout rounds ────────────────────────────────────────────────────────

  const knockoutPreds = predictions.knockoutPredictions ?? {};
  const knockoutByStage: Record<string, { pts: number; details: Record<string, number> }> = {};

  for (const match of Object.values(bracket.matches)) {
    // match.stage may be undefined for R16+ results (setResult never stored stage)
    const stage: Stage | undefined = (match.stage as Stage | undefined) ?? stageFromMatchId(match.id) ?? undefined;
    if (!stage || stage === 'GROUP') continue;
    const ptsPerMatch = SCORING.KNOCKOUT_PER_MATCH[stage];
    if (ptsPerMatch == null || !match.result?.winnerId) continue;

    const predicted = knockoutPreds[match.id];
    const correct   = predicted === match.result.winnerId;

    if (!knockoutByStage[stage]) knockoutByStage[stage] = { pts: 0, details: {} };
    if (correct) {
      knockoutByStage[stage].pts += ptsPerMatch;
      knockoutByStage[stage].details[match.id] = ptsPerMatch;
    }
  }

  for (const [stage, { pts, details }] of Object.entries(knockoutByStage)) {
    breakdown.push({ group: stage, points: pts, details });
    total += pts;
  }

  // ── Top 3 bonus ────────────────────────────────────────────────────────────

  const finalMatch = Object.values(bracket.matches).find(m => m.stage === 'FINAL');
  const thirdMatch = Object.values(bracket.matches).find(m => m.stage === '3RD');

  const champion   = finalMatch?.result?.winnerId ?? null;
  const runnerUp   = champion && finalMatch
    ? (finalMatch.homeTeamId === champion ? finalMatch.awayTeamId : finalMatch.homeTeamId)
    : null;
  const thirdPlace = thirdMatch?.result?.winnerId ?? null;

  // User picks any 3 teams (unordered). Points are awarded based on actual finish:
  //   1st place match → TOP3_FIRST_PTS, 2nd → TOP3_SECOND_PTS, 3rd → TOP3_THIRD_PTS
  const top3    = predictions.topThreePredictions;
  const userSet = new Set([top3?.pick1, top3?.pick2, top3?.pick3].filter(Boolean) as string[]);
  const top3Result: Record<string, number> = {};
  let top3Pts = 0;

  if (top3 && userSet.size > 0) {
    if (champion   && userSet.has(champion))   { top3Result.first  = SCORING.TOP3_FIRST_PTS;  top3Pts += SCORING.TOP3_FIRST_PTS;  }
    if (runnerUp   && userSet.has(runnerUp))   { top3Result.second = SCORING.TOP3_SECOND_PTS; top3Pts += SCORING.TOP3_SECOND_PTS; }
    if (thirdPlace && userSet.has(thirdPlace)) { top3Result.third  = SCORING.TOP3_THIRD_PTS;  top3Pts += SCORING.TOP3_THIRD_PTS;  }
  }

  if (Object.keys(top3Result).length > 0) {
    breakdown.push({ group: 'TOP3', points: top3Pts, details: top3Result });
    total += top3Pts;
  }

  return { total, breakdown };
}

// ---------------------------------------------------------------------------
// Bracket helpers — needed to resolve actual teams in later rounds
// ---------------------------------------------------------------------------

function actualTeamInSlot(matchId: string, slot: 'home' | 'away', matches: Record<string, Match>): string | null {
  if (matchId.startsWith('r32')) {
    const m = matches[matchId];
    return slot === 'home' ? (m?.homeTeamId ?? null) : (m?.awayTeamId ?? null);
  }
  const sources = BRACKET_SOURCES[matchId];
  if (!sources) return null;
  const [srcA, srcB] = sources;
  const feederId = slot === 'home' ? srcA : srcB;
  const feederWinner = matches[feederId]?.result?.winnerId ?? null;
  if (!feederWinner) return null;
  if (matchId === 'sf_3rd') {
    const fHome = actualTeamInSlot(feederId, 'home', matches);
    const fAway = actualTeamInSlot(feederId, 'away', matches);
    return feederWinner === fHome ? fAway : fHome;
  }
  return feederWinner;
}

function buildEliminatedSet(matches: Record<string, Match>): Set<string> {
  const out = new Set<string>();
  for (const match of Object.values(matches)) {
    if (!match.result?.winnerId) continue;
    const winner = match.result.winnerId;
    const home = actualTeamInSlot(match.id, 'home', matches);
    const away = actualTeamInSlot(match.id, 'away', matches);
    if (home && home !== winner) out.add(home);
    if (away && away !== winner) out.add(away);
  }
  return out;
}

// ---------------------------------------------------------------------------
// calculateMaxScore — current score + max still-earnable points based on
// each user's specific picks and which teams are still alive.
// ---------------------------------------------------------------------------

export function calculateMaxScore(predictions: UserPredictions, bracket: BracketConfig): number {
  const { total: current } = calculateScore(predictions, bracket);
  let remaining = 0;
  const matches   = bracket.matches ?? {};
  const eliminated = buildEliminatedSet(matches);

  // Groups: for any group without a result, user's picks could all be correct
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  for (const group of groups) {
    if (bracket.groupResults?.[group]) continue;
    const pred = predictions.groupPredictions?.[group];
    if (!pred) continue;
    remaining += pred.advancingTeamIds.length * SCORING.ADVANCE_PTS;
    if (pred.topSeedId) remaining += SCORING.TOP_SEED_PTS;
  }

  // USA: undecided matches with picks (W/D/L outcomes, not team-based)
  const usaResults = bracket.usaMatchResults ?? {};
  for (const match of USA_MATCHES) {
    if (usaResults[match.id] != null) continue;
    if (predictions.usaMatchPredictions?.[match.id] != null) remaining += SCORING.USA_PER_MATCH_PTS;
  }

  // Knockout: undecided matches where the user's picked team is still alive.
  // Iterate ALL bracket match IDs (not just Firestore entries) — undecided
  // R16+/QF/SF/Final matches have no Firestore doc until a result is set.
  const knockoutPreds = predictions.knockoutPredictions ?? {};
  for (const { matchIds } of BRACKET_ROUNDS) {
    for (const matchId of matchIds) {
      if (matches[matchId]?.result?.winnerId) continue; // already decided
      const stage = stageFromMatchId(matchId);
      if (!stage) continue;
      const ptsPerMatch = SCORING.KNOCKOUT_PER_MATCH[stage];
      if (!ptsPerMatch) continue;
      const pick = knockoutPreds[matchId];
      if (pick && !eliminated.has(pick)) remaining += ptsPerMatch;
    }
  }

  // Top 3 (podium picks): greedily assign still-alive picks to undecided positions.
  // A pick only counts if the team isn't eliminated.
  // Positions: champion (15), runner-up (8), 3rd place (4) — assigned highest-value first.
  const top3 = predictions.topThreePredictions;
  const top3Picks = [...new Set([top3?.pick1, top3?.pick2, top3?.pick3].filter(Boolean) as string[])];

  if (top3Picks.length > 0) {
    const champion   = matches['final']?.result?.winnerId ?? null;
    const sf1Winner  = matches['sf_01']?.result?.winnerId ?? null;
    const sf2Winner  = matches['sf_02']?.result?.winnerId ?? null;
    const runnerUp   = champion
      ? (champion === sf1Winner ? sf2Winner : champion === sf2Winner ? sf1Winner : null)
      : null;
    const thirdPlace = matches['sf_3rd']?.result?.winnerId ?? null;

    // Picks already matched to a decided position can't earn points for undecided ones
    const usedPicks = new Set<string>();
    if (champion   && top3Picks.includes(champion))   usedPicks.add(champion);
    if (runnerUp   && top3Picks.includes(runnerUp))   usedPicks.add(runnerUp);
    if (thirdPlace && top3Picks.includes(thirdPlace)) usedPicks.add(thirdPlace);

    let available = top3Picks.filter(p => !eliminated.has(p) && !usedPicks.has(p)).length;

    if (!champion   && available > 0) { remaining += SCORING.TOP3_FIRST_PTS;  available--; }
    if (!runnerUp   && available > 0) { remaining += SCORING.TOP3_SECOND_PTS; available--; }
    if (!thirdPlace && available > 0) { remaining += SCORING.TOP3_THIRD_PTS;  available--; }
  }

  return current + remaining;
}

function toGroupResult(sim: SimulatedGroupResult): GroupResult {
  const standings = [...sim.advancingTeamIds];
  if (sim.topSeedId) {
    const idx = standings.indexOf(sim.topSeedId);
    if (idx > 0) { standings.splice(idx, 1); standings.unshift(sim.topSeedId); }
  }
  return { finalStandings: standings };
}
