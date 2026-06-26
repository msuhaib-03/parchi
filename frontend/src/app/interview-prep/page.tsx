'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, InterviewExperience, PrepResource, InterviewDifficulty, InterviewOutcome, ResourceType } from '@/types';
import {
  DIFFICULTY_LABELS, DIFFICULTY_COLORS, OUTCOME_LABELS, OUTCOME_COLORS, RESOURCE_TYPE_LABELS,
} from '@/types';
import { AppNav } from '@/components/AppNav';
import { HelpfulButton } from '@/components/HelpfulButton';
import { cn } from '@/lib/utils';
import {
  Loader2, Plus, Search, ClipboardList, BookOpen, ExternalLink,
  Building2, Layers, ArrowUpDown, MessageSquareQuote, Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type Tab = 'experiences' | 'resources';

function InterviewPrepInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [me, setMe]                   = useState<Profile | null>(null);
  const [experiences, setExperiences] = useState<InterviewExperience[]>([]);
  const [resources, setResources]     = useState<PrepResource[]>([]);
  const [loading, setLoading]         = useState(true);

  const initialTab = (searchParams.get('tab') === 'resources' ? 'resources' : 'experiences') as Tab;
  const [tab, setTab]           = useState<Tab>(initialTab);
  const [search, setSearch]     = useState('');
  const [difficulty, setDifficulty] = useState<'' | InterviewDifficulty>('');
  const [outcome, setOutcome]   = useState<'' | InterviewOutcome>('');
  const [resType, setResType]   = useState<'' | ResourceType>('');
  const [sortBy, setSortBy]     = useState<'recent' | 'helpful'>('recent');

  const canPostResource = me?.role === 'alumni' || me?.role === 'teacher';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [
        { data: profile },
        { data: exps },
        { data: ress },
        { data: expHelpful },
        { data: resHelpful },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('interview_experiences_feed')
          .select('*')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('prep_resources')
          .select('*, author:profiles!author_id(id, full_name, role, job_title, current_company)')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('interview_experience_helpful').select('experience_id').eq('user_id', user.id),
        supabase.from('prep_resource_helpful').select('resource_id').eq('user_id', user.id),
      ]);

      const expSet = new Set((expHelpful ?? []).map((r) => r.experience_id));
      const resSet = new Set((resHelpful ?? []).map((r) => r.resource_id));

      setMe(profile as Profile);
      setExperiences(((exps ?? []) as unknown as InterviewExperience[]).map((e) => ({ ...e, i_found_helpful: expSet.has(e.id) })));
      setResources(((ress ?? []) as unknown as PrepResource[]).map((r) => ({ ...r, i_found_helpful: resSet.has(r.id) })));
      setLoading(false);
    })();
  }, [router, supabase]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSearch(''); setDifficulty(''); setOutcome(''); setResType('');
    router.replace(`/interview-prep?tab=${t}`, { scroll: false });
  };

  // ── Filtered + sorted experiences ──────────────────────────────────────────
  const filteredExperiences = useMemo(() => {
    const q = search.toLowerCase();
    let list = experiences.filter((e) => {
      const matchQ = !q || e.company.toLowerCase().includes(q) || e.role.toLowerCase().includes(q)
        || e.tags?.some((t) => t.toLowerCase().includes(q));
      const matchD = !difficulty || e.difficulty === difficulty;
      const matchO = !outcome || e.outcome === outcome;
      return matchQ && matchD && matchO;
    });
    if (sortBy === 'helpful') list = [...list].sort((a, b) => b.helpful_count - a.helpful_count);
    return list;
  }, [experiences, search, difficulty, outcome, sortBy]);

  // ── Filtered + sorted resources ────────────────────────────────────────────
  const filteredResources = useMemo(() => {
    const q = search.toLowerCase();
    let list = resources.filter((r) => {
      const matchQ = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
        || r.tags?.some((t) => t.toLowerCase().includes(q));
      const matchT = !resType || r.resource_type === resType;
      return matchQ && matchT;
    });
    if (sortBy === 'helpful') list = [...list].sort((a, b) => b.helpful_count - a.helpful_count);
    return list;
  }, [resources, search, resType, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
            <ClipboardList size={13} /> Interview Prep Corner
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Walk in knowing what to expect</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Real interview experiences and prep resources shared by the MAJU community.
          </p>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-1 mb-5 w-full max-w-md">
          <TabButton active={tab === 'experiences'} onClick={() => switchTab('experiences')}
            icon={<MessageSquareQuote size={15} />} label="Experiences" count={experiences.length} />
          <TabButton active={tab === 'resources'} onClick={() => switchTab('resources')}
            icon={<BookOpen size={15} />} label="Resources" count={resources.length} />
        </div>

        {/* ── Toolbar: search + filters + post ───────────────────────────── */}
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'experiences' ? 'Search company, role, skill…' : 'Search guides, topics…'}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            />
          </div>

          {tab === 'experiences' ? (
            <>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as InterviewDifficulty | '')}
                className="border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors">
                <option value="">All difficulty</option>
                {(Object.keys(DIFFICULTY_LABELS) as InterviewDifficulty[]).map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
              </select>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as InterviewOutcome | '')}
                className="border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors">
                <option value="">All outcomes</option>
                {(Object.keys(OUTCOME_LABELS) as InterviewOutcome[]).map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
              </select>
            </>
          ) : (
            <select value={resType} onChange={(e) => setResType(e.target.value as ResourceType | '')}
              className="border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors">
              <option value="">All types</option>
              {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</option>)}
            </select>
          )}

          <button
            onClick={() => setSortBy((s) => s === 'helpful' ? 'recent' : 'helpful')}
            className={cn(
              'flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors',
              sortBy === 'helpful'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
            )}
          >
            <ArrowUpDown size={13} /> {sortBy === 'helpful' ? 'Most helpful' : 'Recent'}
          </button>

          {tab === 'experiences' ? (
            <Link href="/interview-prep/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={16} /> Share experience
            </Link>
          ) : canPostResource ? (
            <Link href="/interview-prep/resources/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={16} /> Add resource
            </Link>
          ) : null}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : tab === 'experiences' ? (
          filteredExperiences.length === 0 ? (
            <EmptyState
              icon={<MessageSquareQuote size={36} className="mx-auto text-slate-200 dark:text-zinc-700 mb-4" />}
              text={search || difficulty || outcome ? 'No experiences match your filters.' : 'No interview experiences yet — be the first to share one.'}
              cta={<Link href="/interview-prep/new" className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"><Plus size={14} /> Share your interview experience</Link>}
            />
          ) : (
            <div className="space-y-4">
              {filteredExperiences.map((e) => <ExperienceCard key={e.id} exp={e} meId={me!.id} />)}
            </div>
          )
        ) : (
          filteredResources.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={36} className="mx-auto text-slate-200 dark:text-zinc-700 mb-4" />}
              text={search || resType ? 'No resources match your filters.' : 'No prep resources yet.'}
              cta={canPostResource
                ? <Link href="/interview-prep/resources/new" className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"><Plus size={14} /> Add the first resource</Link>
                : <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500 flex items-center justify-center gap-1.5"><Lock size={11} /> Alumni & faculty can post resources</p>}
            />
          ) : (
            <div className="space-y-4">
              {filteredResources.map((r) => <ResourceCard key={r.id} res={r} meId={me!.id} />)}
            </div>
          )
        )}
      </main>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon, label, count }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
      )}>
      {icon} {label}
      <span className={cn('text-[11px] px-1.5 py-0.5 rounded-full', active ? 'bg-white/20' : 'bg-slate-100 dark:bg-zinc-800')}>{count}</span>
    </button>
  );
}

