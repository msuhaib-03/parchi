'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu, X, LayoutDashboard, Users, Briefcase,
  MessageCircle, User, LogOut, Loader2, Building2,
  Bell, BriefcaseBusiness, Trophy, CheckCircle2, XCircle,
  ChevronDown, ClipboardList, GraduationCap, UserCheck, UserX, CalendarClock, TrendingUp, Medal,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';
import { ThemeToggle } from './ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppNavProps {
  userName?: string;
  userId?: string;
  unreadCount?: number;   // messages unread
}

// ── Notification type → icon + colour ────────────────────────────────────────
function getNotifMeta(type: string): { Icon: React.ElementType; bg: string; fg: string } {
  switch (type as NotificationType) {
    case 'job_posted':        return { Icon: Building2,        bg: 'bg-indigo-100 dark:bg-indigo-900/40',  fg: 'text-indigo-600 dark:text-indigo-400'  };
    case 'referral_received': return { Icon: BriefcaseBusiness, bg: 'bg-violet-100 dark:bg-violet-900/40',  fg: 'text-violet-600 dark:text-violet-400'  };
    case 'referral_accepted': return { Icon: CheckCircle2,     bg: 'bg-emerald-100 dark:bg-emerald-900/40', fg: 'text-emerald-600 dark:text-emerald-400' };
    case 'referral_rejected': return { Icon: XCircle,          bg: 'bg-red-100 dark:bg-red-900/40',        fg: 'text-red-500 dark:text-red-400'         };
    case 'application_update':return { Icon: Briefcase,        bg: 'bg-blue-100 dark:bg-blue-900/40',      fg: 'text-blue-600 dark:text-blue-400'       };
    case 'story_posted':      return { Icon: Trophy,           bg: 'bg-amber-100 dark:bg-amber-900/40',    fg: 'text-amber-500 dark:text-amber-400'     };
    case 'message_received':    return { Icon: MessageCircle,  bg: 'bg-teal-100 dark:bg-teal-900/40',      fg: 'text-teal-600 dark:text-teal-400'       };
    case 'mentorship_request':  return { Icon: GraduationCap, bg: 'bg-violet-100 dark:bg-violet-900/40',  fg: 'text-violet-600 dark:text-violet-400'   };
    case 'mentorship_accepted': return { Icon: UserCheck,     bg: 'bg-emerald-100 dark:bg-emerald-900/40',fg: 'text-emerald-600 dark:text-emerald-400' };
    case 'mentorship_declined': return { Icon: UserX,         bg: 'bg-red-100 dark:bg-red-900/40',        fg: 'text-red-500 dark:text-red-400'         };
    case 'session_booked':      return { Icon: CalendarClock, bg: 'bg-indigo-100 dark:bg-indigo-900/40',  fg: 'text-indigo-600 dark:text-indigo-400'   };
    default:                    return { Icon: Bell,           bg: 'bg-slate-100 dark:bg-zinc-800',        fg: 'text-slate-500 dark:text-zinc-400'      };
  }
}

// ── Navigation structure ──────────────────────────────────────────────────────
// Primary links always visible on desktop bar (max 3 — keep it breathable)
const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/alumni',    label: 'Browse Alumni', icon: Users },
  { href: '/messages',  label: 'Messages',     icon: MessageCircle, badgeKey: 'unread' as const },
];

// Secondary links live inside the "More" dropdown on desktop
const MORE_NAV = [
  { href: '/referrals',      label: 'Referrals',       icon: BriefcaseBusiness },
  { href: '/jobs',           label: 'Jobs',            icon: Building2 },
  { href: '/salary',         label: 'Salary Insights', icon: TrendingUp },
  { href: '/leaderboard',    label: 'Leaderboard',     icon: Medal },
  { href: '/interview-prep', label: 'Interview Prep',  icon: ClipboardList },
  { href: '/mentorship',     label: 'Mentorship',      icon: GraduationCap },
  { href: '/stories',        label: 'Stories',         icon: Trophy },
];

// Mobile drawer gets everything (primary + more + profile)
const allMobileNav = (userId?: string) => [
  ...PRIMARY_NAV,
  ...MORE_NAV,
  ...(userId ? [{ href: `/profile/${userId}`, label: 'Profile', icon: User }] : []),
];

