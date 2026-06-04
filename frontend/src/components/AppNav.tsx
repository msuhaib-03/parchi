'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, X, LayoutDashboard, Users, Briefcase,
  MessageCircle, User, LogOut, Loader2,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface AppNavProps {
  userName?: string;
  userId?: string;
  unreadCount?: number;
}

const NAV_LINKS = (userId?: string) => [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/alumni',      label: 'Browse Alumni', icon: Users },
  { href: '/referrals',   label: 'Referrals',    icon: Briefcase },
  { href: '/messages',    label: 'Messages',     icon: MessageCircle, badgeKey: 'unread' as const },
  ...(userId ? [{ href: `/profile/${userId}`, label: 'Profile', icon: User }] : []),
];

export function AppNav({ userName, userId, unreadCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/');
  };

  const links = NAV_LINKS(userId);

  const NavLink = ({ href, label, icon: Icon, badgeKey }: {
    href: string; label: string; icon: React.ElementType; badgeKey?: 'unread';
  }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    const badge = badgeKey === 'unread' && unreadCount > 0 ? unreadCount : undefined;
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          'group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all relative',
          isActive
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
        )}
      >
        <Icon size={16} className="shrink-0" />
        <span>{label}</span>
        {badge && (
          <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const MobileNavLink = ({ href, label, icon: Icon, badgeKey }: {
    href: string; label: string; icon: React.ElementType; badgeKey?: 'unread';
  }) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    const badge = badgeKey === 'unread' && unreadCount > 0 ? unreadCount : undefined;
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
        )}
      >
        <Icon size={18} className="shrink-0" />
        {label}
        {badge && (
          <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1.5">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ─── Top Bar ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/dashboard" className="text-lg font-bold text-indigo-600 tracking-tight shrink-0">
            Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {links.map((l) => <NavLink key={l.href} {...l} />)}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />

            {/* Avatar (desktop) */}
            {userId && (
              <Link
                href={`/profile/${userId}`}
                className="hidden md:flex w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all"
                title={userName}
              >
                {userName?.[0]?.toUpperCase() ?? 'U'}
              </Link>
            )}

            {/* Logout (desktop) */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
              {!loggingOut && 'Logout'}
            </button>

            {/* Hamburger (mobile) */}
            <button
              onClick={() => setOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Drawer ─────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-zinc-950 border-l border-slate-100 dark:border-zinc-800 flex flex-col shadow-2xl animate-fade-in">

            {/* Panel header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <span className="text-base font-bold text-indigo-600">
                Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {links.map((l) => <MobileNavLink key={l.href} {...l} />)}
            </div>

            {/* User + logout */}
            <div className="shrink-0 px-3 py-4 border-t border-slate-100 dark:border-zinc-800 space-y-1">
              {userId && (
                <Link
                  href={`/profile/${userId}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                    {userName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{userName}</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">View profile</p>
                  </div>
                </Link>
              )}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
