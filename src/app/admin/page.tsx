'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { getClientDb } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { AdminGuard } from '@/components/AdminGuard';
import { GROUPS, getGroupTeams, USA_MATCHES } from '@/lib/wc2026-data';
import type { UsaOutcome } from '@/lib/types';
import type { BracketConfig, UserScore, UserPredictions, Team, GroupPrediction } from '@/lib/types';

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}

function AdminContent() {
  const { getIdToken } = useAuth();
  const [bracket, setBracket]     = useState<BracketConfig | null>(null);
  const [scores, setScores]       = useState<UserScore[]>([]);
  const [allPreds, setAllPreds]   = useState<UserPredictions[]>([]);
  const [tab, setTab]             = useState<'results' | 'users' | 'picks'>('results');
  const [status, setStatus]       = useState('');
  const [recalcRunning, setRecalcRunning] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(getClientDb(), 'bracket', 'config'), s => {
      if (s.exists()) setBracket(s.data() as BracketConfig);
    });
    const u2 = onSnapshot(collection(getClientDb(), 'scores'), s =>
      setScores(s.docs.map(d => d.data() as UserScore))
    );
    const u3 = onSnapshot(collection(getClientDb(), 'predictions'), s =>
      setAllPreds(s.docs.map(d => d.data() as UserPredictions))
    );
    return () => { u1(); u2(); u3(); };
  }, []);

  const authFetch = async (url: string, body: object) => {
    const token = await getIdToken();
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? res.statusText);
    return json;
  };

  const recalculate = async () => {
    setRecalcRunning(true);
    setStatus('Recalculating…');
    try {
      const r = await authFetch('/api/recalculate', {});
      setStatus(`✓ Done — ${r.updated} scores updated`);
    } catch (e: unknown) {
      setStatus(`✗ ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setRecalcRunning(false);
    }
  };

  const tabs = [
    { key: 'results', label: 'Group Results' },
    { key: 'users',   label: 'Users'         },
    { key: 'picks',   label: 'Manual Picks'  },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admin</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage results, users, and picks</p>
        </div>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-slate-500">{status}</span>}
          <button
            onClick={recalculate}
            disabled={recalcRunning}
            className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 active:scale-95 transition-all disabled:opacity-50"
          >
            {recalcRunning ? 'Recalculating…' : '⟳ Recalculate Scores'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 w-fit mb-8">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-sky-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'results' && bracket && (
        <GroupResultsTab
          bracket={bracket}
          authFetch={authFetch}
          onSaved={recalculate}
          setStatus={setStatus}
        />
      )}
      {tab === 'users' && (
        <UsersTab users={allPreds} scores={scores} authFetch={authFetch} setStatus={setStatus} />
      )}
      {tab === 'picks' && bracket && (
        <ManualPicksTab bracket={bracket} users={allPreds} authFetch={authFetch} setStatus={setStatus} />
      )}
      {!bracket && <p className="text-slate-400">Loading bracket…</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group Results tab
// Enter final standings (1st–4th) for each group after it completes
// ---------------------------------------------------------------------------

function GroupResultsTab({
  bracket, authFetch, onSaved, setStatus,
}: {
  bracket: BracketConfig;
  authFetch: (url: string, body: object) => Promise<unknown>;
  onSaved: () => void;
  setStatus: (s: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  // Local standings editor: group → ordered array of teamIds (1st to 4th)
  const [editing, setEditing] = useState<Record<string, string[]>>({});

  const initEdit = (group: string) => {
    const existing = bracket.groupResults?.[group]?.finalStandings ?? [];
    const teams    = getGroupTeams(bracket.teams, group);
    // Pre-fill with existing, pad with empty strings
    const padded = [...existing, ...Array(4).fill('')].slice(0, 4);
    setEditing(prev => ({ ...prev, [group]: padded }));
  };

  const save = async (group: string) => {
    const standings = (editing[group] ?? []).filter(Boolean);
    if (standings.length < 2) { setStatus('✗ Need at least 2 teams'); return; }
    setSaving(group);
    try {
      await authFetch('/api/admin/results', {
        type:           'groupResult',
        group,
        finalStandings: standings,
      });
      setEditing(prev => { const n = { ...prev }; delete n[group]; return n; });
      setStatus(`✓ Group ${group} saved — recalculating…`);
      onSaved();
    } catch (err: unknown) {
      setStatus(`✗ ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-8">
    {/* USA pool-play results */}
    <div>
      <h3 className="text-sm font-semibold text-slate-600 mb-3">🇺🇸 USA Pool Play Results</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {USA_MATCHES.map(match => {
          const current = bracket.usaMatchResults?.[match.id] ?? null;
          return (
            <div key={match.id} className="bg-white border border-sky-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{match.opponentFlag}</span>
                <div>
                  <div className="text-sm font-medium text-slate-700">vs {match.opponentName}</div>
                  <div className="text-xs text-slate-400">{match.displayDate}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {(['W', 'D', 'L'] as UsaOutcome[]).map(o => (
                  <button
                    key={o}
                    disabled={saving === match.id}
                    onClick={async () => {
                      const next = current === o ? null : o;
                      setSaving(match.id);
                      try {
                        await authFetch('/api/admin/results', {
                          type: 'usaMatchResult',
                          matchId: match.id,
                          outcome: next,
                        });
                        setStatus(`✓ USA vs ${match.opponentName} saved — recalculating…`);
                        onSaved();
                      } catch (err: unknown) {
                        setStatus(`✗ ${err instanceof Error ? err.message : 'Error'}`);
                      } finally {
                        setSaving(null);
                      }
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                      current === o
                        ? 'bg-sky-500 text-white'
                        : 'bg-sky-50 text-slate-500 hover:bg-sky-100 hover:text-slate-700'
                    }`}
                  >
                    {o === 'W' ? 'Win' : o === 'D' ? 'Draw' : 'Loss'}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Group results */}
    <div>
      <h3 className="text-sm font-semibold text-slate-600 mb-3">Group Stage Results</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {GROUPS.map(group => {
        const teams   = getGroupTeams(bracket.teams, group);
        const result  = bracket.groupResults?.[group];
        const isEditing = !!editing[group];
        const standings = isEditing ? editing[group] : (result?.finalStandings ?? []);

        return (
          <div
            key={group}
            className={`bg-white border rounded-2xl p-4 ${
              result ? 'border-green-500/30' : 'border-sky-100'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                GROUP {group}
              </span>
              {!isEditing && (
                <button
                  onClick={() => initEdit(group)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {result ? 'Edit' : '+ Enter result'}
                </button>
              )}
            </div>

            {!isEditing && result && (
              <div className="space-y-1.5">
                {result.finalStandings.map((id, i) => {
                  const team = bracket.teams[id];
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400 w-5 text-right font-mono">{i + 1}.</span>
                      <span>{team?.flagEmoji ?? '🏳️'}</span>
                      <span className={`${i === 0 ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                        {team?.name ?? id}
                      </span>
                      {i === 0 && <span className="text-sky-500 text-xs">①</span>}
                      {i < 2 && <span className="ml-auto text-xs text-green-500">advances</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {!isEditing && !result && (
              <p className="text-sm text-slate-400 italic">No result yet</p>
            )}

            {isEditing && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 mb-2">Drag or select teams in finishing order (1st → 4th)</p>
                {[0, 1, 2, 3].map(pos => (
                  <div key={pos} className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs w-6 text-right">{pos + 1}.</span>
                    <select
                      value={standings[pos] ?? ''}
                      onChange={e => {
                        const next = [...(editing[group] ?? ['','','',''])];
                        // If this team is already placed elsewhere, clear that spot
                        const prevIdx = next.indexOf(e.target.value);
                        if (prevIdx !== -1 && prevIdx !== pos) next[prevIdx] = '';
                        next[pos] = e.target.value;
                        setEditing(prev => ({ ...prev, [group]: next }));
                      }}
                      className="flex-1 bg-sky-50 border border-sky-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">— select team —</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.flagEmoji} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <button
                    disabled={saving === group}
                    onClick={() => save(group)}
                    className="flex-1 py-1.5 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
                  >
                    {saving === group ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(prev => { const n = { ...prev }; delete n[group]; return n; })}
                    className="px-3 py-1.5 bg-sky-50 text-slate-500 text-sm rounded-lg hover:bg-sky-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

function UsersTab({
  users, scores, authFetch, setStatus,
}: {
  users: UserPredictions[];
  scores: UserScore[];
  authFetch: (url: string, body: object) => Promise<unknown>;
  setStatus: (s: string) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const scoreMap = Object.fromEntries(scores.map(s => [s.uid, s]));

  const toggle = async (uid: string, displayName: string, current: boolean) => {
    setSaving(uid);
    try {
      await authFetch('/api/admin/users', {
        uid,
        field: 'prizeEligible',
        value: !current,
      });
      setStatus(`✓ Updated ${displayName}`);
    } catch (e: unknown) {
      setStatus(`✗ ${e instanceof Error ? e.message : 'Error'}`);
    } finally {
      setSaving(null);
    }
  };

  const sorted = [...users].sort((a, b) =>
    (scoreMap[b.uid]?.total ?? 0) - (scoreMap[a.uid]?.total ?? 0)
  );

  return (
    <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-sky-100">
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="px-4 py-3 text-center">Prize eligible</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-100/50">
          {sorted.map(u => {
            const score        = scoreMap[u.uid];
            const prizeEligible = score?.prizeEligible ?? false;
            return (
              <tr key={u.uid} className="hover:bg-sky-50/50">
                <td className="px-4 py-3 text-slate-700">
                  <div>{u.displayName || '—'}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">
                  {score?.total ?? <span className="text-slate-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    disabled={saving === u.uid}
                    onClick={() => toggle(u.uid, u.displayName, prizeEligible)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      prizeEligible ? 'bg-sky-500' : 'bg-sky-50'
                    } disabled:opacity-50`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      prizeEligible ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-slate-400">No users yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual Picks tab
// ---------------------------------------------------------------------------

function ManualPicksTab({
  bracket, users, authFetch, setStatus,
}: {
  bracket: BracketConfig;
  users: UserPredictions[];
  authFetch: (url: string, body: object) => Promise<unknown>;
  setStatus: (s: string) => void;
}) {
  const [selectedUid, setSelectedUid] = useState('');
  const [group, setGroup]             = useState('');
  const [advancing, setAdvancing]     = useState<string[]>([]);
  const [topSeed, setTopSeed]         = useState('');
  const [saving, setSaving]           = useState(false);

  const groupTeams = group ? getGroupTeams(bracket.teams, group) : [];

  const toggleAdv = (id: string) => {
    if (advancing.includes(id)) {
      const next = advancing.filter(x => x !== id);
      setAdvancing(next);
      if (topSeed === id) setTopSeed('');
    } else if (advancing.length < 2) {
      setAdvancing([...advancing, id]);
    }
  };

  const save = async () => {
    if (!selectedUid || !group || advancing.length < 2) return;
    setSaving(true);
    try {
      const pred: GroupPrediction = { advancingTeamIds: advancing, topSeedId: topSeed || null };
      await authFetch('/api/admin/users', {
        uid:   selectedUid,
        field: 'groupPrediction',
        group,
        prediction: pred,
      });
      setStatus('✓ Pick saved');
      setAdvancing([]); setTopSeed('');
    } catch (e: unknown) {
      setStatus(`✗ ${e instanceof Error ? e.message : 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-slate-500">Enter a group prediction on behalf of any user.</p>

      <div>
        <label className="block text-xs text-slate-400 mb-1">User</label>
        <select
          value={selectedUid}
          onChange={e => setSelectedUid(e.target.value)}
          className="w-full bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-sky-500"
        >
          <option value="">Select user…</option>
          {users.map(u => (
            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Group</label>
        <select
          value={group}
          onChange={e => { setGroup(e.target.value); setAdvancing([]); setTopSeed(''); }}
          className="w-full bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-sky-500"
        >
          <option value="">Select group…</option>
          {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
        </select>
      </div>

      {group && (
        <>
          <div>
            <label className="block text-xs text-slate-400 mb-2">Teams advancing (pick 2)</label>
            <div className="space-y-1.5">
              {groupTeams.map(team => {
                const isAdv = advancing.includes(team.id);
                const isTop = topSeed === team.id;
                return (
                  <div key={team.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAdv(team.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                        isAdv
                          ? 'bg-sky-100 text-sky-600 border border-sky-300'
                          : 'bg-sky-50 text-slate-500 hover:text-slate-700 border border-transparent'
                      }`}
                    >
                      <span>{team.flagEmoji}</span>
                      <span>{team.name}</span>
                    </button>
                    <button
                      disabled={!isAdv}
                      onClick={() => setTopSeed(isTop ? '' : team.id)}
                      className={`w-10 h-9 rounded-lg text-xs font-bold transition-colors disabled:invisible ${
                        isTop ? 'bg-sky-500 text-white' : 'bg-sky-50 text-slate-500 hover:bg-sky-100'
                      }`}
                    >
                      1st
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving || !selectedUid || advancing.length < 2}
            className="w-full py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Pick'}
          </button>
        </>
      )}
    </div>
  );
}
