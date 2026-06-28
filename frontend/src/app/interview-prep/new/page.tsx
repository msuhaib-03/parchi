'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, InterviewDifficulty, InterviewOutcome, InterviewExperienceFormData } from '@/types';
import { DIFFICULTY_LABELS, OUTCOME_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import {
  Loader2, ArrowLeft, Building2, Briefcase, Tag, Layers, Calendar, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

function NewExperienceInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const supabase     = createClient();

  const [me, setMe]               = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [tagInput, setTagInput]   = useState('');

  const [form, setForm] = useState<InterviewExperienceFormData>({
    company: '', role: '', interview_date: '',
    difficulty: 'medium', outcome: 'in_progress', num_rounds: null,
    process: '', questions: '', tips: '', tags: [], is_anonymous: false,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setMe(profile as Profile);

      if (editId) {
        const { data: exp } = await supabase.from('interview_experiences_feed').select('*').eq('id', editId).single();
        if (!exp) { router.push('/interview-prep'); return; }
        if (exp.author_id !== user.id) { router.push(`/interview-prep/${editId}`); return; }
        setForm({
          company: exp.company, role: exp.role, interview_date: exp.interview_date ?? '',
          difficulty: exp.difficulty, outcome: exp.outcome, num_rounds: exp.num_rounds ?? null,
          process: exp.process, questions: exp.questions, tips: exp.tips ?? '',
          tags: exp.tags ?? [], is_anonymous: exp.is_anonymous,
        });
      }
      setLoading(false);
    })();
  }, [router, supabase, editId]);

  const update = <K extends keyof InterviewExperienceFormData>(field: K, value: InterviewExperienceFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags?.includes(t)) return;
    update('tags', [...(form.tags ?? []), t]);
    setTagInput('');
  };
  const removeTag = (tag: string) => update('tags', form.tags?.filter((t) => t !== tag) ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.company.trim())  { setError('Company is required.'); return; }
    if (!form.role.trim())     { setError('Role / position is required.'); return; }
    if (!form.process.trim())  { setError('Please describe the interview process.'); return; }
    if (!form.questions.trim()){ setError('Please share at least some of the questions asked.'); return; }

    setSubmitting(true);
    const payload = {
      company:        form.company.trim(),
      role:           form.role.trim(),
      interview_date: form.interview_date?.trim() || null,
      difficulty:     form.difficulty,
      outcome:        form.outcome,
      num_rounds:     form.num_rounds || null,
      process:        form.process.trim(),
      questions:      form.questions.trim(),
      tips:           form.tips?.trim() || null,
      tags:           form.tags?.length ? form.tags : null,
      is_anonymous:   form.is_anonymous,
    };

    if (editId) {
      const { error: upErr } = await supabase.from('interview_experiences').update(payload).eq('id', editId);
      setSubmitting(false);
      if (upErr) { setError(upErr.message); return; }
      toast.success('Experience updated!');
      router.push(`/interview-prep/${editId}`);
    } else {
      const { data, error: insErr } = await supabase.from('interview_experiences')
        .insert({ ...payload, author_id: me!.id, department: me!.department })
        .select('id').single();
      setSubmitting(false);
      if (insErr || !data) { setError(insErr?.message ?? 'Could not save.'); return; }
      toast.success('Experience published! Helping juniors walk in prepared.');
      router.push(`/interview-prep/${data.id}`);
    }
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
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/interview-prep"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to Interview Prep
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-1">
          {editId ? 'Edit your experience' : 'Share an interview experience'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Help juniors walk in prepared. The more specific, the more useful.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Where & outcome ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">The interview</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Company <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={form.company} onChange={(e) => update('company', e.target.value)}
                    placeholder="e.g. Systems Limited" required className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Role / Position <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={form.role} onChange={(e) => update('role', e.target.value)}
                    placeholder="e.g. Software Engineer Intern" required className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>When <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={form.interview_date ?? ''} onChange={(e) => update('interview_date', e.target.value)}
                    placeholder="e.g. Jan 2025" className={`${inputCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Number of rounds <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
                <div className="relative">
                  <Layers size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input type="number" min={1} max={20} value={form.num_rounds ?? ''}
                    onChange={(e) => update('num_rounds', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="e.g. 3" className={`${inputCls} pl-9`} />
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className={labelCls}>Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DIFFICULTY_LABELS) as InterviewDifficulty[]).map((d) => (
                  <button key={d} type="button" onClick={() => update('difficulty', d)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                      form.difficulty === d
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                    }`}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className={labelCls}>Outcome</label>
              <select value={form.outcome} onChange={(e) => update('outcome', e.target.value as InterviewOutcome)}
                className={inputCls}>
                {(Object.keys(OUTCOME_LABELS) as InterviewOutcome[]).map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
              </select>
            </div>
          </div>

          {/* ── The details ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">What happened</h2>

            <div>
              <label className={labelCls}>The process / rounds <span className="text-red-400">*</span></label>
              <textarea value={form.process} onChange={(e) => update('process', e.target.value)}
                placeholder="Walk through each round — e.g. Round 1: online assessment (DSA), Round 2: technical interview, Round 3: HR…"
                rows={4} required className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>Questions asked <span className="text-red-400">*</span></label>
              <textarea value={form.questions} onChange={(e) => update('questions', e.target.value)}
                placeholder="List the actual questions you remember — technical, behavioral, puzzles…"
                rows={4} required className={`${inputCls} resize-none`} />
            </div>

            <div>
              <label className={labelCls}>Tips for juniors <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <textarea value={form.tips ?? ''} onChange={(e) => update('tips', e.target.value)}
                placeholder="What would you tell someone interviewing here next? What to study, what to expect…"
                rows={3} className={`${inputCls} resize-none`} />
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Topics / Tags <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="DSA, System Design, SQL, Behavioral… (Enter to add)"
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
                    <span key={tag} className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 font-bold leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Anonymous toggle */}
            <button type="button" onClick={() => update('is_anonymous', !form.is_anonymous)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                form.is_anonymous
                  ? 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
              )}>
              {form.is_anonymous ? <EyeOff size={16} /> : <Eye size={16} />}
              <div className="text-left">
                <p className="font-semibold">{form.is_anonymous ? 'Posting anonymously' : 'Post with your name'}</p>
                <p className="text-xs opacity-70 font-normal mt-0.5">
                  {form.is_anonymous
                    ? `Shown as "A ${me?.department ?? 'MAJU'} student" — your name is hidden`
                    : 'Your name and department will be visible'}
                </p>
              </div>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Saving…' : editId ? 'Save changes' : 'Publish experience'}
            </button>
            <Link href="/interview-prep"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewExperiencePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <NewExperienceInner />
    </Suspense>
  );
}