function EmptyState({ icon, text, cta }: { icon: React.ReactNode; text: string; cta: React.ReactNode }) {
  return (
    <div className="text-center py-20">
      {icon}
      <p className="text-slate-500 dark:text-zinc-400 font-medium">{text}</p>
      {cta}
    </div>
  );
}

// ── Experience card ─────────────────────────────────────────────────────────
function ExperienceCard({ exp, meId }: { exp: InterviewExperience; meId: string }) {
  const authorName = exp.is_anonymous
    ? `A ${exp.department || 'MAJU'} student`
    : exp.author_name ?? 'A MAJUite';

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
          <Building2 size={20} className="text-indigo-500 dark:text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/interview-prep/${exp.id}`} className="group">
            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {exp.role} <span className="font-normal text-slate-500 dark:text-zinc-400">at {exp.company}</span>
            </h2>
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[exp.difficulty]}`}>{DIFFICULTY_LABELS[exp.difficulty]}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${OUTCOME_COLORS[exp.outcome]}`}>{OUTCOME_LABELS[exp.outcome]}</span>
            {exp.num_rounds ? <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Layers size={11} /> {exp.num_rounds} round{exp.num_rounds > 1 ? 's' : ''}</span> : null}
            {exp.interview_date && <span className="text-[11px] text-slate-400 dark:text-zinc-500">{exp.interview_date}</span>}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed line-clamp-2">{exp.process}</p>

      {(exp.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {exp.tags!.slice(0, 6).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-zinc-800">
        <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">
          {exp.is_anonymous || !exp.author_id
            ? authorName
            : <>Shared by <Link href={`/profile/${exp.author_id}`} className="font-medium text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400">{authorName}</Link></>}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <HelpfulButton kind="experience" targetId={exp.id} userId={meId} initialCount={exp.helpful_count} initialMarked={!!exp.i_found_helpful} size="sm" />
          <Link href={`/interview-prep/${exp.id}`} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Read →</Link>
        </div>
      </div>
    </div>
  );
}

// ── Resource card ─────────────────────────────────────────────────────────────
function ResourceCard({ res, meId }: { res: PrepResource; meId: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <BookOpen size={20} className="text-violet-500 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/interview-prep/resources/${res.id}`} className="group">
              <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{res.title}</h2>
            </Link>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
              {RESOURCE_TYPE_LABELS[res.resource_type]}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed line-clamp-2">{res.description}</p>
        </div>
      </div>

      {(res.tags?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {res.tags!.slice(0, 6).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">{t}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-zinc-800 gap-2">
        <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">
          {res.author ? <>by <Link href={`/profile/${res.author.id}`} className="font-medium text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400">{res.author.full_name}</Link></> : 'by a MAJUite'}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {res.url && (
            <a href={res.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400">
              <ExternalLink size={12} /> Open
            </a>
          )}
          <HelpfulButton kind="resource" targetId={res.id} userId={meId} initialCount={res.helpful_count} initialMarked={!!res.i_found_helpful} size="sm" />
          <Link href={`/interview-prep/resources/${res.id}`} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap">Details →</Link>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPrepPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <InterviewPrepInner />
    </Suspense>
  );
}
