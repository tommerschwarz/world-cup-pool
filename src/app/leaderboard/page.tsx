'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { calculateScore, SCORING } from '@/lib/scoring';
import { GROUPS, getGroupTeams, isTournamentLocked, BRACKET_SOURCES, BRACKET_ROUNDS } from '@/lib/wc2026-data';
import type {
  UserScore, UserPredictions, BracketConfig, Match,
  LeaderboardEntry, SimulatedGroupResult, GroupPrediction,
} from '@/lib/types';

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardContent />
    </ProtectedRoute>
  );
}

function LeaderboardContent() {
  const { user } = useAuth();
  const [tab, setTab]                 = useState<'standings' | 'picks' | 'whatif'>('standings');
  const [scores, setScores]           = useState<UserScore[]>([]);
  const [allPredictions, setAllPreds] = useState<UserPredictions[]>([]);
  const [bracket, setBracket]         = useState<BracketConfig | null>(null);

  useEffect(() => {
    return onSnapshot(collection(getClientDb(), 'scores'), snap => {
      setScores(snap.docs.map(d => d.data() as UserScore));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(getClientDb(), 'predictions'), snap => {
      setAllPreds(snap.docs.map(d => d.data() as UserPredictions));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(doc(getClientDb(), 'bracket', 'config'), snap => {
      if (snap.exists()) setBracket(snap.data() as BracketConfig);
    });
  }, []);

  const tabs = [
    { key: 'standings', label: 'Standings'    },
    { key: 'picks',     label: "Pool's Picks" },
    { key: 'whatif',    label: 'What If?'     },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Leaderboard</h1>

      <div className="flex gap-1 bg-white rounded-xl p-1 w-fit mb-8">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'standings' && (
        <StandingsTab scores={scores} currentUid={user?.uid ?? ''} predictions={allPredictions} bracket={bracket} />
      )}
      {(tab === 'picks' || tab === 'whatif') && !isTournamentLocked() && (
        <PicksHidden />
      )}
      {tab === 'picks' && bracket && isTournamentLocked() && (
        <PoolPicksTab bracket={bracket} predictions={allPredictions} scores={scores} currentUid={user?.uid ?? ''} />
      )}
      {tab === 'whatif' && bracket && isTournamentLocked() && (
        <WhatIfTab bracket={bracket} predictions={allPredictions} scores={scores} />
      )}
      {!bracket && tab !== 'standings' && isTournamentLocked() && (
        <div className="flex items-center justify-center h-40 text-slate-400">Loading…</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-tournament picks lockout
// ---------------------------------------------------------------------------

function PicksHidden() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <span className="text-3xl">🔒</span>
      <p className="text-slate-600 font-medium">Picks are hidden until the tournament begins</p>
      <p className="text-slate-400 text-sm">Revealed on Jun 11 at 12 PM PDT</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

function StandingsTab({ scores, currentUid, predictions, bracket }: {
  scores: UserScore[];
  currentUid: string;
  predictions: UserPredictions[];
  bracket: BracketConfig | null;
}) {
  const sorted = [...scores].sort((a, b) => b.total - a.total);
  const champMap = Object.fromEntries(predictions.map(p => [p.uid, p.knockoutPredictions?.final ?? null]));

  return (
    <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-left border-b border-sky-100">
            <th className="px-4 py-3 w-10">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100/50">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                No scores yet — check back after matches start.
              </td>
            </tr>
          )}
          {sorted.map((s, i) => {
            const isMe = s.uid === currentUid;
            const champId = champMap[s.uid];
            const champFlag = champId ? bracket?.teams[champId]?.flagEmoji : null;
            return (
              <tr key={s.uid} className={`transition-colors ${isMe ? 'bg-sky-50' : 'hover:bg-sky-50/60'}`}>
                <td className="px-4 py-3 text-slate-400 font-mono tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {champFlag && <span title="Picked to win" className="text-base">{champFlag}</span>}
                    <span className={`font-medium ${isMe ? 'text-sky-500' : 'text-slate-700'}`}>
                      {s.displayName || s.email}
                    </span>
                    {s.prizeEligible && <span title="Prize eligible">💰</span>}
                    {isMe && <span className="text-xs text-slate-400">(you)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold font-mono tabular-nums text-slate-800">{s.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pool's Picks — rows = groups, columns = users
// ---------------------------------------------------------------------------

const MAX_GROUP_PTS = SCORING.ADVANCE_PTS * 2 + SCORING.TOP_SEED_PTS; // 8

function groupScorePct(u: UserPredictions, group: string, bracket: BracketConfig): number | null {
  const result = bracket.groupResults?.[group];
  if (!result) return null;
  const pred = u.groupPredictions?.[group];
  if (!pred) return 0;
  const actualAdvancers = new Set(result.finalStandings.slice(0, result.thirdAdvances ? 3 : 2));
  const actualTop = result.finalStandings[0];
  let pts = 0;
  for (const id of pred.advancingTeamIds) {
    if (actualAdvancers.has(id)) pts += SCORING.ADVANCE_PTS;
  }
  if (pred.topSeedId === actualTop) pts += SCORING.TOP_SEED_PTS;
  return pts / MAX_GROUP_PTS;
}

// Interpolate between two RGB triples
function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bv = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bv})`;
}

function heatBg(pct: number, dog: boolean): string {
  const white: [number,number,number] = [255, 255, 255];
  // standard: red-300 → white → green-300
  // dog:      blue-300 → white → amber-300
  const bad:  [number,number,number] = dog ? [147, 197, 253] : [252, 165, 165];
  const good: [number,number,number] = dog ? [252, 211,  77] : [134, 239, 172];
  if (pct <= 0.5) return lerpColor(bad,  white, pct * 2);
  return               lerpColor(white, good, (pct - 0.5) * 2);
}

// ---------------------------------------------------------------------------
// Knockout distribution helpers
// ---------------------------------------------------------------------------

function getActualTeamForSlot(matchId: string, slot: 'home' | 'away', matches: Record<string, Match>): string | null {
  if (matchId.startsWith('r32')) {
    const m = matches[matchId];
    return slot === 'home' ? (m?.homeTeamId ?? null) : (m?.awayTeamId ?? null);
  }
  const sources = BRACKET_SOURCES[matchId];
  if (!sources) return null;
  const [srcA, srcB] = sources;
  const feederId = slot === 'home' ? srcA : srcB;
  if (matchId === 'sf_3rd') {
    const m = matches[feederId];
    const winner = m?.result?.winnerId ?? null;
    if (!winner) return null;
    const h = getActualTeamForSlot(feederId, 'home', matches);
    const a = getActualTeamForSlot(feederId, 'away', matches);
    return h === winner ? a : h;
  }
  return matches[feederId]?.result?.winnerId ?? null;
}

function PickDistBar({ matchId, bracket, predictions }: {
  matchId: string;
  bracket: BracketConfig;
  predictions: UserPredictions[];
}) {
  const matches = bracket.matches ?? {};
  const homeId = getActualTeamForSlot(matchId, 'home', matches);
  const awayId = getActualTeamForSlot(matchId, 'away', matches);
  if (!homeId && !awayId) return null;

  const homeTeam = homeId ? bracket.teams[homeId] : null;
  const awayTeam = awayId ? bracket.teams[awayId] : null;
  const actualWinner = matches[matchId]?.result?.winnerId ?? null;

  const [hoveredSide, setHoveredSide] = useState<'home' | 'away' | null>(null);

  const homePickers: string[] = [];
  const awayPickers: string[] = [];
  for (const pred of predictions) {
    const pick = pred.knockoutPredictions?.[matchId];
    const name = pred.displayName?.split(' ')[0] || pred.email.split('@')[0];
    if (pick === homeId) homePickers.push(name);
    else if (pick === awayId) awayPickers.push(name);
  }
  const homeCount = homePickers.length;
  const awayCount = awayPickers.length;
  const total = homeCount + awayCount;
  const homePct = total > 0 ? Math.round((homeCount / total) * 100) : 50;
  const awayPct = 100 - homePct;

  const homeColor = actualWinner === homeId ? 'bg-green-500' : actualWinner && actualWinner !== homeId ? 'bg-slate-300' : 'bg-sky-500';
  const awayColor = actualWinner === awayId ? 'bg-green-500' : actualWinner && actualWinner !== awayId ? 'bg-slate-300' : 'bg-rose-400';

  return (
    <div className="bg-white border border-sky-100 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 w-24 justify-end shrink-0">
          <span className="text-xs font-medium text-slate-600 truncate">{homeTeam?.shortName ?? '?'}</span>
          <span className="text-base">{homeTeam?.flagEmoji ?? '🏳️'}</span>
        </div>

        {/* Bar + hover tooltips */}
        <div className="flex-1 relative">
          {/* Tooltips anchored to bar container edges — never overflow viewport */}
          {hoveredSide === 'home' && homeCount > 0 && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg pointer-events-none w-36 z-20">
              <div className="font-semibold text-slate-300 mb-1">{homeTeam?.shortName} ({homeCount})</div>
              {homePickers.map(n => <div key={n}>{n}</div>)}
              <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
            </div>
          )}
          {hoveredSide === 'away' && awayCount > 0 && (
            <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg pointer-events-none w-36 z-20">
              <div className="font-semibold text-slate-300 mb-1">{awayTeam?.shortName} ({awayCount})</div>
              {awayPickers.map(n => <div key={n}>{n}</div>)}
              <div className="absolute top-full right-4 border-4 border-transparent border-t-slate-800" />
            </div>
          )}
          {/* Transparent hover targets */}
          {homeCount > 0 && (
            <div
              className="absolute inset-y-0 left-0 z-10 cursor-default"
              style={{ width: `${homePct}%` }}
              onMouseEnter={() => setHoveredSide('home')}
              onMouseLeave={() => setHoveredSide(null)}
            />
          )}
          {awayCount > 0 && (
            <div
              className="absolute inset-y-0 right-0 z-10 cursor-default"
              style={{ width: `${awayPct}%` }}
              onMouseEnter={() => setHoveredSide('away')}
              onMouseLeave={() => setHoveredSide(null)}
            />
          )}
          {/* Visual bar */}
          <div className="h-7 rounded-full overflow-hidden flex bg-slate-100">
            {homePct > 0 && (
              <div
                className={`h-full flex items-center justify-end pr-1.5 text-xs font-bold text-white ${homeColor}`}
                style={{ width: `${homePct}%` }}
              >
                {homeCount > 0 && homeCount}
              </div>
            )}
            {awayPct > 0 && (
              <div
                className={`h-full flex items-center justify-start pl-1.5 text-xs font-bold text-white ${awayColor}`}
                style={{ width: `${awayPct}%` }}
              >
                {awayCount > 0 && awayCount}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 w-24 shrink-0">
          <span className="text-base">{awayTeam?.flagEmoji ?? '🏳️'}</span>
          <span className="text-xs font-medium text-slate-600 truncate">{awayTeam?.shortName ?? '?'}</span>
        </div>
      </div>
    </div>
  );
}

function FinalistTable({ predictions, scores, bracket }: {
  predictions: UserPredictions[];
  scores: UserScore[];
  bracket: BracketConfig;
}) {
  const scoreMap = Object.fromEntries(scores.map(s => [s.uid, s.total]));
  const sorted = [...predictions].sort((a, b) => (scoreMap[b.uid] ?? 0) - (scoreMap[a.uid] ?? 0));
  const teams = bracket.teams;

  const teamCell = (id: string | null | undefined) => {
    if (!id) return <span className="text-slate-300">—</span>;
    const t = teams[id];
    return <span className="whitespace-nowrap">{t?.flagEmoji} {t?.shortName}</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-sky-100 overflow-auto">
      <table className="text-xs min-w-max w-full">
        <thead>
          <tr className="border-b border-sky-100 text-slate-400">
            <th className="px-4 py-3 text-left font-normal">Player</th>
            <th className="px-4 py-3 text-center font-normal">🥇 Champion</th>
            <th className="px-4 py-3 text-center font-normal">🥈 Runner-up</th>
            <th className="px-4 py-3 text-center font-normal">🥉 3rd Place</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100/30">
          {sorted.map(u => {
            const ko = u.knockoutPredictions ?? {};
            const champion  = ko.final ?? null;
            const sf1pick   = ko.sf_01 ?? null;
            const sf2pick   = ko.sf_02 ?? null;
            const runnerUp  = champion === sf1pick ? sf2pick : champion === sf2pick ? sf1pick : null;
            const third     = ko.sf_3rd ?? null;
            return (
              <tr key={u.uid} className="hover:bg-sky-50/50">
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {u.displayName?.split(' ')[0] || u.email.split('@')[0]}
                </td>
                <td className="px-4 py-2.5 text-center text-slate-600">{teamCell(champion)}</td>
                <td className="px-4 py-2.5 text-center text-slate-600">{teamCell(runnerUp)}</td>
                <td className="px-4 py-2.5 text-center text-slate-600">{teamCell(third)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PoolPicksTab({
  bracket, predictions, scores, currentUid,
}: {
  bracket: BracketConfig;
  predictions: UserPredictions[];
  scores: UserScore[];
  currentUid: string;
}) {
  const [view, setView]       = useState<'groups' | 'bracket'>('groups');
  const [heatmap, setHeatmap] = useState(false);
  const [dogMode, setDogMode] = useState(false);

  const scoreMap = Object.fromEntries(scores.map(s => [s.uid, s.total]));
  const users    = [...predictions].sort((a, b) => (scoreMap[b.uid] ?? 0) - (scoreMap[a.uid] ?? 0));
  const hasKnockout = Object.keys(bracket.matches ?? {}).length > 0;

  const legendSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      {/* Top-level view toggle */}
      {hasKnockout && (
        <div className="flex gap-1 bg-white border border-sky-100 rounded-xl p-1 w-fit mb-4">
          <button
            onClick={() => setView('groups')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'groups' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Groups
          </button>
          <button
            onClick={() => setView('bracket')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'bracket' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Bracket
          </button>
        </div>
      )}

      {/* Bracket view */}
      {view === 'bracket' && (
        <div className="space-y-8">
          {BRACKET_ROUNDS.map(({ stage, label, matchIds }) => {
            const visible = matchIds.filter(mid => {
              const h = getActualTeamForSlot(mid, 'home', bracket.matches ?? {});
              const a = getActualTeamForSlot(mid, 'away', bracket.matches ?? {});
              return h || a;
            });
            if (visible.length === 0) return null;
            return (
              <div key={stage}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{label}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {visible.map(mid => (
                    <PickDistBar key={mid} matchId={mid} bracket={bracket} predictions={predictions} />
                  ))}
                </div>
              </div>
            );
          })}

          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Finalist Picks</h3>
            <FinalistTable predictions={predictions} scores={scores} bracket={bracket} />
          </div>
        </div>
      )}

      {/* Groups view */}
      {view === 'groups' && <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-slate-400 mr-1">View:</span>
        <ToggleChip active={heatmap} onClick={() => setHeatmap(h => !h)} label="🌡 Heatmap" />
        <ToggleChip active={dogMode} onClick={() => setDogMode(d => !d)} label="🐕 Dog mode" />

        {heatmap && (
          <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-sky-100">
            <span className="text-xs text-slate-400">
              {dogMode ? '(blue)' : '(red)'} 0 pts
            </span>
            {legendSteps.map(pct => (
              <span
                key={pct}
                className="w-5 h-5 rounded border border-white/60 inline-block"
                style={{ backgroundColor: heatBg(pct, dogMode) }}
                title={`${Math.round(pct * MAX_GROUP_PTS)} / ${MAX_GROUP_PTS} pts`}
              />
            ))}
            <span className="text-xs text-slate-400">
              {MAX_GROUP_PTS} pts {dogMode ? '(amber)' : '(green)'}
            </span>
          </div>
        )}

        {dogMode && !heatmap && (
          <span className="text-xs text-slate-400 ml-1 pl-3 border-l border-sky-100">
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-300 mr-1 align-middle" />correct&nbsp;&nbsp;
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-400/25 border border-amber-300 mr-1 align-middle" />wrong
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-sky-100 overflow-auto">
        <table className="text-xs min-w-max">
          <thead>
            <tr className="border-b border-sky-100">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-slate-400 min-w-24">
                Group
              </th>
              {users.map(u => {
                const isMe = u.uid === currentUid;
                return (
                  <th key={u.uid} className={`px-3 py-3 text-center whitespace-nowrap min-w-28 ${
                    isMe ? 'bg-sky-50 text-sky-600 font-semibold' : 'text-slate-500 font-normal'
                  }`}>
                    {u.displayName?.split(' ')[0] || u.email.split('@')[0]}
                    {isMe && <span className="block text-xs font-normal text-sky-400 leading-tight">you</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-100/30">
            {GROUPS.map(group => {
              const result          = bracket.groupResults?.[group];
              const actualAdvancers = result ? new Set(result.finalStandings.slice(0, result.thirdAdvances ? 3 : 2)) : null;
              const actualTop       = result ? result.finalStandings[0] : null;

              return (
                <tr key={group} className="hover:bg-sky-50/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-600">
                    Group {group}
                  </td>
                  {users.map(u => {
                    const pred = u.groupPredictions?.[group];
                    const pct  = heatmap ? groupScorePct(u, group, bracket) : null;
                    const isMe = u.uid === currentUid;
                    return (
                      <td
                        key={u.uid}
                        className={`text-center transition-colors ${heatmap ? 'p-0' : `px-2 py-2 align-top${isMe ? ' bg-sky-50/40' : ''}`}`}
                        style={pct !== null ? { backgroundColor: heatBg(pct, dogMode) } : undefined}
                      >
                        {heatmap
                          ? <div className="w-20 h-10" />
                          : <GroupPickCell
                              pred={pred}
                              bracket={bracket}
                              actualAdvancers={actualAdvancers}
                              actualTopSeed={actualTop}
                              dogMode={dogMode}
                            />
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Podium separator */}
            <tr className="border-t-2 border-sky-200">
              <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                🏆 Podium Picks
              </td>
              {users.map(u => (
                <td key={u.uid} className={u.uid === currentUid ? 'bg-sky-50' : 'bg-slate-50'} />
              ))}
            </tr>

            {/* One row per podium pick slot */}
            {(['pick1', 'pick2', 'pick3'] as const).map((pickKey, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <tr key={pickKey} className="hover:bg-sky-50/50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-600">
                    {medals[idx]} Pick {idx + 1}
                  </td>
                  {users.map(u => {
                    const teamId = u.topThreePredictions?.[pickKey];
                    const team   = teamId ? bracket.teams[teamId] : null;
                    const isMe   = u.uid === currentUid;
                    return (
                      <td key={u.uid} className={`text-center px-2 py-2${isMe ? ' bg-sky-50/40' : ''}`}>
                        {team ? (
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap bg-sky-50/70 text-slate-600 rounded px-1.5 py-0.5">
                            <span>{team.flagEmoji}</span>
                            <span>{team.shortName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  );
}

function ToggleChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-slate-700 text-white border-slate-700'
          : 'bg-white text-slate-500 border-sky-200 hover:border-slate-400 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function GroupPickCell({
  pred, bracket, actualAdvancers, actualTopSeed, dogMode,
}: {
  pred?: GroupPrediction;
  bracket: BracketConfig;
  actualAdvancers: Set<string> | null;
  actualTopSeed: string | null;
  dogMode: boolean;
}) {
  if (!pred || pred.advancingTeamIds.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  // color classes keyed by mode
  const correctCls = dogMode ? 'bg-blue-500/20 text-blue-700'   : 'bg-green-500/15 text-green-700';
  const wrongCls   = dogMode ? 'bg-amber-400/25 text-amber-700' : 'bg-red-500/15 text-red-600';
  const neutralCls = 'bg-sky-50/70 text-slate-600';
  const topOkCls   = dogMode ? 'text-blue-600'   : 'text-green-500';
  const topBadCls  = dogMode ? 'text-amber-600'  : 'text-red-500';
  const topNeutCls = 'text-sky-500';

  return (
    <div className="space-y-0.5">
      {pred.advancingTeamIds.map(id => {
        const team = bracket.teams[id];
        if (!team) return null;
        const isCorrect  = actualAdvancers ? actualAdvancers.has(id) : null;
        const isTop      = pred.topSeedId === id;
        const topCorrect = isTop && actualTopSeed ? actualTopSeed === id : null;

        return (
          <div key={id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded whitespace-nowrap ${
            isCorrect === true  ? correctCls :
            isCorrect === false ? wrongCls   : neutralCls
          }`}>
            <span>{team.flagEmoji}</span>
            <span>{team.shortName}</span>
            {isTop && (
              <span className={`text-xs font-bold ml-0.5 ${
                topCorrect === true  ? topOkCls  :
                topCorrect === false ? topBadCls : topNeutCls
              }`}>①</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// What If? simulator
// ---------------------------------------------------------------------------

function WhatIfTab({
  bracket, predictions, scores,
}: {
  bracket: BracketConfig;
  predictions: UserPredictions[];
  scores: UserScore[];
}) {
  const [simResults, setSimResults] = useState<Record<string, SimulatedGroupResult>>({});

  // Groups without official results yet
  const openGroups = GROUPS.filter(g => !bracket.groupResults?.[g]);

  const projectedBracket: BracketConfig = {
    ...bracket,
    groupResults: {
      ...(bracket.groupResults ?? {}),
      ...Object.fromEntries(
        Object.entries(simResults).map(([g, sim]) => [g, {
          finalStandings: sim.topSeedId
            ? [sim.topSeedId, ...sim.advancingTeamIds.filter(id => id !== sim.topSeedId)]
            : [...sim.advancingTeamIds],
        }])
      ),
    },
  };

  const projected: LeaderboardEntry[] = predictions.map(up => {
    const { total } = calculateScore(up, projectedBracket);
    return {
      uid:           up.uid,
      displayName:   up.displayName,
      email:         up.email,
      total,
      rank:          0,
      prizeEligible: scores.find(s => s.uid === up.uid)?.prizeEligible ?? false,
    };
  }).sort((a, b) => b.total - a.total).map((e, i) => ({ ...e, rank: i + 1 }));

  const currentRank = Object.fromEntries(
    [...scores].sort((a, b) => b.total - a.total).map((s, i) => [s.uid, i + 1])
  );

  const simCount = Object.keys(simResults).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left — group simulators */}
      <div>
        <h2 className="text-base font-semibold text-slate-600 mb-4">Simulate group outcomes</h2>
        {openGroups.length === 0 && (
          <p className="text-slate-400 text-sm">All group results are in — nothing to simulate.</p>
        )}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {openGroups.map(group => (
            <SimGroupRow
              key={group}
              group={group}
              teams={getGroupTeams(bracket.teams, group)}
              value={simResults[group]}
              onChange={sim => {
                if (!sim) {
                  setSimResults(prev => { const n = { ...prev }; delete n[group]; return n; });
                } else {
                  setSimResults(prev => ({ ...prev, [group]: sim }));
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Right — projected standings */}
      <div>
        <h2 className="text-base font-semibold text-slate-600 mb-4">
          Projected standings
          {simCount > 0 && (
            <span className="ml-2 text-xs text-sky-500 font-normal">
              ({simCount} group{simCount !== 1 ? 's' : ''} simulated)
            </span>
          )}
        </h2>
        <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-left border-b border-sky-100">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">Pts</th>
                <th className="px-4 py-3 w-10 text-center">Δ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/50">
              {projected.map(e => {
                const prev  = currentRank[e.uid] ?? projected.length;
                const delta = prev - e.rank;
                return (
                  <tr key={e.uid} className="hover:bg-sky-50/50">
                    <td className="px-4 py-2.5 text-slate-400 font-mono tabular-nums">{e.rank}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {e.displayName || e.email}
                      {e.prizeEligible && <span className="ml-1">💰</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold font-mono tabular-nums text-slate-800">
                      {e.total}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-medium">
                      {delta > 0 && <span className="text-green-400">▲{delta}</span>}
                      {delta < 0 && <span className="text-red-400">▼{Math.abs(delta)}</span>}
                      {delta === 0 && <span className="text-slate-400">–</span>}
                    </td>
                  </tr>
                );
              })}
              {projected.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-sm">
                    No picks submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {simCount > 0 && (
          <button
            onClick={() => setSimResults({})}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕ Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function SimGroupRow({
  group, teams, value, onChange,
}: {
  group: string;
  teams: ReturnType<typeof getGroupTeams>;
  value?: SimulatedGroupResult;
  onChange: (sim: SimulatedGroupResult | null) => void;
}) {
  const [advancing, setAdvancing] = useState<string[]>(value?.advancingTeamIds ?? []);
  const [topSeed, setTopSeed]     = useState<string>(value?.topSeedId ?? '');

  const emit = (adv: string[], top: string) => {
    if (!adv.length) { onChange(null); return; }
    onChange({ group, advancingTeamIds: adv, topSeedId: top || null });
  };

  const toggleAdv = (id: string) => {
    let next: string[];
    if (advancing.includes(id)) {
      next = advancing.filter(x => x !== id);
      const nextTop = next.includes(topSeed) ? topSeed : '';
      setAdvancing(next); setTopSeed(nextTop); emit(next, nextTop);
    } else if (advancing.length < 2) {
      next = [...advancing, id];
      setAdvancing(next); emit(next, topSeed);
    }
  };

  const toggleTop = (id: string) => {
    if (!advancing.includes(id)) return;
    const next = topSeed === id ? '' : id;
    setTopSeed(next); emit(advancing, next);
  };

  return (
    <div className="bg-white border border-sky-100 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-sky-600">Group {group}</span>
        {value && (
          <button
            onClick={() => { setAdvancing([]); setTopSeed(''); onChange(null); }}
            className="text-slate-400 hover:text-slate-500 text-xs"
          >✕ clear</button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {teams.map(team => {
          const isAdv = advancing.includes(team.id);
          const isTop = topSeed === team.id;
          return (
            <div key={team.id} className="flex items-center gap-1">
              <button
                onClick={() => toggleAdv(team.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isAdv
                    ? 'bg-sky-100 text-sky-600 border border-sky-300'
                    : 'bg-sky-50 text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{team.flagEmoji}</span>
                <span>{team.shortName}</span>
              </button>
              {isAdv && (
                <button
                  onClick={() => toggleTop(team.id)}
                  className={`w-6 h-6 rounded text-xs font-bold transition-colors ${
                    isTop ? 'bg-sky-500 text-white' : 'bg-sky-50 text-slate-400 hover:text-slate-600'
                  }`}
                >①</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
