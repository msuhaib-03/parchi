export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Users, Briefcase, MessageCircle, ArrowRight,
  Clock, Building2, Trophy, Zap, TrendingUp,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { calculateCompletion } from '@/lib/profileCompletion';
import type { Profile } from '@/types';

// ── Time helper (SSR-safe) ────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

// ── Simple skill match count (used for feed job cards) ───────────────────────
function skillMatchCount(
  skills: string[] | null | undefined,
  tags:   string[] | null | undefined,
): number {
  if (!skills?.length || !tags?.length) return 0;
  const set = new Set(skills.map((s) => s.toLowerCase().trim()));
  return tags.filter((t) => set.has(t.toLowerCase().trim())).length;
}

// ── Feed item types ───────────────────────────────────────────────────────────
type AlumniFeedItem  = { kind: 'alumni';  created_at: string; id: string; full_name: string; job_title?: string | null; current_company?: string | null; department: string; batch_year: number };
type JobFeedItem     = { kind: 'job';     created_at: string; id: string; title: string; company: string; job_type: string; tags?: string[] | null; matchCount: number };
type StoryFeedItem   = { kind: 'story';   created_at: string; id: string; company: string; role: string; is_anonymous: boolean; user_name?: string | null; user_dept?: string | null };
type FeedItem = AlumniFeedItem | JobFeedItem | StoryFeedItem;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  const needsOnboarding =
    !profile ||
    (profile.role === 'alumni'  && !profile.current_company) ||
    (profile.role === 'student' && (!profile.skills || profile.skills.length === 0) && !profile.bio);

  if (needsOnboarding) redirect('/onboarding');

  const isAlumni  = profile.role === 'alumni';
  const isTeacher = profile.role === 'teacher';
  const isStudent = profile.role === 'student';
  const firstName = profile.full_name.split(' ')[0];

  // ── Existing stats queries ────────────────────────────────────────────────
  let referralCount = 0, pendingCount = 0;

  if (isAlumni) {
    const [{ count: inbox }, { count: referred }] = await Promise.all([
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('alumni_id', user.id).eq('status', 'pending'),
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('alumni_id', user.id).eq('status', 'referred'),
    ]);
    pendingCount  = inbox   ?? 0;
    referralCount = referred ?? 0;
  } else if (!isTeacher) {
    const [{ count: sent }, { count: pending }] = await Promise.all([
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('requester_id', user.id),
      supabase.from('referral_requests').select('*', { count: 'exact', head: true }).eq('requester_id', user.id).eq('status', 'pending'),
    ]);
    referralCount = sent    ?? 0;
    pendingCount  = pending ?? 0;
  }

  const { count: messageCount } = await supabase
    .from('messages').select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id).eq('is_read', false);
  const unread = messageCount ?? 0;

  // ── Daily feed queries (parallel, graceful on missing tables) ────────────
  const TWO_WEEKS = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const ONE_MONTH = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: recentAlumni },
    { data: recentJobs   },
    { data: recentStories },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, job_title, current_company, department, batch_year, created_at')
      .eq('role', 'alumni')
      .neq('id', user.id)
      .gte('created_at', TWO_WEEKS)
      .order('created_at', { ascending: false })
      .limit(4),

    supabase
      .from('jobs')
      .select('id, title, company, job_type, tags, created_at')
      .eq('is_active', true)
      .neq('posted_by', user.id)
      .gte('created_at', TWO_WEEKS)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('success_stories')
      .select('id, company, role, is_anonymous, created_at, user:profiles!user_id(full_name, department)')
      .gte('created_at', ONE_MONTH)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);

  // ── Build unified + sorted feed ──────────────────────────────────────────
  const typedProfile = profile as Profile;

  const feedItems: FeedItem[] = [
    ...(recentAlumni ?? []).map((a): AlumniFeedItem => ({
      kind: 'alumni', created_at: a.created_at,
      id: a.id, full_name: a.full_name, job_title: a.job_title,
      current_company: a.current_company, department: a.department, batch_year: a.batch_year,
    })),
    ...(recentJobs ?? []).map((j): JobFeedItem => ({
      kind: 'job', created_at: j.created_at,
      id: j.id, title: j.title, company: j.company, job_type: j.job_type, tags: j.tags,
      matchCount: skillMatchCount(typedProfile.skills, j.tags),
    })),
    ...((recentStories ?? []) as unknown as Array<{
      id: string; company: string; role: string; is_anonymous: boolean; created_at: string;
      user: { full_name: string; department: string } | { full_name: string; department: string }[] | null;
    }>).map((s): StoryFeedItem => {
      // Supabase returns joined rows as an array — unwrap it
      const u = Array.isArray(s.user) ? s.user[0] : s.user;
      return {
        kind: 'story', created_at: s.created_at,
        id: s.id, company: s.company, role: s.role, is_anonymous: s.is_anonymous,
        user_name: u?.full_name, user_dept: u?.department,
      };
    }),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // ── Stats (only non-zero) ────────────────────────────────────────────────
  const stats = [
    { value: referralCount, label: isAlumni ? 'Referrals given' : 'Requests sent', icon: <Briefcase size={18} />, color: 'indigo' },
    { value: pendingCount,  label: isAlumni ? 'Pending in inbox' : 'Awaiting reply', icon: <Clock size={18} />,    color: 'amber'  },
    { value: unread,        label: 'Unread messages', icon: <MessageCircle size={18} />,                           color: 'violet' },
  ].filter((s) => s.value > 0);

  // ── Profile completion ───────────────────────────────────────────────────
  const completion = calculateCompletion(typedProfile);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={profile.full_name} userId={user.id} unreadCount={unread} />

      <main className="max-w-5xl mx-auto px-4 py-7">

        {/* ── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-7 mb-7 text-white">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-16 bottom-0 w-28 h-28 bg-purple-300/20 rounded-full blur-xl pointer-events-none" />
          <div className="relative">
            <p className="text-indigo-200 text-xs font-medium mb-1 uppercase tracking-wider">Welcome back</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Hey, {firstName} 👋</h1>
            <p className="text-indigo-200 mt-1 text-sm">
              {isAlumni
                ? `${profile.job_title ?? 'Alumni'} · ${profile.current_company ?? 'your company'}`
                : isTeacher
                ? `Faculty · ${profile.department}`
                : `${profile.department} · Batch ${profile.batch_year}`}
            </p>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────────── */}
        {stats.length > 0 && (
          <div className={`grid gap-4 mb-7 ${stats.length === 1 ? 'grid-cols-1 max-w-[200px]' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </div>
        )}

        {/* ── Daily Feed ──────────────────────────────────────────────────── */}
        {feedItems.length > 0 && (
          <div className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-500 dark:text-indigo-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                  What&apos;s new
                </p>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">Last 2 weeks</p>
            </div>

            <div className="space-y-3">
              {feedItems.map((item, idx) => (
                <FeedCard key={idx} item={item} isStudent={isStudent} />
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Quick actions</p>
        <div className="grid md:grid-cols-2 gap-3">
          {isAlumni ? (
            <>
              <ActionCard href="/referrals" icon={<Briefcase size={20} />} title="Review referral requests"
                description={pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting` : 'No pending requests right now'}
                badge={pendingCount > 0 ? String(pendingCount) : undefined} color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<Users size={20} />} title="Update your profile"
                description="Keep your company and referral status current" color="violet" />
            </>
          ) : isTeacher ? (
            <>
              <ActionCard href="/alumni" icon={<Users size={20} />} title="Browse alumni"
                description="See where MAJU graduates are working today" color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<Users size={20} />} title="Your profile"
                description="Update your department and bio" color="violet" />
            </>
          ) : (
            <>
              <ActionCard href="/alumni" icon={<Users size={20} />} title="Browse alumni"
                description="Find MAJU alumni at companies you want to join" color="indigo" />
              <ActionCard href="/referrals" icon={<Briefcase size={20} />} title="My referral requests"
                description={referralCount > 0 ? `You have sent ${referralCount} request${referralCount > 1 ? 's' : ''}` : 'Track your referral requests here'}
                color="violet" />
            </>
          )}
          <ActionCard href="/messages" icon={<MessageCircle size={20} />} title="Messages"
            description={unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'Chat with your connections'}
            badge={unread > 0 ? String(unread) : undefined} color="purple" />
          <CompletionActionCard
            href={`/profile/${user.id}`}
            score={completion.score}
            levelLabel={completion.levelLabel}
            pending={completion.items.filter((i) => !i.done).length}
            levelColor={completion.levelColor}
          />
        </div>

      </main>
    </div>
  );
}

