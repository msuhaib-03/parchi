export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Users, Briefcase, MessageCircle, ArrowRight, CheckCircle, Clock, XCircle } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Send alumni with no company, or anyone with no bio, to onboarding
  const needsOnboarding =
    !profile ||
    (profile.role === 'alumni' && !profile.current_company) ||
    (profile.role === 'student' && (!profile.skills || profile.skills.length === 0) && !profile.bio);

  if (needsOnboarding) redirect('/onboarding');

  const isAlumni = profile.role === 'alumni';

  // Fetch stats
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
  } else {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Top Bar ─────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Parchi<span className="text-gray-400 font-normal">.maju</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/alumni" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Browse Alumni</Link>
            <Link href="/referrals" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Referrals</Link>
            <Link href="/messages" className="text-sm text-gray-600 hover:text-gray-900 font-medium relative">
              Messages
              {(messageCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {messageCount}
                </span>
              )}
            </Link>
            <Link href={`/profile/${user.id}`} className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm" title="My Profile">
              {profile.full_name?.[0]?.toUpperCase()}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* ─── Welcome ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {profile.full_name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isAlumni
              ? `${profile.job_title ?? 'Alumni'} at ${profile.current_company ?? 'your company'}`
              : `${profile.department} · Batch ${profile.batch_year}`}
          </p>
        </div>

        {/* ─── Stats ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={<Briefcase size={20} className="text-indigo-600" />}
            value={referralCount}
            label={isAlumni ? 'Referrals given' : 'Requests sent'}
            color="indigo"
          />
          <StatCard
            icon={<Clock size={20} className="text-yellow-600" />}
            value={pendingCount}
            label={isAlumni ? 'Pending inbox' : 'Awaiting reply'}
            color="yellow"
          />
          <StatCard
            icon={<MessageCircle size={20} className="text-purple-600" />}
            value={messageCount ?? 0}
            label="Unread messages"
            color="purple"
          />
        </div>

        {/* ─── Quick Actions ────────────────────────────────────────────────── */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {isAlumni ? (
            <>
              <ActionCard
                href="/referrals"
                icon={<Briefcase size={22} />}
                title="Review referral requests"
                description={pendingCount > 0 ? `${pendingCount} requests waiting for your response` : "No pending requests right now"}
                badge={pendingCount > 0 ? String(pendingCount) : undefined}
                color="indigo"
              />
              <ActionCard
                href={`/profile/${user.id}`}
                icon={<Users size={22} />}
                title="Update your profile"
                description="Keep your company and open-to-referrals status up to date"
                color="purple"
              />
            </>
          ) : (
            <>
              <ActionCard
                href="/alumni"
                icon={<Users size={22} />}
                title="Browse alumni"
                description="Find MAJU alumni at companies you want to join"
                color="indigo"
              />
              <ActionCard
                href="/referrals"
                icon={<Briefcase size={22} />}
                title="My referral requests"
                description={referralCount > 0 ? `You've sent ${referralCount} request${referralCount > 1 ? 's' : ''}` : "Track your referral requests here"}
                color="purple"
              />
            </>
          )}
          <ActionCard
            href="/messages"
            icon={<MessageCircle size={22} />}
            title="Messages"
            description={(messageCount ?? 0) > 0 ? `${messageCount} unread message${(messageCount ?? 0) > 1 ? 's' : ''}` : "Chat with your connections"}
            badge={(messageCount ?? 0) > 0 ? String(messageCount) : undefined}
            color="pink"
          />
          <ActionCard
            href={`/profile/${user.id}`}
            icon={<CheckCircle size={22} />}
            title="Complete your profile"
            description="A complete profile gets 3× more responses"
            color="green"
          />
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] ?? 'bg-gray-50 border-gray-100'}`}>
      <div className="mb-3">{icon}</div>
      <div className="text-3xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function ActionCard({
  href, icon, title, description, badge, color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  color: string;
}) {
  const iconColors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-100',
    purple: 'text-purple-600 bg-purple-100',
    pink: 'text-pink-600 bg-pink-100',
    green: 'text-green-600 bg-green-100',
  };
  return (
    <Link
      href={href}
      className="flex items-start gap-4 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:border-gray-200 transition-all group"
    >
      <div className={`p-3 rounded-xl ${iconColors[color] ?? 'text-gray-600 bg-gray-100'} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          {badge && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
              {badge}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0 mt-1 transition-colors" />
    </Link>
  );
}
