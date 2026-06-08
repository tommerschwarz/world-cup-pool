'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function NavBar() {
  const { user, signOut, isAdmin } = useAuth();
  const path = usePathname();

  if (!user) return null;

  const navItems = [
    { href: '/predictions', label: 'My Picks'     },
    { href: '/leaderboard', label: 'Leaderboard'  },
    { href: '/rules',       label: 'Rules'         },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  const linkCls = (href: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      path.startsWith(href)
        ? 'bg-sky-100 text-sky-500'
        : 'text-slate-500 hover:text-slate-700 hover:bg-sky-50'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-sky-100">
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row — always visible */}
        <div className="h-14 flex items-center gap-4">
          <Link href="/predictions" className="text-sky-600 font-bold text-lg tracking-tight shrink-0">
            WC 2026 Pool
          </Link>

          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1 flex-1">
            {navItems.map(({ href, label }) => (
              <Link key={href} href={href} className={linkCls(href)}>{label}</Link>
            ))}
          </div>

          {/* User section */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-sm text-slate-500 hidden sm:block truncate max-w-[140px]">
              {user.displayName ?? user.email}
            </span>
            {user.photoURL && (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-sky-200 shrink-0" />
            )}
            <button
              onClick={signOut}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav row — visible below sm */}
        <div className="flex sm:hidden border-t border-sky-50 pb-1.5">
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href} className={`flex-1 text-center py-1.5 text-xs font-medium rounded-md transition-colors ${
              path.startsWith(href)
                ? 'text-sky-500 bg-sky-50'
                : 'text-slate-500'
            }`}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
