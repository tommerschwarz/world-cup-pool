'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { SCORING } from '@/lib/scoring';

export default function RulesPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Rules & Scoring</h1>
        <p className="text-slate-500 mb-10">How points are earned in the pool.</p>

        <div className="space-y-8">

          {/* Making predictions */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-4">Making Predictions</h2>
            <ul className="space-y-2 text-slate-600 text-sm leading-relaxed">
              <li>• For each group: pick 2 teams to advance and which finishes 1st.</li>
              <li>• Pick W / D / L for each of USA's 3 group-stage matches.</li>
              <li>• Pick your tournament podium: champion, runner-up, and 3rd-place finisher.</li>
              <li>• During the knockout stage: pick the winner of each match.</li>
              <li>• Picks lock automatically <strong className="text-slate-800">5 minutes before kick-off</strong>.</li>
              <li>• All predictions auto-save — no submit button needed.</li>
            </ul>
          </section>

          {/* Group stage */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-1">Group Stage</h2>
            <p className="text-sm text-slate-400 mb-4">Max {SCORING.ADVANCE_PTS * 24 + SCORING.TOP_SEED_PTS * 12} pts across 12 groups</p>
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="text-left text-slate-400 border-b border-sky-100">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                <tr>
                  <td className="py-2">Correct advancing team (per team, 2 per group)</td>
                  <td className="py-2 text-right font-mono text-sky-600">+{SCORING.ADVANCE_PTS}</td>
                </tr>
                <tr>
                  <td className="py-2">Bonus: correct group winner (1st place)</td>
                  <td className="py-2 text-right font-mono text-sky-600">+{SCORING.TOP_SEED_PTS}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* USA pool play */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-1">🇺🇸 USA Pool Play</h2>
            <p className="text-sm text-slate-400 mb-4">All or nothing — {SCORING.USA_ALL_CORRECT_PTS} pts</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pick Win / Draw / Loss for all 3 USA group-stage matches (vs Paraguay, Australia, Türkiye).
              If every prediction is correct, you earn <strong className="text-slate-800">{SCORING.USA_ALL_CORRECT_PTS} pts</strong>.
              If any pick is wrong, you earn 0.
            </p>
          </section>

          {/* Knockout stage */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-1">Knockout Stage</h2>
            <p className="text-sm text-slate-400 mb-4">
              March Madness style — each round is worth {SCORING.ROUND_TOTAL_PTS} pts total, so points double each round
            </p>
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="text-left text-slate-400 border-b border-sky-100">
                  <th className="pb-2 font-medium">Round</th>
                  <th className="pb-2 text-center font-medium">Matches</th>
                  <th className="pb-2 text-right font-medium">Pts / pick</th>
                  <th className="pb-2 text-right font-medium">Round total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {[
                  { label: 'Round of 32', stage: 'R32',   matches: 16 },
                  { label: 'Round of 16', stage: 'R16',   matches: 8  },
                  { label: 'Quarter-finals', stage: 'QF', matches: 4  },
                  { label: 'Semi-finals',  stage: 'SF',   matches: 2  },
                  { label: '3rd Place',    stage: '3RD',  matches: 1  },
                  { label: 'Final',        stage: 'FINAL',matches: 1  },
                ].map(({ label, stage, matches }) => {
                  const pts = SCORING.KNOCKOUT_PER_MATCH[stage as keyof typeof SCORING.KNOCKOUT_PER_MATCH] ?? 0;
                  return (
                    <tr key={stage}>
                      <td className="py-2">{label}</td>
                      <td className="py-2 text-center text-slate-400">{matches}</td>
                      <td className="py-2 text-right font-mono text-sky-600">+{pts}</td>
                      <td className="py-2 text-right font-mono text-slate-500">{pts * matches}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Tournament podium */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-1">Tournament Podium</h2>
            <p className="text-sm text-slate-400 mb-4">
              Pre-tournament picks — bonus on top of your bracket picks. Max {SCORING.TOP3_FIRST_PTS + SCORING.TOP3_SECOND_PTS + SCORING.TOP3_THIRD_PTS} pts
            </p>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Pick any 3 teams you think will finish in the top 3 — order doesn't matter.
              Earn points for each one based on where they actually finish.
            </p>
            <table className="w-full text-sm text-slate-600">
              <thead>
                <tr className="text-left text-slate-400 border-b border-sky-100">
                  <th className="pb-2 font-medium">If one of your picks finishes…</th>
                  <th className="pb-2 font-medium text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                <tr>
                  <td className="py-2">🥇 1st place</td>
                  <td className="py-2 text-right font-mono text-sky-600">+{SCORING.TOP3_FIRST_PTS}</td>
                </tr>
                <tr>
                  <td className="py-2">🥈 2nd place</td>
                  <td className="py-2 text-right font-mono text-sky-600">+{SCORING.TOP3_SECOND_PTS}</td>
                </tr>
                <tr>
                  <td className="py-2">🥉 3rd place</td>
                  <td className="py-2 text-right font-mono text-sky-600">+{SCORING.TOP3_THIRD_PTS}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Max possible */}
          <section className="bg-sky-500 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Maximum Possible Score</h2>
            <table className="w-full text-sm text-sky-100">
              <tbody className="divide-y divide-sky-400/50">
                {[
                  ['Group stage (advance picks)',    SCORING.ADVANCE_PTS * 24],
                  ['Group stage (top-seed bonus)',   SCORING.TOP_SEED_PTS * 12],
                  ['USA pool play (all-or-nothing)', SCORING.USA_ALL_CORRECT_PTS],
                  ['Knockout rounds',               SCORING.ROUND_TOTAL_PTS * 5 + SCORING.KNOCKOUT_PER_MATCH['3RD']!],
                  ['Tournament podium bonus',       SCORING.TOP3_FIRST_PTS + SCORING.TOP3_SECOND_PTS + SCORING.TOP3_THIRD_PTS],
                ].map(([label, pts]) => (
                  <tr key={label as string}>
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right font-mono text-white">{pts}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-sky-300">
                  <td className="pt-3 font-bold text-white">Total</td>
                  <td className="pt-3 text-right font-mono font-bold text-white text-base">
                    {SCORING.ADVANCE_PTS * 24 + SCORING.TOP_SEED_PTS * 12 + SCORING.USA_ALL_CORRECT_PTS + SCORING.ROUND_TOTAL_PTS * 5 + SCORING.KNOCKOUT_PER_MATCH['3RD']! + SCORING.TOP3_FIRST_PTS + SCORING.TOP3_SECOND_PTS + SCORING.TOP3_THIRD_PTS}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Tiebreakers */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-4">Tiebreakers</h2>
            <ol className="space-y-1 text-slate-600 text-sm leading-relaxed list-decimal list-inside">
              <li>Most correct advancing-team picks (group stage)</li>
              <li>Most correct group-winner picks</li>
              <li>Correct USA pool play prediction (all 3 vs none)</li>
              <li>Earliest submission time</li>
            </ol>
          </section>

          {/* Prize eligibility */}
          <section className="bg-white rounded-2xl p-6 border border-sky-100">
            <h2 className="text-lg font-semibold text-sky-500 mb-4">Prize Eligibility</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Only players marked <strong className="text-slate-800">prize-eligible</strong> by the admin are eligible to win.
              Prize-eligible status is shown with a trophy icon next to your name on the leaderboard.
            </p>
          </section>

        </div>
      </div>
    </ProtectedRoute>
  );
}
