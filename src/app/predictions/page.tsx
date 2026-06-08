'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { GROUPS, getGroupTeams, isGroupLocked, USA_MATCHES, isUsaMatchLocked, isTournamentLocked } from '@/lib/wc2026-data';
import type { UsaMatch } from '@/lib/wc2026-data';
import type { BracketConfig, GroupPrediction, Team, TopThreePrediction, UserPredictions, UsaOutcome } from '@/lib/types';
import { SCORING } from '@/lib/scoring';

export default function PredictionsPage() {
  return (
    <ProtectedRoute>
      <PredictionsContent />
    </ProtectedRoute>
  );
}

function PredictionsContent() {
  const { user } = useAuth();
  const [bracket, setBracket]             = useState<BracketConfig | null>(null);
  const [groupPreds, setGroupPreds]       = useState<Record<string, GroupPrediction>>({});
  const [usaMatchPreds, setUsaMatchPreds] = useState<Record<string, UsaOutcome | null>>({});
  const [topThreePreds, setTopThreePreds] = useState<TopThreePrediction>({ pick1: null, pick2: null, pick3: null });
  const [saving, setSaving]               = useState<Record<string, boolean>>({});
  const [savedAt, setSavedAt]             = useState<Record<string, number>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return onSnapshot(doc(getClientDb(), 'bracket', 'config'), snap => {
      if (snap.exists()) setBracket(snap.data() as BracketConfig);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(getClientDb(), 'predictions', user.uid), snap => {
      if (snap.exists()) {
        const data = snap.data() as UserPredictions;
        setGroupPreds(data.groupPredictions ?? {});
        setUsaMatchPreds(data.usaMatchPredictions ?? {});
        if (data.topThreePredictions) setTopThreePreds(data.topThreePredictions);
      }
    });
  }, [user]);

  const savePrediction = useCallback(async (group: string, pred: GroupPrediction) => {
    if (!user) return;
    setSaving(s => ({ ...s, [group]: true }));
    try {
      await setDoc(
        doc(getClientDb(), 'predictions', user.uid),
        {
          uid:              user.uid,
          displayName:      user.displayName ?? '',
          email:            user.email ?? '',
          groupPredictions: { [group]: pred },
          updatedAt:        new Date().toISOString(),
        },
        { merge: true }
      );
      setSavedAt(s => ({ ...s, [group]: Date.now() }));
    } finally {
      setSaving(s => ({ ...s, [group]: false }));
    }
  }, [user]);

  const handleChange = useCallback((group: string, pred: GroupPrediction) => {
    setGroupPreds(prev => ({ ...prev, [group]: pred }));
    clearTimeout(debounceTimers.current[group]);
    debounceTimers.current[group] = setTimeout(() => savePrediction(group, pred), 600);
  }, [savePrediction]);

  const saveUsaPred = useCallback(async (matchId: string, outcome: UsaOutcome | null) => {
    if (!user) return;
    setSaving(s => ({ ...s, [matchId]: true }));
    try {
      await setDoc(
        doc(getClientDb(), 'predictions', user.uid),
        {
          uid:                 user.uid,
          displayName:         user.displayName ?? '',
          email:               user.email ?? '',
          usaMatchPredictions: { [matchId]: outcome },
          updatedAt:           new Date().toISOString(),
        },
        { merge: true }
      );
      setSavedAt(s => ({ ...s, [matchId]: Date.now() }));
    } finally {
      setSaving(s => ({ ...s, [matchId]: false }));
    }
  }, [user]);

  const handleUsaChange = useCallback((matchId: string, outcome: UsaOutcome | null) => {
    setUsaMatchPreds(prev => ({ ...prev, [matchId]: outcome }));
    clearTimeout(debounceTimers.current[matchId]);
    debounceTimers.current[matchId] = setTimeout(() => saveUsaPred(matchId, outcome), 600);
  }, [saveUsaPred]);

  const saveTopThree = useCallback(async (preds: TopThreePrediction) => {
    if (!user) return;
    setSaving(s => ({ ...s, top3: true }));
    try {
      await setDoc(
        doc(getClientDb(), 'predictions', user.uid),
        {
          uid:                 user.uid,
          displayName:         user.displayName ?? '',
          email:               user.email ?? '',
          topThreePredictions: preds,
          updatedAt:           new Date().toISOString(),
        },
        { merge: true }
      );
      setSavedAt(s => ({ ...s, top3: Date.now() }));
    } finally {
      setSaving(s => ({ ...s, top3: false }));
    }
  }, [user]);

  const handleTopThreeChange = useCallback((preds: TopThreePrediction) => {
    setTopThreePreds(preds);
    clearTimeout(debounceTimers.current['top3']);
    debounceTimers.current['top3'] = setTimeout(() => saveTopThree(preds), 600);
  }, [saveTopThree]);

  if (!bracket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filledGroups = GROUPS.filter(g => {
    const p = groupPreds[g];
    return p && p.advancingTeamIds.length === 2 && p.topSeedId;
  }).length;
  const filledUsa  = USA_MATCHES.filter(m => usaMatchPreds[m.id] != null).length;
  const filledTop3 = [topThreePreds.pick1, topThreePreds.pick2, topThreePreds.pick3].filter(Boolean).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">My Picks</h1>
        <p className="text-slate-500 text-sm mt-1">
          For each group: pick 2 teams to advance, then pick which finishes 1st.
          Locks 5 min before the group's first match.
        </p>
      </div>

      {/* Sticky progress bar */}
      <ProgressBar filledGroups={filledGroups} filledUsa={filledUsa} filledTop3={filledTop3} />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GROUPS.map(group => (
          <GroupCard
            key={group}
            group={group}
            teams={getGroupTeams(bracket.teams, group)}
            prediction={groupPreds[group]}
            groupResult={bracket.groupResults?.[group]}
            saving={!!saving[group]}
            justSaved={!!savedAt[group] && Date.now() - savedAt[group] < 3000}
            onChange={pred => handleChange(group, pred)}
          />
        ))}
      </div>

      {/* USA pool-play picks */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">🇺🇸 USA Pool Play</h2>
        <p className="text-slate-500 text-sm mb-4">
          Pick Win / Draw / Loss for each USA match. <span className="text-sky-600 font-medium">{SCORING.USA_ALL_CORRECT_PTS} pts</span> if all 3 are correct — all or nothing.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {USA_MATCHES.map(match => (
            <UsaMatchCard
              key={match.id}
              match={match}
              outcome={usaMatchPreds[match.id] ?? null}
              actualOutcome={bracket.usaMatchResults?.[match.id]}
              saving={!!saving[match.id]}
              justSaved={!!savedAt[match.id] && Date.now() - savedAt[match.id] < 3000}
              onChange={o => handleUsaChange(match.id, o)}
            />
          ))}
        </div>
      </div>

      {/* Tournament podium picks */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Tournament Podium</h2>
        <p className="text-slate-500 text-sm mb-4">
          Pick the top 3 finishers. Locks when the tournament begins. Bonus points on top of your bracket picks.
        </p>
        <TopThreeSection
          teams={bracket.teams}
          prediction={topThreePreds}
          saving={!!saving['top3']}
          justSaved={!!savedAt['top3'] && Date.now() - savedAt['top3'] < 3000}
          onChange={handleTopThreeChange}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ filledGroups, filledUsa, filledTop3 }: {
  filledGroups: number;
  filledUsa: number;
  filledTop3: number;
}) {
  const total  = GROUPS.length + 3 + 3; // 18
  const filled = filledGroups + filledUsa + filledTop3;
  const pct    = Math.round((filled / total) * 100);
  const allDone = filled === total;

  return (
    <div className="sticky top-[91px] sm:top-14 z-40 bg-sky-50/95 backdrop-blur pt-2 pb-3 -mx-4 px-4 border-b border-sky-100">
      {allDone ? (
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-green-500">✓</span>
          <span className="text-sm font-medium text-green-700">All picks saved — you're good to go!</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex gap-3 text-xs text-slate-500">
              <span className={filledGroups === 12 ? 'text-green-600 font-medium' : ''}>
                Groups {filledGroups}/12
              </span>
              <span className={filledUsa === 3 ? 'text-green-600 font-medium' : ''}>
                USA {filledUsa}/3
              </span>
              <span className={filledTop3 === 3 ? 'text-green-600 font-medium' : ''}>
                Podium {filledTop3}/3
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-700">{filled} / {total}</span>
          </div>
          <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group card
// ---------------------------------------------------------------------------

function GroupCard({
  group, teams, prediction, groupResult, saving, justSaved, onChange,
}: {
  group: string;
  teams: Team[];
  prediction?: GroupPrediction;
  groupResult?: { finalStandings: string[] };
  saving: boolean;
  justSaved: boolean;
  onChange: (pred: GroupPrediction) => void;
}) {
  const locked   = isGroupLocked(group);
  const advancing = prediction?.advancingTeamIds ?? [];
  const topSeed   = prediction?.topSeedId ?? null;

  // Determine accuracy class once the group result is known
  const resultKnown = !!groupResult?.finalStandings?.length;
  const actualAdvancers = resultKnown ? new Set(groupResult!.finalStandings.slice(0, 2)) : null;
  const actualTopSeed   = resultKnown ? groupResult!.finalStandings[0] : null;

  const toggleAdvancing = (teamId: string) => {
    if (locked) return;
    let next: string[];
    if (advancing.includes(teamId)) {
      next = advancing.filter(id => id !== teamId);
    } else if (advancing.length < 2) {
      next = [...advancing, teamId];
    } else {
      return; // already 2 selected — must deselect one first
    }
    // If top seed is no longer in advancing, clear it
    const nextTopSeed = next.includes(topSeed ?? '') ? topSeed : null;
    onChange({ advancingTeamIds: next, topSeedId: nextTopSeed });
  };

  const setTopSeed = (teamId: string) => {
    if (locked || !advancing.includes(teamId)) return;
    onChange({
      advancingTeamIds: advancing,
      topSeedId: topSeed === teamId ? null : teamId,
    });
  };

  const completed = advancing.length === 2 && !!topSeed;

  return (
    <div className={`bg-white rounded-2xl border p-4 transition-colors ${
      completed ? 'border-sky-200' : 'border-sky-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
            GROUP {group}
          </span>
          {locked && <span className="text-slate-400 text-xs">🔒</span>}
        </div>
        <div className="text-xs">
          {saving    && <span className="text-slate-400">saving…</span>}
          {!saving && justSaved && <span className="text-green-500">✓</span>}
          {!saving && !justSaved && completed && <span className="text-slate-400">✓</span>}
        </div>
      </div>

      {/* Team list */}
      <div className="space-y-1.5">
        {teams.map(team => {
          const isAdvancing = advancing.includes(team.id);
          const isTopSeed   = topSeed === team.id;
          const canAdvance  = isAdvancing || advancing.length < 2;

          // Post-result accuracy
          let resultClass = '';
          if (resultKnown && isAdvancing) {
            resultClass = actualAdvancers!.has(team.id) ? 'ring-1 ring-green-500/50' : 'ring-1 ring-red-500/50';
          }

          return (
            <div key={team.id} className="flex items-center gap-2">
              {/* Advancing toggle */}
              <button
                onClick={() => toggleAdvancing(team.id)}
                disabled={locked || (!canAdvance && !isAdvancing)}
                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isAdvancing
                    ? 'bg-sky-100 text-sky-600 border border-sky-300'
                    : 'bg-sky-50 text-slate-500 border border-transparent hover:bg-sky-50 hover:text-slate-700'
                } disabled:cursor-not-allowed ${resultClass}`}
              >
                <span className="text-base leading-none">{team.flagEmoji}</span>
                <span className="truncate">{team.name}</span>
                {resultKnown && isAdvancing && (
                  <span className="ml-auto text-xs">
                    {actualAdvancers!.has(team.id) ? '✓' : '✗'}
                  </span>
                )}
              </button>

              {/* Top seed toggle — only visible when advancing */}
              <button
                onClick={() => setTopSeed(team.id)}
                disabled={locked || !isAdvancing}
                title={isAdvancing ? 'Mark as group winner' : 'Select this team to advance first'}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  isTopSeed
                    ? 'bg-sky-500 text-white'
                    : isAdvancing
                      ? 'bg-sky-50 text-slate-500 hover:bg-sky-100'
                      : 'invisible'
                } disabled:cursor-not-allowed`}
              >
                {isTopSeed && resultKnown
                  ? (team.id === actualTopSeed ? '✓' : '✗')
                  : '1st'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      {!locked && (
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          {advancing.length === 0 && 'Pick 2 teams to advance →'}
          {advancing.length === 1 && 'Pick 1 more team to advance →'}
          {advancing.length === 2 && !topSeed && 'Now tap "1st" to pick the group winner'}
          {advancing.length === 2 && topSeed && ''}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// USA match card
// ---------------------------------------------------------------------------

const USA_OUTCOME_LABELS: { value: UsaOutcome; label: string }[] = [
  { value: 'W', label: 'Win'  },
  { value: 'D', label: 'Draw' },
  { value: 'L', label: 'Loss' },
];

function UsaMatchCard({
  match, outcome, actualOutcome, saving, justSaved, onChange,
}: {
  match: UsaMatch;
  outcome: UsaOutcome | null;
  actualOutcome?: UsaOutcome;
  saving: boolean;
  justSaved: boolean;
  onChange: (o: UsaOutcome | null) => void;
}) {
  const locked = isUsaMatchLocked(match.id);
  const resultKnown = !!actualOutcome;

  const outcomeColor = (o: UsaOutcome) => {
    if (!resultKnown || outcome !== o) return '';
    return actualOutcome === o ? 'ring-2 ring-green-400' : 'ring-2 ring-red-400';
  };

  return (
    <div className={`bg-white rounded-2xl border p-4 transition-colors ${
      outcome ? 'border-sky-200' : 'border-sky-100'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{match.opponentFlag}</span>
          <div>
            <div className="text-sm font-medium text-slate-700">vs {match.opponentName}</div>
            <div className="text-xs text-slate-400">{match.displayDate}</div>
          </div>
        </div>
        <div className="text-xs">
          {saving     && <span className="text-slate-400">saving…</span>}
          {!saving && justSaved && <span className="text-green-500">✓</span>}
          {!saving && !justSaved && outcome && !justSaved && <span className="text-slate-400">✓</span>}
          {locked && !saving && <span className="ml-1 text-slate-400">🔒</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {USA_OUTCOME_LABELS.map(({ value, label }) => (
          <button
            key={value}
            disabled={locked}
            onClick={() => onChange(outcome === value ? null : value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed ${
              outcome === value
                ? 'bg-sky-500 text-white border border-sky-500'
                : 'bg-sky-50 text-slate-500 border border-transparent hover:bg-sky-100 hover:text-slate-700'
            } ${outcomeColor(value)}`}
          >
            {resultKnown && outcome === value
              ? (actualOutcome === value ? '✓' : '✗')
              : label}
          </button>
        ))}
      </div>

      {resultKnown && (
        <p className="mt-2 text-xs text-slate-400 text-center">
          Result: USA {actualOutcome === 'W' ? 'won' : actualOutcome === 'D' ? 'drew' : 'lost'}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-3 podium picks
// ---------------------------------------------------------------------------

const TOP3_PICK_KEYS: (keyof TopThreePrediction)[] = ['pick1', 'pick2', 'pick3'];

function TopThreeSection({
  teams, prediction, saving, justSaved, onChange,
}: {
  teams: Record<string, Team>;
  prediction: TopThreePrediction;
  saving: boolean;
  justSaved: boolean;
  onChange: (p: TopThreePrediction) => void;
}) {
  const locked    = isTournamentLocked();
  const allTeams  = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));
  const completed = TOP3_PICK_KEYS.every(k => !!prediction[k]);

  // Teams already picked in other slots — exclude from each dropdown
  const pickedIds = new Set(TOP3_PICK_KEYS.map(k => prediction[k]).filter(Boolean) as string[]);

  return (
    <div className={`bg-white rounded-2xl border p-4 transition-colors ${
      completed ? 'border-sky-200' : 'border-sky-100'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">Order doesn't matter — points based on actual finishing position</p>
        <div className="text-xs">
          {saving     && <span className="text-slate-400">saving…</span>}
          {!saving && justSaved && <span className="text-green-500">✓</span>}
          {!saving && !justSaved && completed && <span className="text-slate-400">✓</span>}
          {locked && !saving && <span className="ml-1 text-slate-400">🔒</span>}
        </div>
      </div>

      {/* Points key */}
      <div className="flex gap-4 mb-4 text-xs text-slate-500">
        <span>🥇 1st → <span className="text-sky-600 font-medium">+{SCORING.TOP3_FIRST_PTS}</span></span>
        <span>🥈 2nd → <span className="text-sky-600 font-medium">+{SCORING.TOP3_SECOND_PTS}</span></span>
        <span>🥉 3rd → <span className="text-sky-600 font-medium">+{SCORING.TOP3_THIRD_PTS}</span></span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TOP3_PICK_KEYS.map((key, i) => {
          const value = prediction[key];
          const team  = value ? teams[value] : null;
          return (
            <div key={key}>
              <div className="mb-1.5 text-xs font-medium text-slate-400">Pick {i + 1}</div>
              <div className="relative">
                <select
                  disabled={locked}
                  value={value ?? ''}
                  onChange={e => onChange({ ...prediction, [key]: e.target.value || null })}
                  className="w-full bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">— pick a team —</option>
                  {allTeams.map(t => (
                    <option key={t.id} value={t.id} disabled={pickedIds.has(t.id) && t.id !== value}>
                      {t.flagEmoji} {t.name}
                    </option>
                  ))}
                </select>
                {team && (
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                    {team.flagEmoji}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
