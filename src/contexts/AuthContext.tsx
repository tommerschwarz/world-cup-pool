'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => void;
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
  const [user, setUser]           = useState<User | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();

    // Handle custom token returned by the server-side OAuth callback
    const params = new URLSearchParams(window.location.search);
    const customToken = params.get('customToken');
    const errorParam  = params.get('authError');

    if (errorParam) {
      setAuthError(`Sign-in failed (${errorParam}). Please try again.`);
      const url = new URL(window.location.href);
      url.searchParams.delete('authError');
      window.history.replaceState({}, '', url.toString());
    }

    if (customToken) {
      // Remove token from URL immediately
      const url = new URL(window.location.href);
      url.searchParams.delete('customToken');
      window.history.replaceState({}, '', url.toString());

      signInWithCustomToken(auth, customToken).catch(err => {
        console.error('[Auth] signInWithCustomToken failed:', err);
        setAuthError('Sign-in failed. Please try again.');
      });
    }

    // Auth state listener — fires once with current state on mount
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });

    return unsub;
  }, []);

  // Navigate to server-side OAuth init — works on every browser/platform
  const signIn = () => {
    setAuthError(null);
    window.location.href = '/api/auth/init';
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
