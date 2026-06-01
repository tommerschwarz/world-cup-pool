'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    // Pick up the result if we're returning from a redirect sign-in
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const auth = getClientAuth();
    // Mobile browsers block popups — use redirect flow instead
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider);
    } else {
      await signInWithPopup(auth, googleProvider);
    }
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
    <AuthContext.Provider value={{ user, loading, signIn, signOut, getIdToken, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