// ── Feed card ─────────────────────────────────────────────────────────────────
function FeedCard({ item, isStudent }: { item: FeedItem; isStudent: boolean }) {
  if (item.kind === 'alumni') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 flex items-start gap-3 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <Users size={16} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-snug">
            <span className="text-violet-600 dark:text-violet-400">{item.full_name}</span>{' '}
            joined as Alumni
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
            {item.job_title && item.current_company
              ? `${item.job_title} · ${item.current_company}`
              : `${item.department} · Batch ${item.batch_year}`}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">{timeAgo(item.created_at)}</span>
          <Link href={`/profile/${item.id}`}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
            View profile →
          </Link>
        </div>
      </div>
    );
  }

  if (item.kind === 'job') {
    const isMatch  = item.matchCount > 0;
    const isStrong = item.matchCount >= 3;
    return (
      <div className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 flex items-start gap-3 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors ${
        isStrong ? 'border-emerald-100 dark:border-emerald-900' : 'border-slate-100 dark:border-zinc-800'
      }`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isStrong ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'
        }`}>
          {isStrong
            ? <Zap size={16} className="text-emerald-600 dark:text-emerald-400" />
            : <Building2 size={16} className="text-indigo-600 dark:text-indigo-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-snug">
              {item.title}{' '}
              <span className="font-normal text-slate-500 dark:text-zinc-400">at {item.company}</span>
            </p>
            {isStudent && isStrong && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                ⚡ Strong match
              </span>
            )}
            {isStudent && isMatch && !isStrong && (
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {item.matchCount} skill{item.matchCount > 1 ? 's' : ''} match
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 capitalize">{item.job_type}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">{timeAgo(item.created_at)}</span>
          <Link href="/jobs"
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">
            View job →
          </Link>
        </div>
      </div>
    );
  }

  if (item.kind === 'story') {
    const name = item.is_anonymous
      ? `A${item.user_dept ? ` ${item.user_dept}` : ' MAJU'} student`
      : (item.user_name ?? 'Someone');
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 flex items-start gap-3 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Trophy size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 leading-snug">
            <span className="text-amber-600 dark:text-amber-400">{name}</span>{' '}
            placed at <span className="text-slate-900 dark:text-zinc-100">{item.company}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">as {item.role}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 whitespace-nowrap">{timeAgo(item.created_at)}</span>
          <Link href={`/stories/${item.id}`}
            className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap">
            Read story →
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

// ── Profile completion action card ───────────────────────────────────────────
function CompletionActionCard({ href, score, levelLabel, pending, levelColor }: {
  href: string; score: number; levelLabel: string; pending: number; levelColor: string;
}) {
  const ringColors: Record<string, string> = {
    slate: '#94a3b8', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', emerald: '#10b981',
  };
  const ring = ringColors[levelColor] ?? ringColors.indigo;
  const R = 16, C = 2 * Math.PI * R;

  return (
    <Link href={href}
      className="flex items-start gap-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none hover:border-slate-200 dark:hover:border-zinc-700 transition-all group">
      <div className="relative w-11 h-11 shrink-0 mt-0.5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className="stroke-slate-100 dark:stroke-zinc-800" />
          <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" strokeLinecap="round" stroke={ring}
            strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-slate-900 dark:text-zinc-100">{score}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">Profile Completion</h3>
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-full">{levelLabel}</span>
        </div>
        <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5 leading-relaxed">
          {score === 100
            ? 'Your profile is complete! You look great to alumni.'
            : `${pending} item${pending !== 1 ? 's' : ''} left — complete profile gets 3× more responses`}
        </p>
      </div>
      <ArrowRight size={15} className="text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors" />
    </Link>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon, color }: { value: number; label: string; icon: React.ReactNode; color: string }) {
  const gradients: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900',
    amber:  'from-amber-400 to-orange-500 dark:from-amber-700 dark:to-orange-900',
    violet: 'from-violet-500 to-purple-700 dark:from-violet-700 dark:to-purple-900',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradients[color] ?? gradients.indigo} p-5 text-white`}>
      <div className="opacity-80 mb-3">{icon}</div>
      <div className="text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs mt-1 opacity-70">{label}</div>
    </div>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({ href, icon, title, description, badge, color }: {
  href: string; icon: React.ReactNode; title: string; description: string; badge?: string; color: string;
}) {
  const iconStyles: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60',
    slate:  'text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800',
  };
  return (
    <Link href={href}
      className="flex items-start gap-4 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none hover:border-slate-200 dark:hover:border-zinc-700 transition-all group">
      <div className={`p-2.5 rounded-xl shrink-0 ${iconStyles[color] ?? iconStyles.slate}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">{title}</h3>
          {badge && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{badge}</span>}
        </div>
        <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight size={15} className="text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors" />
    </Link>
  );
}
