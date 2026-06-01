'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function NavBar() {
  const { user, signOut, isAdmin } = useAuth();
  const path = usePathname();

  if (!user) return null;

  const navItems = [
    { href: '/predictions', label: 'My Picks' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/rules',       label: 'Rules' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-sky-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/predictions" className="text-sky-600 font-bold text-lg tracking-tight shrink-0">
          WC 2026 Pool
        </Link>

        <div className="flex items-center gap-1 flex-1">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                path.startsWith(href)
                  ? 'bg-sky-100 text-sky-500'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-sky-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-slate-500 hidden sm:block">
            {user.displayName ?? user.email}
          </span>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="w-8 h-8 rounded-full ring-2 ring-sky-200"
            />
          )}
          <button
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
