import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const origin = req.nextUrl.origin;

  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirect = (err: string) =>
    NextResponse.redirect(`${origin}/?authError=${encodeURIComponent(err)}`);

  if (error) return redirect(error);

  const cookieState = req.cookies.get('oauth_state')?.value;
  if (!state || state !== cookieState) return redirect('invalid_state');
  if (!code) return redirect('missing_code');

  try {
    // Exchange code → tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  `${origin}/api/auth/callback`,
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[auth/callback] token exchange failed:', await tokenRes.text());
      return redirect('token_exchange_failed');
    }

    const { access_token } = await tokenRes.json() as { access_token: string };

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) return redirect('userinfo_failed');

    const { email, name, picture } = await userRes.json() as {
      email: string; name: string; picture: string;
    };

    // Find or create the Firebase user by email
    const adminAuth = getAdminAuth();
    let uid: string;
    try {
      uid = (await adminAuth.getUserByEmail(email)).uid;
    } catch {
      uid = (await adminAuth.createUser({
        email,
        displayName: name,
        photoURL:    picture,
        emailVerified: true,
      })).uid;
    }

    const customToken = await adminAuth.createCustomToken(uid);

    const res = NextResponse.redirect(
      `${origin}/?customToken=${encodeURIComponent(customToken)}`
    );
    res.cookies.set('oauth_state', '', { maxAge: 0, path: '/' });
    return res;

  } catch (err) {
    console.error('[auth/callback] error:', err);
    return redirect('server_error');
  }
}
