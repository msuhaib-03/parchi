export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, Briefcase, MessageCircle, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { AppNav } from '@/components/AppNav';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const needsOnboarding =
    !profile ||
    (profile.role === 'alumni' && !profile.current_company) ||
    (profile.role === 'student' && (!profile.skills || profile.skills.length === 0) && !profile.bio);

  if (needsOnboarding) redirect('/onboarding');

  const isAlumni = profile.role === 'alumni';
  const isTeacher = profile.role === 'teacher';
  const firstName = profile.full_name.split(' ')[0];

  let referralCount = 0;
  let pendingCount = 0;

  if (isAlumni) {
    const { count: inbox } = await supabase
      .from('referral_requests')
      .select('*', { count: 'exact', head: true })
      .eq('alumni_id', user.id)
      .eq('status', 'pending');
    pendingCount = inbox ?? 0;

    const { count: referred } = await supabase
      .from('referral_requests')
      .select('*', { count: 'exact', head: true })
      .eq('alumni_id', user.id)
      .eq('status', 'referred');
    referralCount = referred ?? 0;
  } else if (!isTeacher) {
    const { count: sent } = await supabase
      .from('referral_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id);
    referralCount = sent ?? 0;

    const { count: pending } = await supabase
      .from('referral_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requester_id', user.id)
      .eq('status', 'pending');
    pendingCount = pending ?? 0;
  }

  const { count: messageCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', user.id)
    .eq('is_read', false);

  const unread = messageCount ?? 0;

  // Only include stats with non-zero values
  const stats = [
    { value: referralCount, label: isAlumni ? 'Referrals given' : 'Requests sent', icon: <Briefcase size={18} />, color: 'indigo' },
    { value: pendingCount, label: isAlumni ? 'Pending in inbox' : 'Awaiting reply', icon: <Clock size={18} />, color: 'amber' },
    { value: unread, label: 'Unread messages', icon: <MessageCircle size={18} />, color: 'violet' },
  ].filter((s) => s.value > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">

      <AppNav userName={profile.full_name} userId={user.id} unreadCount={unread} />

      <main className="max-w-5xl mx-auto px-4 py-7">

        {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-7 mb-7 text-white">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute right-16 bottom-0 w-28 h-28 bg-purple-300/20 rounded-full blur-xl pointer-events-none" />
          <div className="relative">
            <p className="text-indigo-200 text-xs font-medium mb-1 uppercase tracking-wider">Welcome back</p>
            <h1 className="text-2xl font-extrabold tracking-tight">Hey, {firstName}</h1>
            <p className="text-indigo-200 mt-1 text-sm">
              {isAlumni
                ? `${profile.job_title ?? 'Alumni'} · ${profile.current_company ?? 'your company'}`
                : isTeacher
                ? `Faculty · ${profile.department}`
                : `${profile.department} · Batch ${profile.batch_year}`}
            </p>
          </div>
        </div>

        {/* ─── Stats — only render if at least one is non-zero ─────────────── */}
        {stats.length > 0 && (
          <div className={`grid gap-4 mb-7 ${
            stats.length === 1 ? 'grid-cols-1 max-w-[200px]' :
            stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}>
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>
        )}

        {/* ─── Quick Actions ────────────────────────────────────────────────── */}
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Quick actions</p>
        <div className="grid md:grid-cols-2 gap-3">
          {isAlumni ? (
            <>
              <ActionCard href="/referrals" icon={<Briefcase size={20} />} title="Review referral requests"
                description={pendingCount > 0 ? `${pendingCount} request${pendingCount > 1 ? 's' : ''} waiting for your response` : 'No pending requests right now'}
                badge={pendingCount > 0 ? String(pendingCount) : undefined} color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<Users size={20} />} title="Update your profile"
                description="Keep your company and open-to-referrals status current" color="violet" />
            </>
          ) : isTeacher ? (
            <>
              <ActionCard href="/alumni" icon={<Users size={20} />} title="Browse alumni"
                description="See where MAJU graduates are working today" color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<CheckCircle size={20} />} title="Your profile"
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
          <ActionCard href={`/profile/${user.id}`} icon={<CheckCircle size={20} />} title="Complete your profile"
            description="A complete profile gets more responses from alumni" color="slate" />
        </div>
      </main>
    </div>
  );
}

function StatCard({ value, label, icon, color }: {
  value: number; label: string; icon: React.ReactNode; color: string;
}) {
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
