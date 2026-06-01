import { getAdminAuth } from './firebase-admin';
import type { NextRequest } from 'next/server';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export async function verifyAdminRequest(req: NextRequest): Promise<
  { ok: true; uid: string; email: string } | { ok: false; error: string; status: number }
> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { ok: false, error: 'Missing token', status: 401 };

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return { ok: false, error: 'Invalid token', status: 401 };
  }

  const email = (decoded.email ?? '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    return { ok: false, error: 'Forbidden', status: 403 };
  }

  return { ok: true, uid: decoded.uid, email };
}

export async function verifyUserRequest(req: NextRequest): Promise<
  { ok: true; uid: string; email: string } | { ok: false; error: string; status: number }
> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return { ok: false, error: 'Missing token', status: 401 };

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return { ok: false, error: 'Invalid token', status: 401 };
  }

  return { ok: true, uid: decoded.uid, email: decoded.email ?? '' };
}
