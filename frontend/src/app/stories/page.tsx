'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, SuccessStory } from '@/types';
import { AppNav } from '@/components/AppNav';
import { SuccessStoryModal } from '@/components/SuccessStoryModal';
import { CheckCircle, Trophy, Plus, Search, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StoriesPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [stories, setStories]         = useState<SuccessStory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [search, setSearch]           = useState('');
  const [deptFilter, setDeptFilter]   = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: storiesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('success_stories')
          .select(`
            *,
            user:profiles!user_id(id, full_name, department, batch_year, profile_picture_url),
            referred_by:profiles!referred_by_id(id, full_name, job_title, current_company)
          `)
          .order('created_at', { ascending: false })
          .limit(60),
      ]);

      setCurrentUser(profile as Profile);
      setStories((storiesData ?? []) as unknown as SuccessStory[]);
      setLoading(false);
    })();
  }, [router, supabase]);

  const departments = Array.from(new Set(stories.map((s) => s.department).filter(Boolean))) as string[];

  const filtered = stories.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.company.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
      || (!s.is_anonymous && s.user?.full_name?.toLowerCase().includes(q));
    const matchDept = !deptFilter || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  const formatDate = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Trophy size={13} /> Wall of Fame
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            MAJU Success Stories
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm max-w-sm mx-auto">
            Real placements, real people. Every story here started with a Parchi referral.
          </p>
          {currentUser && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={15} /> Share your story
            </button>
          )}
        </div>

        {/* ── Stats bar ────────────────────────────────────────────────── */}
        {stories.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Students placed', value: stories.length },
              { label: 'Companies', value: new Set(stories.map((s) => s.company)).size },
              { label: 'Departments', value: departments.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 text-center transition-colors">
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{value}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, name…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            />
          </div>
          {departments.length > 1 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            >
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>

        {/* ── Stories grid ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy size={36} className="mx-auto text-slate-200 dark:text-zinc-700 mb-4" />
            <p className="text-slate-500 dark:text-zinc-400 font-medium">
              {search || deptFilter ? 'No stories match your filters.' : 'No stories yet — be the first!'}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              <Plus size={14} /> Share your placement story
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4 space-y-4">
            {filtered.map((story) => (
              <StoryCard key={story.id} story={story} formatDate={formatDate} />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {currentUser && (
        <SuccessStoryModal
          open={showModal}
          onClose={() => setShowModal(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

function StoryCard({ story, formatDate }: { story: SuccessStory; formatDate: (ts: string) => string }) {
  const displayName = story.is_anonymous
    ? `A ${story.department || 'MAJU'} Student`
    : story.user?.full_name ?? '—';

  const batchShort = story.batch_year ? `'${String(story.batch_year).slice(-2)}` : '';

  // Gradient palette cycles through 4 options
  const gradients = [
    'from-indigo-900 via-purple-900 to-violet-950',
    'from-slate-900 via-indigo-950 to-purple-950',
    'from-[#0f0c29] via-[#302b63] to-[#24243e]',
    'from-violet-950 via-purple-900 to-indigo-950',
  ];
  const gradient = gradients[Math.abs(story.id.charCodeAt(0) + story.id.charCodeAt(1)) % gradients.length];

  return (
    <div className={`break-inside-avoid rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white relative overflow-hidden border border-white/5 hover:border-white/10 transition-all group`}>
      {/* Orb decoration */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />

      <div className="relative z-10">
        {/* Check + company */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle size={16} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-purple-300/60 text-[9px] uppercase tracking-widest">Got placed at</p>
            <h3 className="font-black text-lg leading-tight mt-0.5 truncate">{story.company}</h3>
            <p className="text-indigo-200/70 text-xs mt-0.5">as {story.role}</p>
          </div>
        </div>

        {/* Message */}
        {story.message && (
          <p className="text-white/50 text-xs leading-relaxed italic mb-4 line-clamp-3">
            &ldquo;{story.message}&rdquo;
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-white/10 pt-3">
          <p className="font-semibold text-sm text-white/85">{displayName}</p>
          {(story.department || batchShort) && (
            <p className="text-indigo-300/50 text-[11px] mt-0.5">
              {story.department}{story.department && batchShort ? ' · ' : ''}MAJU {batchShort}
            </p>
          )}
          {story.referred_by && (
            <p className="text-emerald-400/60 text-[11px] mt-1">
              Referred by {story.referred_by.full_name}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <p className="text-white/30 text-[10px]">{formatDate(story.created_at)}</p>
          <Link
            href={`/stories/${story.id}`}
            className="text-indigo-300/70 hover:text-indigo-300 text-[11px] font-semibold transition-colors flex items-center gap-1"
          >
            View card →
          </Link>
        </div>
      </div>
    </div>
  );
}
