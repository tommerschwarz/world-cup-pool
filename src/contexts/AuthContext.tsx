'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getClientAuth, googleProvider } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  isAdmin: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();

    // Must call getRedirectResult to complete a redirect sign-in before
    // onAuthStateChanged fires with the final state.
    getRedirectResult(auth)
      .then(result => {
        if (result?.user) setUser(result.user);
      })
      .catch((err: unknown) => {
        const code = err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : 'unknown';
        if (code === 'auth/unauthorized-domain') {
          setAuthError('This domain is not authorized in Firebase — add it to Authentication → Settings → Authorized Domains.');
        }
        console.error('[Auth] getRedirectResult error:', code, err);
      });

    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Use redirect for all platforms — most reliable on mobile (iOS Safari/Chrome)
  // where popups either get blocked or behave as full-page navigations.
  const signIn = async () => {
    setAuthError(null);
    await signInWithRedirect(getClientAuth(), googleProvider);
  };

  const signOut = async () => {
    await fbSignOut(getClientAuth());
  };

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, getIdToken, isAdmin, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
