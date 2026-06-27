import type {
  UserPredictions,
  BracketConfig,
  GroupPrediction,
  GroupResult,
  ScoreBreakdown,
  SimulatedGroupResult,
  Stage,
} from './types';
import { USA_MATCHES } from './wc2026-data';

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
    const stage = match.stage;
    if (stage === 'GROUP') continue;
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

function toGroupResult(sim: SimulatedGroupResult): GroupResult {
  const standings = [...sim.advancingTeamIds];
  if (sim.topSeedId) {
    const idx = standings.indexOf(sim.topSeedId);
    if (idx > 0) { standings.splice(idx, 1); standings.unshift(sim.topSeedId); }
  }
  return { finalStandings: standings };
}
