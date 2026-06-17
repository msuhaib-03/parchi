'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Job, Profile } from '@/types';
import { JOB_TYPE_LABELS, JOB_TYPE_COLORS } from '@/types';
import {
  Loader2, MapPin, Clock, Plus, ExternalLink,
  Mail, Building2, Search, Zap, Sparkles, ArrowUpDown,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ── Skill match helper ────────────────────────────────────────────────────────
interface MatchInfo {
  count:  number;
  skills: string[];
  level:  'strong' | 'good' | 'none';
}

function getMatchInfo(
  studentSkills: string[] | null | undefined,
  jobTags:       string[] | null | undefined,
): MatchInfo {
  if (!studentSkills?.length || !jobTags?.length)
    return { count: 0, skills: [], level: 'none' };

  const norm      = (s: string) => s.toLowerCase().trim();
  const skillsSet = new Set(studentSkills.map(norm));
  const matched   = jobTags.filter((t) => skillsSet.has(norm(t)));

  return {
    count:  matched.length,
    skills: matched,
    level:  matched.length >= 3 ? 'strong' : matched.length >= 1 ? 'good' : 'none',
  };
}

// ── Page (wrapped for useSearchParams) ───────────────────────────────────────
function JobsPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [loading, setLoading]         = useState(true);
  const [applying, setApplying]       = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<Record<string, string>>({});
  const [showCLFor, setShowCLFor]     = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('');
  const [sortBy, setSortBy]           = useState<'recent' | 'match'>('recent');

  // Highlight job coming from a notification
  const highlightId = searchParams.get('highlight');

  const isStudent = currentUser?.role === 'student';
  const canPost   = currentUser?.role === 'alumni' || currentUser?.role === 'teacher';
  const hasSkills = (currentUser?.skills?.length ?? 0) > 0;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile as Profile);

      const { data: allJobs } = await supabase
        .from('jobs')
        .select(`*, poster:profiles!posted_by(id, full_name, job_title, current_company, role)`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      const { data: myApps } = await supabase
        .from('job_applications')
        .select('job_id, id, status')
        .eq('applicant_id', user.id);

      const appMap: Record<string, { id: string; status: string }> = {};
      (myApps ?? []).forEach((a) => { appMap[a.job_id] = { id: a.id, status: a.status }; });

      setJobs((allJobs ?? []).map((j) => ({
        ...j, my_application: appMap[j.id] ?? null,
      })) as Job[]);

      setLoading(false);
    })();
  }, [router, supabase]);

  // Auto-switch to match sort when arriving from notification
  useEffect(() => {
    if (highlightId && isStudent && hasSkills) setSortBy('match');
  }, [highlightId, isStudent, hasSkills]);

  const applyToJob = async (jobId: string, applyEmail?: string | null) => {
    if (!currentUser) return;
    if (applyEmail) {
      window.open(`mailto:${applyEmail}?subject=Job Application via Parchi`, '_blank');
      return;
    }
    setApplying(jobId);
    const { error } = await supabase.from('job_applications').insert({
      job_id: jobId, applicant_id: currentUser.id,
      cover_letter: coverLetter[jobId]?.trim() || null,
    });
    setApplying(null);
    if (error) { alert(error.message); return; }
    setJobs((prev) => prev.map((j) =>
      j.id === jobId
        ? { ...j, my_application: { id: '', status: 'applied', job_id: jobId, applicant_id: currentUser.id, created_at: '' } }
        : j,
    ));
    setShowCLFor(null);
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

  const deadlineSoon = (deadline?: string | null) =>
    deadline ? new Date(deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 : false;

  // Filter + sort
  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase();
    let result = jobs.filter((j) => {
      const matchSearch = !q || j.title.toLowerCase().includes(q)
        || j.company.toLowerCase().includes(q)
        || j.tags?.some((t) => t.toLowerCase().includes(q));
      const matchType = !typeFilter || j.job_type === typeFilter;
      return matchSearch && matchType;
    });

    if (sortBy === 'match' && isStudent) {
      result = [...result].sort((a, b) => {
        const mA = getMatchInfo(currentUser?.skills, a.tags);
        const mB = getMatchInfo(currentUser?.skills, b.tags);
        return mB.count - mA.count;
      });
    }

    return result;
  }, [jobs, search, typeFilter, sortBy, isStudent, currentUser?.skills]);

  // Count strong + good matches for the banner
  const matchCount = useMemo(() => {
    if (!isStudent || !hasSkills) return 0;
    return jobs.filter((j) => getMatchInfo(currentUser?.skills, j.tags).level !== 'none').length;
  }, [jobs, isStudent, hasSkills, currentUser?.skills]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Jobs Board</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              Opportunities posted by MAJU alumni and faculty
            </p>
          </div>
          {canPost && (
            <Link href="/jobs/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              <Plus size={16} /> Post a Job
            </Link>
          )}
        </div>

        {/* ── Smart match banner (students with skills) ─────────────────── */}
        {isStudent && hasSkills && matchCount > 0 && (
          <div className="mb-5 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                  {matchCount} job{matchCount > 1 ? 's' : ''} match your skill{(currentUser?.skills?.length ?? 0) > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-0.5">
                  Based on: {currentUser?.skills?.slice(0, 4).join(', ')}{(currentUser?.skills?.length ?? 0) > 4 ? '…' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSortBy(sortBy === 'match' ? 'recent' : 'match')}
              className={cn(
                'shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors',
                sortBy === 'match'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
              )}
            >
              {sortBy === 'match' ? '✓ Best match first' : 'Sort by match'}
            </button>
          </div>
        )}

        {/* ── No-skills nudge ───────────────────────────────────────────── */}
        {isStudent && !hasSkills && jobs.length > 0 && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-2xl p-4 flex items-center gap-3">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Add skills to your profile</span> and we&apos;ll highlight jobs that match you automatically.{' '}
              <Link href={`/profile/${currentUser?.id}`} className="underline font-semibold">Add skills →</Link>
            </p>
          </div>
        )}

        {/* ── Filters + sort ────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills…"
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
          >
            <option value="">All types</option>
            {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {isStudent && hasSkills && (
            <button
              onClick={() => setSortBy((s) => s === 'match' ? 'recent' : 'match')}
              className={cn(
                'flex items-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors',
                sortBy === 'match'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              )}
            >
              <ArrowUpDown size={13} />
              {sortBy === 'match' ? 'Best match' : 'Sort'}
            </button>
          )}
        </div>

        {/* ── Job list ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={36} className="mx-auto text-slate-200 dark:text-zinc-700 mb-4" />
            <p className="text-slate-500 dark:text-zinc-400 font-medium">
              {search || typeFilter ? 'No jobs match your filters.' : 'No jobs posted yet.'}
            </p>
            {canPost && (
              <Link href="/jobs/new"
                className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                <Plus size={14} /> Post the first job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const applied    = !!job.my_application;
              const isOwner    = job.posted_by === currentUser?.id;
              const showingCL  = showCLFor === job.id;
              const matchInfo  = getMatchInfo(currentUser?.skills, job.tags);
              const isHighlighted = job.id === highlightId;

              return (
                <div
                  key={job.id}
                  id={`job-${job.id}`}
                  className={cn(
                    'bg-white dark:bg-zinc-900 rounded-2xl border p-5 transition-all',
                    isHighlighted
                      ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900'
                      : matchInfo.level === 'strong'
                        ? 'border-emerald-200 dark:border-emerald-900 hover:border-emerald-300 dark:hover:border-emerald-800'
                        : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700'
                  )}
                >
                  {/* Top row */}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                      matchInfo.level === 'strong'
                        ? 'bg-emerald-50 dark:bg-emerald-900/30'
                        : matchInfo.level === 'good'
                          ? 'bg-indigo-50 dark:bg-indigo-900/30'
                          : 'bg-slate-50 dark:bg-zinc-800'
                    )}>
                      <Building2 size={20} className={cn(
                        matchInfo.level === 'strong'
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : matchInfo.level === 'good'
                            ? 'text-indigo-500 dark:text-indigo-400'
                            : 'text-slate-400 dark:text-zinc-500'
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">{job.title}</h2>

                            {/* Match badge — students only */}
                            {isStudent && !isOwner && matchInfo.level === 'strong' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                                <Zap size={9} fill="currentColor" /> Strong match
                              </span>
                            )}
                            {isStudent && !isOwner && matchInfo.level === 'good' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full shrink-0">
                                {matchInfo.count} skill{matchInfo.count > 1 ? 's' : ''} match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{job.company}</p>
                        </div>

                        {/* Job type badge */}
                        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${JOB_TYPE_COLORS[job.job_type]}`}>
                          {JOB_TYPE_LABELS[job.job_type]}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400 dark:text-zinc-500">
                        {(job.location || job.is_remote) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {job.is_remote ? 'Remote' : job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatDate(job.created_at)}
                        </span>
                        {job.deadline && (
                          <span className={cn(
                            'flex items-center gap-1',
                            deadlineSoon(job.deadline) && 'text-amber-500 dark:text-amber-400 font-semibold'
                          )}>
                            Deadline: {formatDate(job.deadline)}
                            {deadlineSoon(job.deadline) && ' · closing soon'}
                          </span>
                        )}
                        {job.poster && (
                          <span className="flex items-center gap-1">
                            Posted by {job.poster.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 dark:text-zinc-300 mt-3 leading-relaxed line-clamp-3">
                    {job.description}
                  </p>

                  {/* Tags row */}
                  {(job.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags!.map((tag) => {
                        const isMatched = matchInfo.skills.map(s => s.toLowerCase()).includes(tag.toLowerCase());
                        return (
                          <span
                            key={tag}
                            className={cn(
                              'text-xs px-2.5 py-1 rounded-full font-medium transition-colors',
                              isMatched
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 font-semibold'
                                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-transparent'
                            )}
                          >
                            {isMatched && '✓ '}{tag}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Matched skills summary */}
                  {isStudent && !isOwner && matchInfo.skills.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 shrink-0">Your skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {matchInfo.skills.map((s) => (
                          <span key={s}
                            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cover letter textarea */}
                  {showingCL && isStudent && !applied && !isOwner && (
                    <div className="mt-4">
                      <textarea
                        value={coverLetter[job.id] ?? ''}
                        onChange={(e) => setCoverLetter((p) => ({ ...p, [job.id]: e.target.value }))}
                        placeholder="Optional cover letter — introduce yourself and why you're a good fit…"
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors">
                        <ExternalLink size={13} /> Apply Online
                      </a>
                    )}

                    {isStudent && !isOwner && (
                      applied ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-2 rounded-xl capitalize">
                          Applied · {job.my_application?.status}
                        </span>
                      ) : job.apply_email ? (
                        <button
                          onClick={() => applyToJob(job.id, job.apply_email)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors"
                        >
                          <Mail size={13} /> Apply via Email
                        </button>
                      ) : showingCL ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => applyToJob(job.id)}
                            disabled={applying === job.id}
                            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-xl transition-colors"
                          >
                            {applying === job.id && <Loader2 size={13} className="animate-spin" />}
                            Submit Application
                          </button>
                          <button onClick={() => setShowCLFor(null)}
                            className="text-sm text-slate-500 dark:text-zinc-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCLFor(job.id)}
                          className={cn(
                            'flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors',
                            matchInfo.level === 'strong'
                              ? 'bg-emerald-600 hover:bg-emerald-700'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                          )}
                        >
                          {matchInfo.level === 'strong' && <Zap size={13} />}
                          Apply{matchInfo.level === 'strong' ? ' — Strong match' : ''}
                        </button>
                      )
                    )}

                    {isOwner && (
                      <span className="ml-auto text-xs text-slate-400 dark:text-zinc-500">Your posting</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <JobsPageInner />
    </Suspense>
  );
}
