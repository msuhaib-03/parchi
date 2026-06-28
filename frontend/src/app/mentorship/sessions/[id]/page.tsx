'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, MentorSession, MentorReview } from '@/types';
import { AppNav } from '@/components/AppNav';
import {
  Loader2, ArrowLeft, Calendar, Clock, CheckCircle2,
  Star, Users, ExternalLink, MessageCircle, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

const SESSION_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Upcoming',  cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700' },
};

export default function SessionDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [me,       setMe]       = useState<Profile | null>(null);
  const [session,  setSession]  = useState<MentorSession | null>(null);
  const [review,   setReview]   = useState<MentorReview | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Complete form (mentor)
  const [notes,     setNotes]     = useState('');
  const [completing, setCompleting] = useState(false);

  // Review form (student)
  const [rating,    setRating]    = useState(5);
  const [comment,   setComment]   = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: ses }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mentorship_sessions')
          .select(`*, mentor:profiles!mentor_id(id, full_name, profile_picture_url, job_title, current_company),
                       student:profiles!student_id(id, full_name, profile_picture_url, department, batch_year)`)
          .eq('id', id).single(),
      ]);

      if (!ses) { router.push('/mentorship?tab=sessions'); return; }

      const { data: rev } = await supabase.from('mentor_reviews').select('*').eq('session_id', id).maybeSingle();
      setMe(profile as Profile);
      setSession(ses as unknown as MentorSession);
      setReview(rev as MentorReview | null);
      if (ses.session_notes) setNotes(ses.session_notes);
      setLoading(false);
    })();
  }, [id, router, supabase]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleting(true);
    await supabase.from('mentorship_sessions')
      .update({ status: 'completed', session_notes: notes.trim() || null })
      .eq('id', id);
    toast.success('Session marked complete!');
    setSession((s) => s ? { ...s, status: 'completed', session_notes: notes.trim() || null } : s);
    setCompleting(false);
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewing(true);
    const { data } = await supabase.from('mentor_reviews').insert({
      session_id: id, reviewer_id: me!.id,
      mentor_id: session!.mentor_id, rating, comment: comment.trim() || null,
    }).select('*').single();
    setReviewing(false);
    if (data) {
      toast.success('Review submitted — thanks!');
      setReview(data as MentorReview);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this session?')) return;
    await supabase.from('mentorship_sessions').update({ status: 'cancelled' }).eq('id', id);
    toast.success('Session cancelled.');
    setSession((s) => s ? { ...s, status: 'cancelled' } : s);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );
  if (!session) return null;

  const isMentor   = me?.id === session.mentor_id;
  const other      = isMentor ? session.student : session.mentor;
  const isPast     = new Date(session.scheduled_at) < new Date();
  const canComplete = isMentor && session.status === 'scheduled' && isPast;
  const canReview   = !isMentor && session.status === 'completed' && !review;
  const canCancel   = session.status === 'scheduled' && !isPast;
  const statusMeta  = SESSION_STATUS[session.status] ?? SESSION_STATUS.scheduled;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <Link href="/mentorship?tab=sessions"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft size={15} /> Back to sessions
        </Link>

        {/* ── Header ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg shrink-0">
              {initials(other?.full_name ?? '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 dark:text-zinc-100">
                  Session {isMentor ? 'with' : 'with mentor'}
                </h1>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', statusMeta.cls)}>
                  {statusMeta.label}
                </span>
              </div>
              <Link href={`/profile/${isMentor ? session.student_id : session.mentor_id}`}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                {other?.full_name}
              </Link>
              {!isMentor && session.mentor && (session.mentor as unknown as { job_title?: string; current_company?: string }).job_title && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {(session.mentor as unknown as { job_title?: string; current_company?: string }).job_title}
                  {(session.mentor as unknown as { current_company?: string }).current_company ? ` @ ${(session.mentor as unknown as { current_company?: string }).current_company}` : ''}
                </p>
              )}
              {isMentor && session.student && (session.student as unknown as { department?: string; batch_year?: number }).department && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {(session.student as unknown as { department?: string }).department} · Batch {(session.student as unknown as { batch_year?: number }).batch_year}
                </p>
              )}
            </div>
          </div>

          {/* Time / duration */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
              <Calendar size={15} className="text-indigo-500" />
              <span>{fmtDateTime(session.scheduled_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
              <Clock size={15} className="text-indigo-500" />
              <span>{session.duration_mins} minutes</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <Link href={`/messages?with=${isMentor ? session.student_id : session.mentor_id}`}
              className="flex items-center gap-1.5 text-sm font-semibold border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              <MessageCircle size={14} /> Message {other?.full_name?.split(' ')[0]}
            </Link>
            {canCancel && (
              <button onClick={handleCancel}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <X size={14} /> Cancel session
              </button>
            )}
          </div>
        </div>

        {/* ── Agenda ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide mb-3">Agenda</h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{session.agenda}</p>
        </div>

        {/* ── Session notes (visible after completion) ── */}
        {session.session_notes && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900 p-6">
            <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide mb-3">Session notes</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed whitespace-pre-wrap">{session.session_notes}</p>
          </div>
        )}

        {/* ── Complete form (mentor only, after session time) ── */}
        {canComplete && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
            <h2 className="font-bold text-slate-900 dark:text-zinc-100 mb-1">Mark this session complete</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Add notes to help {other?.full_name?.split(' ')[0]} remember what was covered.</p>
            <form onSubmit={handleComplete} className="space-y-4">
              <div>
                <label className={labelCls}>Session notes <span className="text-xs text-slate-400 font-normal">(optional)</span></label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5}
                  placeholder="Key takeaways, resources, action items, what to work on next…"
                  className={`${inputCls} resize-none`} />
              </div>
              <button type="submit" disabled={completing}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                {completing && <Loader2 size={16} className="animate-spin" />}
                {completing ? 'Saving…' : 'Mark complete'}
              </button>
            </form>
          </div>
        )}

        {/* ── Review form (student only, after completion) ── */}
        {canReview && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
            <h2 className="font-bold text-slate-900 dark:text-zinc-100 mb-1">Rate your session</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-4">Your review helps other students find great mentors.</p>
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className={labelCls}>Rating</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                      <Star size={30} className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-600'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Comment <span className="text-xs text-slate-400 font-normal">(optional)</span></label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
                  placeholder="What was most helpful?" className={`${inputCls} resize-none`} />
              </div>
              <button type="submit" disabled={reviewing}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                {reviewing && <Loader2 size={16} className="animate-spin" />}
                {reviewing ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          </div>
        )}

        {/* ── Existing review ── */}
        {review && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900 p-6">
            <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-3">Your review</h2>
            <div className="flex items-center gap-2 mb-2">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={18} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-600'} />
              ))}
            </div>
            {review.comment && <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">{review.comment}</p>}
          </div>
        )}

        {/* ── View mentor profile CTA ── */}
        <div className="flex gap-3">
          <Link href={`/mentorship/${session.mentor_id}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
            <Users size={14} /> {isMentor ? 'View mentee\'s profile' : 'View mentor\'s profile'}
          </Link>
        </div>
      </main>
    </div>
  );
}
