'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Job, Profile } from '@/types';
import { JOB_TYPE_LABELS, JOB_TYPE_COLORS } from '@/types';
import {
  Loader2, Briefcase, MapPin, Clock,
  Plus, ExternalLink, Mail, Building2, Search,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';

export const dynamic = 'force-dynamic';

export default function JobsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser]   = useState<Profile | null>(null);
  const [jobs, setJobs]                 = useState<Job[]>([]);
  const [loading, setLoading]           = useState(true);
  const [applying, setApplying]         = useState<string | null>(null);
  const [coverLetter, setCoverLetter]   = useState<Record<string, string>>({});
  const [showCLFor, setShowCLFor]       = useState<string | null>(null);
  const [search, setSearch]             = useState('');
  const [typeFilter, setTypeFilter]     = useState<string>('');

  const canPost = currentUser?.role === 'alumni' || currentUser?.role === 'teacher';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile as Profile);

      const { data: jobData } = await supabase
        .from('jobs')
        .select(`
          *,
          poster:profiles!posted_by(id, full_name, job_title, current_company, role),
          my_application:job_applications!inner(id, status)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Also fetch without inner join to get jobs user hasn't applied to
      const { data: allJobs } = await supabase
        .from('jobs')
        .select(`*, poster:profiles!posted_by(id, full_name, job_title, current_company, role)`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Fetch user's applications
      const { data: myApps } = await supabase
        .from('job_applications')
        .select('job_id, id, status')
        .eq('applicant_id', user.id);

      const appMap: Record<string, { id: string; status: string }> = {};
      (myApps ?? []).forEach((a) => { appMap[a.job_id] = { id: a.id, status: a.status }; });

      const merged = (allJobs ?? []).map((j) => ({
        ...j,
        my_application: appMap[j.id] ?? null,
      }));

      setJobs(merged as Job[]);
      setLoading(false);
    })();
  }, [router, supabase]);

  const applyToJob = async (jobId: string, applyEmail?: string | null) => {
    if (!currentUser) return;
    if (applyEmail) {
      window.open(`mailto:${applyEmail}?subject=Job Application via Parchi`, '_blank');
      return;
    }
    setApplying(jobId);
    const { error } = await supabase.from('job_applications').insert({
      job_id: jobId,
      applicant_id: currentUser.id,
      cover_letter: coverLetter[jobId]?.trim() || null,
    });
    setApplying(null);
    if (error) { alert(error.message); return; }
    setJobs((prev) => prev.map((j) =>
      j.id === jobId ? { ...j, my_application: { id: '', status: 'applied', job_id: jobId, applicant_id: currentUser.id, created_at: '' } } : j
    ));
    setShowCLFor(null);
  };

  const filteredJobs = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.tags?.some((t) => t.toLowerCase().includes(q));
    const matchType   = !typeFilter || j.job_type === typeFilter;
    return matchSearch && matchType;
  });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const deadlineSoon = (deadline?: string | null) => {
    if (!deadline) return false;
    return new Date(deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* ─── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Jobs Board</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">Opportunities posted by MAJU alumni and faculty</p>
          </div>
          {canPost && (
            <Link
              href="/jobs/new"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Plus size={16} /> Post a Job
            </Link>
          )}
        </div>

        {/* ─── Filters ────────────────────────────────────────────────────────── */}
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
        </div>

        {/* ─── Job list ───────────────────────────────────────────────────────── */}
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
              <Link href="/jobs/new" className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                <Plus size={14} /> Post the first job
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const applied = !!job.my_application;
              const isOwner = job.posted_by === currentUser?.id;
              const isStudent = currentUser?.role === 'student';
              const showingCL = showCLFor === job.id;

              return (
                <div key={job.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors hover:border-slate-200 dark:hover:border-zinc-700">

                  {/* Top row */}
                  <div className="flex items-start gap-4">
                    {/* Company logo placeholder */}
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <Building2 size={20} className="text-indigo-500 dark:text-indigo-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">{job.title}</h2>
                          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{job.company}</p>
                        </div>

                        {/* Type badge */}
                        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${JOB_TYPE_COLORS[job.job_type]}`}>
                          {JOB_TYPE_LABELS[job.job_type]}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400 dark:text-zinc-500">
                        {(job.location || job.is_remote) && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} />
                            {job.is_remote ? 'Remote' : job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(job.created_at)}
                        </span>
                        {job.deadline && (
                          <span className={`flex items-center gap-1 ${deadlineSoon(job.deadline) ? 'text-amber-500 dark:text-amber-400 font-semibold' : ''}`}>
                            Deadline: {formatDate(job.deadline)}
                            {deadlineSoon(job.deadline) && ' (soon!)'}
                          </span>
                        )}
                        {job.poster && (
                          <span className="flex items-center gap-1">
                            <Briefcase size={11} />
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

                  {/* Tags */}
                  {(job.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.tags!.map((tag) => (
                        <span key={tag}
                          className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Cover letter box */}
                  {showingCL && isStudent && !applied && !isOwner && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={coverLetter[job.id] ?? ''}
                        onChange={(e) => setCoverLetter((prev) => ({ ...prev, [job.id]: e.target.value }))}
                        placeholder="Add a cover letter (optional) — introduce yourself and why you're a good fit."
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {/* External apply link */}
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors">
                        <ExternalLink size={13} /> Apply Online
                      </a>
                    )}

                    {/* Apply via Parchi / email — students only, not own post */}
                    {isStudent && !isOwner && (
                      applied ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-3 py-2 rounded-xl">
                          Applied · {job.my_application?.status}
                        </span>
                      ) : job.apply_email ? (
                        <button
                          onClick={() => applyToJob(job.id, job.apply_email)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors"
                        >
                          <Mail size={13} /> Apply via Email
                        </button>
                      ) : (
                        showingCL ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => applyToJob(job.id)}
                              disabled={applying === job.id}
                              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-4 py-2 rounded-xl transition-colors"
                            >
                              {applying === job.id ? <Loader2 size={13} className="animate-spin" /> : null}
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
                            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors"
                          >
                            Apply
                          </button>
                        )
                      )
                    )}

                    {/* Owner view application count */}
                    {isOwner && (
                      <span className="text-xs text-slate-400 dark:text-zinc-500 ml-auto">
                        Your posting
                      </span>
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
