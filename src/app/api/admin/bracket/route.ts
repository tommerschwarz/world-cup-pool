import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { stageFromMatchId } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const db   = getAdminDb();

  if (body.type === 'setMatch') {
    const { matchId, homeTeamId, awayTeamId } = body as {
      matchId: string;
      homeTeamId: string | null;
      awayTeamId: string | null;
    };
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }
    const matchNumber = parseInt(matchId.split('_')[1], 10);
    await db.doc('bracket/config').set({
      matches: {
        [matchId]: {
          id: matchId,
          homeTeamId: homeTeamId ?? null,
          awayTeamId: awayTeamId ?? null,
          stage: 'R32',
          matchNumber,
          startTime: '2026-06-28T19:00:00Z',
        }
      }
    }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'setResult') {
    const { matchId, winnerId } = body as {
      matchId: string;
      winnerId: string | null;
    };
    if (!matchId) {
      return NextResponse.json({ error: 'matchId required' }, { status: 400 });
    }
    if (winnerId) {
      const stage = stageFromMatchId(matchId);
      await db.doc('bracket/config').set(
        { matches: { [matchId]: { result: { winnerId }, ...(stage ? { stage } : {}) } } },
        { merge: true }
      );
    } else {
      await db.doc('bracket/config').update({ [`matches.${matchId}.result`]: null });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
