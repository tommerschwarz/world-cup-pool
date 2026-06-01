import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { calculateScore } from '@/lib/scoring';
import type { BracketConfig, UserPredictions, UserScore } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = getAdminDb();

  const bracketSnap = await db.doc('bracket/config').get();
  if (!bracketSnap.exists) {
    return NextResponse.json({ error: 'Bracket not found' }, { status: 404 });
  }
  const bracket = bracketSnap.data() as BracketConfig;

  const predsSnap  = await db.collection('predictions').get();
  const scoresSnap = await db.collection('scores').get();

  const existingScores = Object.fromEntries(
    scoresSnap.docs.map(d => [d.id, d.data() as UserScore])
  );

  const batch   = db.batch();
  let updated   = 0;

  for (const predDoc of predsSnap.docs) {
    const predictions = predDoc.data() as UserPredictions;
    const { total, breakdown } = calculateScore(predictions, bracket);

    const existing  = existingScores[predDoc.id];
    const scoreDoc: UserScore = {
      uid:           predictions.uid,
      displayName:   predictions.displayName,
      email:         predictions.email,
      total,
      breakdown,
      prizeEligible: existing?.prizeEligible ?? false,
      updatedAt:     new Date().toISOString(),
    };

    batch.set(db.doc(`scores/${predDoc.id}`), scoreDoc);
    updated++;
  }

  await batch.commit();
  return NextResponse.json({ ok: true, updated });
}