// ─────────────────────────────────────────────────────────────────────────────
export function AppNav({ userName, userId, unreadCount = 0 }: AppNavProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const [mobileOpen, setMobileOpen]   = useState(false);
  const [moreOpen,   setMoreOpen]     = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const unreadNotifCount = notifications.filter((n) => !n.is_read).length;

  const notifRef = useRef<HTMLDivElement>(null);
  const moreRef  = useRef<HTMLDivElement>(null);

  // Click-outside: close both dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (moreRef.current  && !moreRef.current.contains(e.target as Node))  setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch + Realtime notifications
  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      setLoadingNotifs(true);
      const { data } = await supabase
        .from('notifications').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(20);
      setNotifications((data as Notification[]) ?? []);
      setLoadingNotifs(false);
    };
    fetch();

    const ch = supabase.channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (p) => setNotifications((prev) => [p.new as Notification, ...prev]))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, supabase]);

  const markAllRead = async () => {
    if (!userId || unreadNotifCount === 0) return;
    await supabase.from('notifications').update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false);
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    toast.success('Logged out. See you soon!');
    setTimeout(() => router.push('/'), 900);
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const moreIsActive = MORE_NAV.some((l) => isActive(l.href));

  const formatNotifTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ── Reusable desktop NavLink ─────────────────────────────────────────────
  const NavLink = ({ href, label, icon: Icon, badgeKey }: {
    href: string; label: string; icon: React.ElementType; badgeKey?: 'unread';
  }) => {
    const active = isActive(href);
    const badge  = badgeKey === 'unread' && unreadCount > 0 ? unreadCount : undefined;
    return (
      <Link href={href}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
          active
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
        )}
      >
        <Icon size={15} className="shrink-0" />
        <span>{label}</span>
        {badge && (
          <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  // ── Reusable mobile NavLink ──────────────────────────────────────────────
  const MobileNavLink = ({ href, label, icon: Icon, badgeKey }: {
    href: string; label: string; icon: React.ElementType; badgeKey?: 'unread';
  }) => {
    const active = isActive(href);
    const badge  = badgeKey === 'unread' && unreadCount > 0 ? unreadCount : undefined;
    return (
      <Link href={href} onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
          active
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
            : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span>{label}</span>
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
      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">

          {/* Logo */}
          <Link href="/dashboard" className="text-lg font-bold text-indigo-600 tracking-tight shrink-0 mr-2">
            Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
          </Link>

          {/* ── Desktop primary links ─────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-0.5">
            {PRIMARY_NAV.map((l) => <NavLink key={l.href} {...l} />)}

            {/* "More" dropdown ─────────────────────────────────────────────── */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((o) => !o)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  moreIsActive
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
                )}
              >
                More
                <ChevronDown size={13} className={cn('transition-transform duration-200', moreOpen && 'rotate-180')} />
                {/* dot when a "more" page is active */}
                {moreIsActive && !moreOpen && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                )}
              </button>

              {/* Dropdown panel */}
              {moreOpen && (
                <div className="absolute left-0 top-full mt-2 w-44 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50 py-1.5">
                  {MORE_NAV.map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors',
                        isActive(href)
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      <Icon size={15} className="shrink-0 text-slate-400 dark:text-zinc-500" />
                      {label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── Right actions ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />

            {/* Notification Bell */}
            {userId && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) markAllRead(); }}
                  className="relative p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {unreadNotifCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-3.5 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Notifications</p>
                      {unreadNotifCount > 0 && (
                        <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 dark:divide-zinc-800">
                      {loadingNotifs ? (
                        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-10">
                          <Bell size={24} className="mx-auto text-slate-200 dark:text-zinc-700 mb-2" />
                          <p className="text-sm text-slate-400 dark:text-zinc-500">No notifications yet</p>
                        </div>
                      ) : notifications.map((notif) => {
                        const { Icon, bg, fg } = getNotifMeta(notif.type);
                        const inner = (
                          <div className="flex items-start gap-3 w-full">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${bg}`}>
                              <Icon size={14} className={fg} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">{notif.title}</p>
                              {notif.body && <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{notif.body}</p>}
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 flex items-center gap-1.5">
                                {formatNotifTime(notif.created_at)}
                                {!notif.is_read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </p>
                            </div>
                          </div>
                        );
                        return (
                          <div key={notif.id} className={cn('px-3 py-3 transition-colors', !notif.is_read ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50')}>
                            {notif.link
                              ? <Link href={notif.link} onClick={() => setNotifOpen(false)} className="block">{inner}</Link>
                              : inner}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avatar → Profile (desktop) */}
            {userId && (
              <Link href={`/profile/${userId}`}
                className="hidden md:flex w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all"
                title={userName}
              >
                {userName?.[0]?.toUpperCase() ?? 'U'}
              </Link>
            )}

            {/* Logout (desktop) */}
            <button onClick={handleLogout} disabled={loggingOut}
              className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              {loggingOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
              {!loggingOut && 'Logout'}
            </button>

            {/* Hamburger (mobile only) */}
            <button onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Drawer ───────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white dark:bg-zinc-950 border-l border-slate-100 dark:border-zinc-800 flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 dark:border-zinc-800 shrink-0">
              <span className="text-base font-bold text-indigo-600">
                Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* All nav links */}
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {/* Primary */}
              <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-4 mb-2">Main</p>
              <div className="space-y-0.5 mb-4">
                {PRIMARY_NAV.map((l) => <MobileNavLink key={l.href} {...l} />)}
              </div>
              {/* Secondary */}
              <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-4 mb-2">More</p>
              <div className="space-y-0.5">
                {MORE_NAV.map((l) => <MobileNavLink key={l.href} {...l} />)}
              </div>
            </div>

            {/* User + logout */}
            <div className="shrink-0 px-3 py-4 border-t border-slate-100 dark:border-zinc-800 space-y-1">
              {userId && (
                <Link href={`/profile/${userId}`} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                    {userName?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{userName}</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500">View profile</p>
                  </div>
                </Link>
              )}
              <button onClick={handleLogout} disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
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
