export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, Briefcase, MessageCircle, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Parchi<span className="text-gray-400 dark:text-gray-500 font-normal">.maju</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/alumni" className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Browse Alumni</Link>
            <Link href="/referrals" className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Referrals</Link>
            <Link href="/messages" className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
              Messages
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <Link href={`/profile/${user.id}`} className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm" title="My Profile">
              {profile.full_name?.[0]?.toUpperCase()}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* ─── Hero Banner ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 mb-8 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute right-20 bottom-0 w-32 h-32 bg-purple-400/20 rounded-full blur-xl" />
          <div className="absolute left-1/2 -bottom-6 w-24 h-24 bg-indigo-300/20 rounded-full blur-xl" />
          <div className="relative">
            <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Hey, {firstName} 👋</h1>
            <p className="text-indigo-200 mt-1.5 text-sm">
              {isAlumni
                ? `${profile.job_title ?? 'Alumni'} · ${profile.current_company ?? 'your company'}`
                : isTeacher
                ? `Faculty · ${profile.department}`
                : `${profile.department} · Batch ${profile.batch_year}`}
            </p>
          </div>
        </div>

        {/* ─── Stats ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-800 dark:to-indigo-950 p-5 text-white shadow-sm shadow-indigo-200 dark:shadow-none">
            <Briefcase size={20} className="mb-3 opacity-90" />
            <div className="text-3xl font-extrabold">{referralCount}</div>
            <div className="text-xs mt-1 opacity-80">{isAlumni ? 'Referrals given' : 'Requests sent'}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-800 dark:to-orange-950 p-5 text-white shadow-sm shadow-amber-200 dark:shadow-none">
            <Clock size={20} className="mb-3 opacity-90" />
            <div className="text-3xl font-extrabold">{pendingCount}</div>
            <div className="text-xs mt-1 opacity-80">{isAlumni ? 'Pending inbox' : 'Awaiting reply'}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 dark:from-violet-800 dark:to-purple-950 p-5 text-white shadow-sm shadow-violet-200 dark:shadow-none">
            <MessageCircle size={20} className="mb-3 opacity-90" />
            <div className="text-3xl font-extrabold">{unread}</div>
            <div className="text-xs mt-1 opacity-80">Unread messages</div>
          </div>
        </div>

        {/* ─── Quick Actions ────────────────────────────────────────────────── */}
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Quick actions</p>
        <div className="grid md:grid-cols-2 gap-4">
          {isAlumni ? (
            <>
              <ActionCard href="/referrals" icon={<Briefcase size={22} />} title="Review referral requests"
                description={pendingCount > 0 ? `${pendingCount} requests waiting for your response` : 'No pending requests right now'}
                badge={pendingCount > 0 ? String(pendingCount) : undefined} color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<Users size={22} />} title="Update your profile"
                description="Keep your company and open-to-referrals status up to date" color="purple" />
            </>
          ) : isTeacher ? (
            <>
              <ActionCard href="/alumni" icon={<Users size={22} />} title="Browse alumni"
                description="See where MAJU graduates are working now" color="indigo" />
              <ActionCard href={`/profile/${user.id}`} icon={<CheckCircle size={22} />} title="Your profile"
                description="Update your department and bio" color="purple" />
            </>
          ) : (
            <>
              <ActionCard href="/alumni" icon={<Users size={22} />} title="Browse alumni"
                description="Find MAJU alumni at companies you want to join" color="indigo" />
              <ActionCard href="/referrals" icon={<Briefcase size={22} />} title="My referral requests"
                description={referralCount > 0 ? `You've sent ${referralCount} request${referralCount > 1 ? 's' : ''}` : 'Track your referral requests here'}
                color="purple" />
            </>
          )}
          <ActionCard href="/messages" icon={<MessageCircle size={22} />} title="Messages"
            description={unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'Chat with your connections'}
            badge={unread > 0 ? String(unread) : undefined} color="pink" />
          <ActionCard href={`/profile/${user.id}`} icon={<CheckCircle size={22} />} title="Complete your profile"
            description="A complete profile gets 3× more responses" color="green" />
        </div>
      </main>
    </div>
  );
}

function ActionCard({ href, icon, title, description, badge, color }: {
  href: string; icon: React.ReactNode; title: string; description: string; badge?: string; color: string;
}) {
  const iconColors: Record<string, string> = {
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40',
    pink:   'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/40',
    green:  'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40',
  };
  return (
    <Link href={href} className="flex items-start gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all group">
      <div className={`p-3 rounded-xl ${iconColors[color] ?? 'text-gray-600 bg-gray-100'} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
          {badge && <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{badge}</span>}
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 shrink-0 mt-1 transition-colors" />
    </Link>
  );
}
