import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAdminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const db   = getAdminDb();

  if (body.type === 'groupResult') {
    const { group, finalStandings } = body as {
      group: string;
      finalStandings: string[];
    };
    if (!group || !Array.isArray(finalStandings) || finalStandings.length < 1) {
      return NextResponse.json({ error: 'group and finalStandings (min 1) required' }, { status: 400 });
    }
    await db.doc('bracket/config').set(
      { groupResults: { [group]: { finalStandings } } },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'usaMatchResult') {
    const { matchId, outcome } = body as { matchId: string; outcome: string | null };
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }
    if (outcome !== null && !['W', 'D', 'L'].includes(outcome)) {
      return NextResponse.json({ error: 'outcome must be W, D, L, or null' }, { status: 400 });
    }
    await db.doc('bracket/config').set(
      { usaMatchResults: { [matchId]: outcome } },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown result type' }, { status: 400 });
}
