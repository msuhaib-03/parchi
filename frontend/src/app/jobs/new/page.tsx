'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, JobFormData, JobType } from '@/types';
import { JOB_TYPE_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import {
  Loader2, ArrowLeft, Building2, Briefcase,
  MapPin, Link2, Mail, Tag, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

export default function PostJobPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [tagInput, setTagInput]       = useState('');

  const [form, setForm] = useState<JobFormData>({
    title: '',
    company: '',
    description: '',
    requirements: '',
    job_type: 'full-time' as JobType,
    location: '',
    is_remote: false,
    apply_url: '',
    apply_email: '',
    tags: [],
    deadline: '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();

      if (!profile || (profile.role !== 'alumni' && profile.role !== 'teacher')) {
        router.push('/jobs');
        return;
      }

      setCurrentUser(profile as Profile);
      // Pre-fill company from alumni profile
      if (profile.current_company) {
        setForm((f) => ({ ...f, company: profile.current_company ?? '' }));
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const update = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags?.includes(t)) return;
    update('tags', [...(form.tags ?? []), t]);
    setTagInput('');
  };

  const removeTag = (tag: string) =>
    update('tags', form.tags?.filter((t) => t !== tag) ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) { setError('Job title is required.'); return; }
    if (!form.company.trim()) { setError('Company name is required.'); return; }
    if (!form.description.trim()) { setError('Job description is required.'); return; }
    if (!form.apply_url?.trim() && !form.apply_email?.trim()) {
      setError('Provide at least one way to apply — a URL or email address.');
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from('jobs').insert({
      posted_by:    currentUser!.id,
      title:        form.title.trim(),
      company:      form.company.trim(),
      description:  form.description.trim(),
      requirements: form.requirements?.trim() || null,
      job_type:     form.job_type,
      location:     form.location?.trim() || null,
      is_remote:    form.is_remote,
      apply_url:    form.apply_url?.trim() || null,
      apply_email:  form.apply_email?.trim() || null,
      tags:         form.tags?.length ? form.tags : null,
      deadline:     form.deadline || null,
      is_active:    true,
    });

    setSubmitting(false);
    if (insertError) { setError(insertError.message); return; }
    toast.success('Job posted!');
    router.push('/jobs');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <Link href="/jobs"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to Jobs
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-1">Post a Job</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Help your junior MAJUites find opportunities.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Core details ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider text-xs">Job Details</h2>

            {/* Title */}
            <div>
              <label className={labelCls}>Job Title <span className="text-red-400">*</span></label>
              <div className="relative">
                <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.title} onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. Frontend Engineer" required className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className={labelCls}>Company / Organization <span className="text-red-400">*</span></label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.company} onChange={(e) => update('company', e.target.value)}
                  placeholder="e.g. Systems Limited" required className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* Job Type */}
            <div>
              <label className={labelCls}>Job Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update('job_type', type)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                      form.job_type === type
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    {JOB_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Location + Remote */}
            <div>
              <label className={labelCls}>Location</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.location ?? ''} onChange={(e) => update('location', e.target.value)}
                  placeholder="e.g. Karachi, Pakistan" className={`${inputCls} pl-9`} />
              </div>
              <label className="flex items-center gap-2.5 mt-2 cursor-pointer">
                <div className="relative" onClick={() => update('is_remote', !form.is_remote)}>
                  <div className={`w-9 h-5 rounded-full transition-colors ${form.is_remote ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_remote ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm text-slate-600 dark:text-zinc-300">Remote / hybrid ok</span>
              </label>
            </div>

            {/* Deadline */}
            <div>
              <label className={labelCls}>Application Deadline <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input type="date" value={form.deadline ?? ''} onChange={(e) => update('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`${inputCls} pl-9`} />
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Description</h2>

            <div>
              <label className={labelCls}>Job Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                placeholder="What does the role involve? Responsibilities, team, expectations…"
                rows={5} required
                className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>Requirements <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <textarea value={form.requirements ?? ''} onChange={(e) => update('requirements', e.target.value)}
                placeholder="Preferred skills, experience level, qualifications…"
                rows={3}
                className={`${inputCls} resize-none`} />
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Skills / Tags <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="React, Python, SQL… (Enter to add)"
                    className={`${inputCls} pl-9`} />
                </div>
                <button type="button" onClick={addTag}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                  Add
                </button>
              </div>
              {(form.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags!.map((tag) => (
                    <span key={tag}
                      className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 font-bold leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Apply method ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">How to Apply</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-3">Provide at least one of the following.</p>

            <div>
              <label className={labelCls}>Application URL</label>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.apply_url ?? ''} onChange={(e) => update('apply_url', e.target.value)}
                  type="url" placeholder="https://company.com/careers/job-id"
                  className={`${inputCls} pl-9`} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Apply via Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.apply_email ?? ''} onChange={(e) => update('apply_email', e.target.value)}
                  type="email" placeholder="hr@company.com"
                  className={`${inputCls} pl-9`} />
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Students will be able to apply through Parchi directly, or via email.</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Posting…' : 'Post Job'}
            </button>
            <Link href="/jobs"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
