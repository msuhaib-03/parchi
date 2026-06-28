'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Mentor, MentorshipRequest, MentorReview } from '@/types';
import { MENTOR_AREAS, SESSION_FORMAT_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import {
  Loader2, ArrowLeft, Star, Users, GraduationCap, Calendar,
  CheckCircle2, Edit2, ExternalLink, MessageCircle, Video, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function MentorProfilePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [me,          setMe]          = useState<Profile | null>(null);
  const [mentor,      setMentor]      = useState<Mentor | null>(null);
  const [reviews,     setReviews]     = useState<MentorReview[]>([]);
  const [myRequest,   setMyRequest]   = useState<MentorshipRequest | null>(null);
  const [loading,     setLoading]     = useState(true);

  // Request form
  const [showForm,    setShowForm]    = useState(false);
  const [area,        setArea]        = useState('');
  const [goal,        setGoal]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState('');
  const [requested,   setRequested]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: mentorRow }, { data: reviewRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mentors_with_stats').select('*').eq('id', id).maybeSingle(),
        supabase.from('mentor_reviews')
          .select('*, reviewer:profiles!reviewer_id(id, full_name, department, batch_year)')
          .eq('mentor_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (!mentorRow) { router.push('/mentorship'); return; }
      setMe(profile as Profile);
      setMentor(mentorRow as Mentor);
      setReviews((reviewRows as unknown as MentorReview[]) ?? []);

      // Check if student already has an active request with this mentor
      if (profile && (profile as Profile).role === 'student') {
        const { data: req } = await supabase.from('mentorship_requests')
          .select('*')
          .eq('student_id', user.id)
          .eq('mentor_id', id)
          .in('status', ['pending', 'accepted'])
          .maybeSingle();
        setMyRequest(req as MentorshipRequest | null);
      }

      setLoading(false);
    })();
  }, [id, router, supabase]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!area) { setFormError('Pick an area.'); return; }
    if (!goal.trim()) { setFormError('Describe what you want to achieve.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('mentorship_requests').insert({
      student_id: me!.id, mentor_id: id, area, goal: goal.trim(),
    });
    setSubmitting(false);
    if (error) { setFormError(error.message); return; }
    setRequested(true);
    setShowForm(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );
  if (!mentor) return null;

  const isOwn      = me?.id === id;
  const isStudent  = me?.role === 'student';
  const isFull     = mentor.active_mentee_count >= mentor.max_mentees;
  const canRequest = isStudent && !isOwn && mentor.is_accepting && !isFull && !myRequest && !requested;

  const fmtDate = (ts: string) => new Date(ts).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <Link href="/mentorship"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft size={15} /> Back to Mentorship
        </Link>

        {/* ── Mentor header ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xl shrink-0">
              {initials(mentor.full_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{mentor.full_name}</h1>
                  {mentor.job_title && (
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mt-0.5">
                      {mentor.job_title}{mentor.current_company ? ` at ${mentor.current_company}` : ''}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{mentor.department} · Batch {mentor.batch_year}</p>
                </div>
                {isOwn && (
                  <Link href="/mentorship/become-mentor"
                    className="flex items-center gap-1.5 text-xs font-semibold border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                    <Edit2 size={12} /> Edit profile
                  </Link>
                )}
              </div>

              {mentor.tagline && (
                <p className="text-sm text-slate-600 dark:text-zinc-400 italic mt-2">"{mentor.tagline}"</p>
              )}

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mt-3">
                {mentor.review_count > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={13} className={s <= Math.round(mentor.avg_rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-zinc-700'} />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-zinc-300">{mentor.avg_rating}</span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">({mentor.review_count} {mentor.review_count === 1 ? 'review' : 'reviews'})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1"><Star size={12} /> No reviews yet</span>
                )}
                <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Users size={13} /> {mentor.active_mentee_count}/{mentor.max_mentees} mentees
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  {mentor.session_format === 'in_person' ? <MapPin size={13} /> : <Video size={13} />}
                  {SESSION_FORMAT_LABELS[mentor.session_format]}
                </span>
              </div>

              {/* Status badge */}
              <div className="mt-3">
                <span className={cn('text-xs font-semibold px-3 py-1 rounded-full border',
                  isFull ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700'
                         : mentor.is_accepting
                           ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                           : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700')}>
                  {isFull ? 'Full' : mentor.is_accepting ? '✓ Accepting mentees' : 'Not accepting right now'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isOwn && (
            <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
              {canRequest && !showForm && (
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  <GraduationCap size={15} /> Request mentorship
                </button>
              )}
              {myRequest && (
                <div className={cn('text-xs font-semibold px-4 py-2.5 rounded-xl border flex items-center gap-2',
                  myRequest.status === 'accepted'
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400')}>
                  {myRequest.status === 'accepted' ? <CheckCircle2 size={14} /> : <Calendar size={14} />}
                  {myRequest.status === 'accepted' ? 'Mentorship active' : 'Request pending'}
                </div>
              )}
              {requested && (
                <div className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={14} /> Request sent!
                </div>
              )}
              {!isStudent && (
                <Link href={`/messages?with=${id}`}
                  className="flex items-center gap-2 text-sm font-semibold border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 px-5 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                  <MessageCircle size={15} /> Message
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── Request Form ── */}
        {showForm && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-6 transition-colors">
            <h2 className="font-bold text-slate-900 dark:text-zinc-100 mb-4">Request mentorship from {mentor.full_name.split(' ')[0]}</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className={labelCls}>Area you need help with <span className="text-red-400">*</span></label>
                <select value={area} onChange={(e) => setArea(e.target.value)} required className={inputCls}>
                  <option value="">Select an area…</option>
                  {(mentor.areas.length > 0 ? mentor.areas : MENTOR_AREAS).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Your goal <span className="text-red-400">*</span></label>
                <textarea value={goal} onChange={(e) => setGoal(e.target.value)}
                  placeholder="What do you want to achieve through this mentorship? Be specific — the more context you share, the better {mentor.full_name.split(' ')[0]} can help."
                  rows={4} required className={`${inputCls} resize-none`} />
              </div>
              {formError && <p className="text-sm text-red-500 dark:text-red-400">{formError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Sending…' : 'Send request'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── About ── */}
        {mentor.mentorship_bio && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide mb-3">About this mentor</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{mentor.mentorship_bio}</p>
          </div>
        )}

        {/* ── Areas ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide mb-3">Can mentor in</h2>
          <div className="flex flex-wrap gap-2">
            {mentor.areas.map((a) => (
              <span key={a} className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800">
                {a}
              </span>
            ))}
          </div>
        </div>

        {/* ── Meeting link (only if accepted mentee) ── */}
        {myRequest?.status === 'accepted' && mentor.meeting_link && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Meeting link</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">{SESSION_FORMAT_LABELS[mentor.session_format]}</p>
            </div>
            <a href={mentor.meeting_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0">
              <ExternalLink size={14} /> Open
            </a>
          </div>
        )}

        {/* ── Reviews ── */}
        {reviews.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide mb-4">
              Reviews <span className="text-slate-400 font-normal normal-case">({reviews.length})</span>
            </h2>
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="border-b border-slate-50 dark:border-zinc-800 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{rev.reviewer?.full_name ?? 'A MAJUite'}</p>
                      {rev.reviewer && (
                        <p className="text-xs text-slate-400 dark:text-zinc-500">
                          {rev.reviewer.department} · Batch {rev.reviewer.batch_year}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} size={13} className={s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-zinc-700'} />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{rev.comment}</p>
                  )}
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5">
                    {fmtDate(rev.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA for non-student ── */}
        {!isStudent && !isOwn && (
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
            <h2 className="font-bold text-base mb-1">Know a student who'd benefit?</h2>
            <p className="text-indigo-200 text-sm mb-4">Share {mentor.full_name.split(' ')[0]}'s profile with juniors looking for guidance.</p>
            <Link href={`/messages?with=${id}`}
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors">
              <MessageCircle size={14} /> Send a message
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
