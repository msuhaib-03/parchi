'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Mentor, SessionFormat } from '@/types';
import { MENTOR_AREAS, SESSION_FORMAT_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

interface MentorForm {
  areas: string[];
  tagline: string;
  mentorship_bio: string;
  max_mentees: number;
  is_accepting: boolean;
  session_format: SessionFormat;
  meeting_link: string;
}

export default function BecomeMentorPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [me,         setMe]         = useState<Profile | null>(null);
  const [existing,   setExisting]   = useState<Mentor | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const [form, setForm] = useState<MentorForm>({
    areas: [], tagline: '', mentorship_bio: '', max_mentees: 3,
    is_accepting: true, session_format: 'video', meeting_link: '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: mentorRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mentors').select('*').eq('id', user.id).maybeSingle(),
      ]);

      const p = profile as Profile;
      if (!p || (p.role !== 'alumni' && p.role !== 'teacher')) {
        router.push('/mentorship'); return;
      }
      setMe(p);

      if (mentorRow) {
        const m = mentorRow as Mentor;
        setExisting(m);
        setForm({
          areas:          m.areas ?? [],
          tagline:        m.tagline ?? '',
          mentorship_bio: m.mentorship_bio ?? '',
          max_mentees:    m.max_mentees,
          is_accepting:   m.is_accepting,
          session_format: m.session_format,
          meeting_link:   m.meeting_link ?? '',
        });
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  const toggleArea = (area: string) =>
    setForm((f) => ({
      ...f,
      areas: f.areas.includes(area) ? f.areas.filter((a) => a !== area) : [...f.areas, area],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.areas.length === 0) { setError('Select at least one area you can mentor in.'); return; }
    if (!form.mentorship_bio.trim()) { setError('Please write a short bio — what can you offer mentees?'); return; }

    setSubmitting(true);
    const payload = {
      id:             me!.id,
      areas:          form.areas,
      tagline:        form.tagline.trim() || null,
      mentorship_bio: form.mentorship_bio.trim(),
      max_mentees:    form.max_mentees,
      is_accepting:   form.is_accepting,
      session_format: form.session_format,
      meeting_link:   form.meeting_link.trim() || null,
    };

    const { error: upsertErr } = await supabase.from('mentors').upsert(payload, { onConflict: 'id' });
    setSubmitting(false);
    if (upsertErr) { setError(upsertErr.message); return; }
    toast.success(existing ? 'Mentor profile updated!' : 'Mentor profile published! Students can now find you.');
    setSuccess(true);
    setTimeout(() => router.push('/mentorship'), 1200);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/mentorship"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to Mentorship
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-1">
          {existing ? 'Edit your mentor profile' : 'Become a mentor'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          {existing ? 'Update your availability and areas of expertise.'
                    : 'Share your experience with students who are where you once were.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Areas ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-4 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
              What can you mentor in? <span className="text-red-400">*</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-2">Pick all that genuinely apply — quality over quantity.</p>
            <div className="flex flex-wrap gap-2">
              {MENTOR_AREAS.map((area) => {
                const active = form.areas.includes(area);
                return (
                  <button key={area} type="button" onClick={() => toggleArea(area)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors', active
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900')}>
                    {active && <Check size={11} />}
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Profile ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Your mentor profile</h2>

            <div>
              <label className={labelCls}>
                Tagline <span className="text-xs text-slate-400 font-normal">(optional — one line about yourself)</span>
              </label>
              <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. 5 years at Systems Limited → Senior SWE → now at Arbisoft"
                maxLength={120} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>
                Mentorship bio <span className="text-red-400">*</span>
              </label>
              <textarea value={form.mentorship_bio} onChange={(e) => setForm((f) => ({ ...f, mentorship_bio: e.target.value }))}
                placeholder="What can you offer mentees? What have you navigated that they might face — job search, interviews, grad school, switching roles? Be specific."
                rows={5} className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* ── Availability ── */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">
            <h2 className="text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Availability</h2>

            <div>
              <label className={labelCls}>Max mentees at a time</label>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={10} value={form.max_mentees}
                  onChange={(e) => setForm((f) => ({ ...f, max_mentees: Number(e.target.value) }))}
                  className="flex-1 accent-indigo-600" />
                <span className="w-8 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400">{form.max_mentees}</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Be realistic — quality mentorship takes time.</p>
            </div>

            <div>
              <label className={labelCls}>Session format</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SESSION_FORMAT_LABELS) as SessionFormat[]).map((f) => (
                  <button key={f} type="button" onClick={() => setForm((ff) => ({ ...ff, session_format: f }))}
                    className={cn('py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-colors', form.session_format === f
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900')}>
                    {SESSION_FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {(form.session_format === 'video' || form.session_format === 'both') && (
              <div>
                <label className={labelCls}>
                  Meeting link <span className="text-xs text-slate-400 font-normal">(optional — shared only with accepted mentees)</span>
                </label>
                <input type="url" value={form.meeting_link} onChange={(e) => setForm((f) => ({ ...f, meeting_link: e.target.value }))}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className={inputCls} />
              </div>
            )}

            {/* Accepting toggle */}
            <button type="button" onClick={() => setForm((f) => ({ ...f, is_accepting: !f.is_accepting }))}
              className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                form.is_accepting
                  ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600')}>
              <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                form.is_accepting ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-zinc-600')}>
                {form.is_accepting && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="text-left">
                <p className="font-semibold">{form.is_accepting ? 'Accepting new mentees' : 'Not accepting right now'}</p>
                <p className="text-xs opacity-70 font-normal mt-0.5">
                  {form.is_accepting ? 'Your profile appears in Browse and students can request you.'
                                     : 'You\'re hidden from Browse. Existing mentorships continue.'}
                </p>
              </div>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Check size={16} /> Profile saved! Redirecting…
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting || success}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Saving…' : existing ? 'Save changes' : 'Publish mentor profile'}
            </button>
            <Link href="/mentorship"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
