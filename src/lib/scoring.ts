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

  // USA pool play — all-or-nothing across all 3 matches
  USA_ALL_CORRECT_PTS: 15,

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

  // Pre-tournament podium picks
  CHAMPION_PTS:    15,
  RUNNER_UP_PTS:    8,
  THIRD_PLACE_PTS:  4,
} as const;

// ---------------------------------------------------------------------------
// calculateScore
//
// Pure function — no Firestore access. Called from /api/recalculate and
// the client-side What If simulator.
//
// Max possible score:
//   Group stage:  96 pts  (72 advance + 24 top seed)
//   USA W/D/L:    15 pts  (all-or-nothing)
//   Knockout:    176 pts  (32×5 rounds + 16 3rd-place match)
//   Top 3 bonus:  27 pts  (15 + 8 + 4)
//   ─────────────────────
//   Total:       314 pts
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

    const actualAdvancers = new Set(result.finalStandings.slice(0, 2));
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

  // ── USA pool play (all-or-nothing) ────────────────────────────────────────

  const usaResults  = bracket.usaMatchResults ?? {};
  const usaPreds    = predictions.usaMatchPredictions ?? {};
  const allUsaSet   = USA_MATCHES.every(m => !!usaResults[m.id]);
  const allUsaRight = USA_MATCHES.every(m => usaResults[m.id] != null && usaPreds[m.id] === usaResults[m.id]);

  if (allUsaSet) {
    const pts = allUsaRight ? SCORING.USA_ALL_CORRECT_PTS : 0;
    breakdown.push({ group: 'USA', points: pts, details: { allCorrect: allUsaRight ? 1 : 0 } });
    total += pts;
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

  // Any of your 3 picks that finish anywhere in the actual top 3 earns points.
  // Points per slot reflect how bold the pick was (champion > runner-up > 3rd).
  const actualTop3 = new Set([champion, runnerUp, thirdPlace].filter(Boolean) as string[]);
  const top3       = predictions.topThreePredictions;
  const top3Result: Record<string, number> = {};
  let top3Pts = 0;

  if (top3 && actualTop3.size > 0) {
    if (top3.champion   && actualTop3.has(top3.champion))   { top3Result.champion   = SCORING.CHAMPION_PTS;    top3Pts += SCORING.CHAMPION_PTS;    }
    if (top3.runnerUp   && actualTop3.has(top3.runnerUp))   { top3Result.runnerUp   = SCORING.RUNNER_UP_PTS;   top3Pts += SCORING.RUNNER_UP_PTS;   }
    if (top3.thirdPlace && actualTop3.has(top3.thirdPlace)) { top3Result.thirdPlace = SCORING.THIRD_PLACE_PTS; top3Pts += SCORING.THIRD_PLACE_PTS; }
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
