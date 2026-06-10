import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getAdminDb } from '@/lib/firebase-admin';
import type { GroupPrediction } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const { uid, field } = body as { uid: string; field: string };

  if (!uid || !field) {
    return NextResponse.json({ error: 'uid and field are required' }, { status: 400 });
  }

  const db = getAdminDb();

  if (field === 'prizeEligible' || field === 'paidBuyIn') {
    const { value } = body as { value: boolean };
    if (value === undefined) return NextResponse.json({ error: 'value required' }, { status: 400 });
    await db.doc(`scores/${uid}`).set({ [field]: value }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (field === 'groupPrediction') {
    const { group, prediction } = body as { group: string; prediction: GroupPrediction };
    if (!group || !prediction) {
      return NextResponse.json({ error: 'group and prediction required' }, { status: 400 });
    }
    await db.doc(`predictions/${uid}`).set(
      { groupPredictions: { [group]: prediction }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown field' }, { status: 400 });
}
