'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Mentor, MentorshipRequest, MentorSession, MentorReview } from '@/types';
import { MENTOR_AREAS, SESSION_DURATION_OPTIONS, SESSION_FORMAT_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import {
  Loader2, Search, Star, Users, GraduationCap, Calendar, CheckCircle2,
  Clock, X, CalendarClock, MessageCircle, Edit2, BookOpen, AlertCircle,
  Sparkles, ChevronRight, XCircle, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'browse' | 'requests' | 'sessions';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  accepted:  { label: 'Active',    cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  declined:  { label: 'Declined',  cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  ended:     { label: 'Ended',     cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700' },
  cancelled: { label: 'Withdrawn', cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700' },
};

const SES_STATUS: Record<string, { label: string; cls: string }> = {
  scheduled:  { label: 'Upcoming',   cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  completed:  { label: 'Completed',  cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-200 dark:border-zinc-700' },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Schedule Modal ─────────────────────────────────────────────────────────────
function ScheduleModal({
  acceptedRequests, initialRequestId, me, onClose, onScheduled,
}: {
  acceptedRequests: MentorshipRequest[];
  initialRequestId?: string;
  me: Profile;
  onClose: () => void;
  onScheduled: (session: MentorSession) => void;
}) {
  const supabase = createClient();
  const [reqId,     setReqId]     = useState(initialRequestId ?? acceptedRequests[0]?.id ?? '');
  const [dateTime,  setDateTime]  = useState('');
  const [duration,  setDuration]  = useState(30);
  const [agenda,    setAgenda]    = useState('');
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  const req = acceptedRequests.find((r) => r.id === reqId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!reqId)     { setErr('Select a mentorship.'); return; }
    if (!dateTime)  { setErr('Pick a date and time.'); return; }
    if (new Date(dateTime) <= new Date()) { setErr('Please pick a future date/time.'); return; }
    if (!agenda.trim()) { setErr('Describe what you want to discuss.'); return; }
    if (!req) return;
    setSaving(true);
    const { data, error } = await supabase.from('mentorship_sessions').insert({
      request_id:    reqId,
      mentor_id:     req.mentor_id,
      student_id:    req.student_id,
      scheduled_at:  new Date(dateTime).toISOString(),
      duration_mins: duration,
      agenda:        agenda.trim(),
    }).select(`*, mentor:profiles!mentor_id(id, full_name, profile_picture_url),
                   student:profiles!student_id(id, full_name, profile_picture_url)`).single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onScheduled(data as unknown as MentorSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100">Schedule a session</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {acceptedRequests.length > 1 && (
            <div>
              <label className={labelCls}>With</label>
              <select value={reqId} onChange={(e) => setReqId(e.target.value)} className={inputCls}>
                {acceptedRequests.map((r) => (
                  <option key={r.id} value={r.id}>{r.mentor?.full_name ?? 'Mentor'} — {r.area}</option>
                ))}
              </select>
            </div>
          )}
          {acceptedRequests.length === 1 && req && (
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Session with <span className="font-semibold text-slate-700 dark:text-zinc-300">{req.mentor?.full_name}</span> · {req.area}
            </p>
          )}
          <div>
            <label className={labelCls}>Date & Time <span className="text-red-400">*</span></label>
            <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Duration</label>
            <div className="flex gap-2 flex-wrap">
              {SESSION_DURATION_OPTIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className={cn('px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors', duration === d
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900')}>
                  {d}m
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Agenda <span className="text-red-400">*</span></label>
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3}
              placeholder="What do you want to cover? Questions, topics, goals for this session…"
              className={`${inputCls} resize-none`} />
          </div>
          {err && <p className="text-sm text-red-500 dark:text-red-400">{err}</p>}
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Booking…' : 'Book session'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Complete Modal (mentor marks session done) ─────────────────────────────────
function CompleteModal({ session, onClose, onCompleted }: {
  session: MentorSession;
  onClose: () => void;
  onCompleted: (notes: string) => void;
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('mentorship_sessions').update({ status: 'completed', session_notes: notes.trim() || null }).eq('id', session.id);
    setSaving(false);
    onCompleted(notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100">Mark session complete</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-zinc-400">Great session! Add notes to help your mentee remember what was covered.</p>
          <div>
            <label className={labelCls}>Session notes <span className="text-xs text-slate-400 font-normal">(optional — shared with mentee)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Key takeaways, resources shared, action items, what to work on before next session…"
              className={`${inputCls} resize-none`} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving…' : 'Mark complete'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Review Modal (student rates mentor after session) ─────────────────────────
function ReviewModal({ session, onClose, onReviewed }: {
  session: MentorSession;
  onClose: () => void;
  onReviewed: (review: MentorReview) => void;
}) {
  const supabase = createClient();
  const [rating,  setRating]  = useState(5);
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: me } = await supabase.auth.getUser();
    const { data } = await supabase.from('mentor_reviews').insert({
      session_id: session.id, reviewer_id: me.user!.id,
      mentor_id: session.mentor_id, rating, comment: comment.trim() || null,
    }).select('*').single();
    setSaving(false);
    if (data) { onReviewed(data as MentorReview); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100">Rate your session</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            How was your session with <span className="font-semibold text-slate-700 dark:text-zinc-300">{session.mentor?.full_name}</span>?
          </p>
          <div>
            <label className={labelCls}>Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                  <Star size={28} className={s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-600'} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Comment <span className="text-xs text-slate-400 font-normal">(optional)</span></label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              placeholder="What did you find most helpful? Anything to share with others?" className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Submitting…' : 'Submit review'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Decline Modal (mentor declines with optional note) ─────────────────────────
function DeclineModal({ request, onClose, onDeclined }: {
  request: MentorshipRequest;
  onClose: () => void;
  onDeclined: () => void;
}) {
  const supabase = createClient();
  const [note,   setNote]   = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('mentorship_requests').update({ status: 'declined', mentor_note: note.trim() || null }).eq('id', request.id);
    setSaving(false);
    onDeclined();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-zinc-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
          <h2 className="font-bold text-slate-900 dark:text-zinc-100">Decline request</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handle} className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Let <span className="font-semibold text-slate-700 dark:text-zinc-300">{request.student?.full_name}</span> know you can't take them on right now.
          </p>
          <div>
            <label className={labelCls}>Reason <span className="text-xs text-slate-400 font-normal">(optional — shown to student)</span></label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="e.g. At capacity right now, try again in a few months…" className={`${inputCls} resize-none`} />
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-3 rounded-xl transition-colors">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Declining…' : 'Decline request'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function MentorshipInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const tab          = (searchParams.get('tab') as TabId) ?? 'browse';
  const supabase     = createClient();

  const [me,              setMe]              = useState<Profile | null>(null);
  const [myMentorProfile, setMyMentorProfile] = useState<Mentor | null>(null);
  const [loading,         setLoading]         = useState(true);

  // Browse
  const [mentors,       setMentors]       = useState<Mentor[]>([]);
  const [browseLoaded,  setBrowseLoaded]  = useState(false);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [search,        setSearch]        = useState('');
  const [areaFilter,    setAreaFilter]    = useState('');
  const [onlyAccepting, setOnlyAccepting] = useState(true);

  // Requests
  const [requests,        setRequests]        = useState<MentorshipRequest[]>([]);
  const [requestsLoaded,  setRequestsLoaded]  = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Sessions
  const [sessions,        setSessions]        = useState<MentorSession[]>([]);
  const [sessionsLoaded,  setSessionsLoaded]  = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Modals
  const [scheduleFor,  setScheduleFor]  = useState<{ requestId?: string } | null>(null);
  const [completeFor,  setCompleteFor]  = useState<MentorSession | null>(null);
  const [reviewFor,    setReviewFor]    = useState<MentorSession | null>(null);
  const [declineFor,   setDeclineFor]   = useState<MentorshipRequest | null>(null);

  // Initial load: get user + check if they're a mentor
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [{ data: profile }, { data: mentorRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('mentors_with_stats').select('*').eq('id', user.id).maybeSingle(),
      ]);
      setMe(profile as Profile);
      setMyMentorProfile(mentorRow as Mentor | null);
      setLoading(false);
    })();
  }, [router, supabase]);

  // Load browse mentors
  const loadBrowse = async () => {
    if (browseLoaded) return;
    setLoadingBrowse(true);
    const { data } = await supabase.from('mentors_with_stats').select('*').order('avg_rating', { ascending: false });
    setMentors((data as Mentor[]) ?? []);
    setBrowseLoaded(true);
    setLoadingBrowse(false);
  };

  // Load requests
  const loadRequests = async (userId: string, isMentor: boolean) => {
    if (requestsLoaded) return;
    setLoadingRequests(true);
    if (isMentor) {
      const { data } = await supabase.from('mentorship_requests')
        .select('*, student:profiles!student_id(id, full_name, department, batch_year, profile_picture_url, skills)')
        .eq('mentor_id', userId).order('created_at', { ascending: false });
      setRequests((data as unknown as MentorshipRequest[]) ?? []);
    } else {
      const { data } = await supabase.from('mentorship_requests')
        .select('*, mentor:profiles!mentor_id(id, full_name, job_title, current_company, profile_picture_url)')
        .eq('student_id', userId).order('created_at', { ascending: false });
      setRequests((data as unknown as MentorshipRequest[]) ?? []);
    }
    setRequestsLoaded(true);
    setLoadingRequests(false);
  };

  // Load sessions (RLS returns only sessions where user is student or mentor)
  const loadSessions = async () => {
    if (sessionsLoaded) return;
    setLoadingSessions(true);
    const { data } = await supabase.from('mentorship_sessions')
      .select(`*, mentor:profiles!mentor_id(id, full_name, profile_picture_url),
                   student:profiles!student_id(id, full_name, profile_picture_url)`)
      .order('scheduled_at', { ascending: true });
    // Attach any existing reviews
    if (data && data.length > 0) {
      const ids = data.map((s: { id: string }) => s.id);
      const { data: reviews } = await supabase.from('mentor_reviews').select('*').in('session_id', ids);
      const reviewMap = new Map((reviews ?? []).map((r: MentorReview) => [r.session_id, r]));
      setSessions(data.map((s: MentorSession) => ({ ...s, my_review: reviewMap.get(s.id) ?? null })) as MentorSession[]);
    } else {
      setSessions([]);
    }
    setSessionsLoaded(true);
    setLoadingSessions(false);
  };

  // Re-load when tab changes (lazy)
  useEffect(() => {
    if (!me) return;
    const isMentor = !!myMentorProfile;
    if (tab === 'browse') loadBrowse();
    else if (tab === 'requests') loadRequests(me.id, isMentor);
    else if (tab === 'sessions') loadSessions();
  }, [tab, me, myMentorProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (t: TabId) => router.replace(`/mentorship?tab=${t}`, { scroll: false });

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredMentors = mentors.filter((m) => {
    if (m.id === me?.id) return false; // don't show self
    if (onlyAccepting && !m.is_accepting) return false;
    if (areaFilter && !m.areas.includes(areaFilter)) return false;
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !(m.current_company ?? '').toLowerCase().includes(search.toLowerCase()) &&
        !(m.job_title ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isMentor    = !!myMentorProfile;
  const isStudent   = me?.role === 'student';
  const canMentor   = (me?.role === 'alumni' || me?.role === 'teacher') && !isMentor;

  const acceptedRequests = requests.filter((r) => r.status === 'accepted') as MentorshipRequest[];
  const pendingRequests  = requests.filter((r) => r.status === 'pending');
  const upcomingSessions = sessions.filter((s) => s.status === 'scheduled');
  const pastSessions     = sessions.filter((s) => s.status !== 'scheduled');

  // ── Mentor accept/decline/end actions ──────────────────────────────────────
  const acceptRequest = async (req: MentorshipRequest) => {
    await supabase.from('mentorship_requests').update({ status: 'accepted' }).eq('id', req.id);
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'accepted' } : r));
  };

  const endMentorship = async (req: MentorshipRequest) => {
    if (!confirm(`End mentorship with ${req.student?.full_name ?? 'this student'}? This cannot be undone.`)) return;
    await supabase.from('mentorship_requests').update({ status: 'ended' }).eq('id', req.id);
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'ended' } : r));
  };

  const cancelRequest = async (req: MentorshipRequest) => {
    if (!confirm('Withdraw this request?')) return;
    await supabase.from('mentorship_requests').update({ status: 'cancelled' }).eq('id', req.id);
    setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'cancelled' } : r));
  };

  const cancelSession = async (ses: MentorSession) => {
    if (!confirm('Cancel this session?')) return;
    await supabase.from('mentorship_sessions').update({ status: 'cancelled' }).eq('id', ses.id);
    setSessions((prev) => prev.map((s) => s.id === ses.id ? { ...s, status: 'cancelled' } : s));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Mentorship</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
              {isStudent ? 'Find an alumnus who\'s been where you\'re going.'
                         : isMentor ? 'Guide the next generation of MAJUites.'
                         : 'Connect, guide, and grow together.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isMentor && (
              <Link href="/mentorship/become-mentor"
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                <Pencil size={14} /> Edit mentor profile
              </Link>
            )}
            {canMentor && (
              <Link href="/mentorship/become-mentor"
                className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
                <Sparkles size={14} /> Become a mentor
              </Link>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-zinc-900 rounded-2xl p-1.5 max-w-sm">
          {(['browse', 'requests', 'sessions'] as TabId[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors', tab === t
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200')}>
              {t === 'requests' ? (isMentor ? 'Requests' : 'Requests') : t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'requests' && pendingRequests.length > 0 && requestsLoaded && (
                <span className="ml-1.5 min-w-[18px] h-[18px] inline-flex items-center justify-center bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════ BROWSE TAB ══════════════ */}
        {tab === 'browse' && (
          <div>
            {/* Mentor banner for eligible alumni/teachers */}
            {canMentor && (
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white mb-6 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-bold text-lg mb-1">Share your journey — become a mentor</h2>
                  <p className="text-indigo-200 text-sm">Help juniors navigate their career. Takes 30 seconds to set up.</p>
                </div>
                <Link href="/mentorship/become-mentor"
                  className="shrink-0 bg-white text-indigo-700 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors">
                  Set up profile
                </Link>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, company…" className={`${inputCls} pl-9`} />
              </div>
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700">
                <option value="">All areas</option>
                {MENTOR_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={() => setOnlyAccepting(!onlyAccepting)}
                className={cn('px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors', onlyAccepting
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900')}>
                Accepting only
              </button>
            </div>

            {loadingBrowse ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : filteredMentors.length === 0 ? (
              <div className="text-center py-16">
                <GraduationCap size={40} className="mx-auto text-slate-200 dark:text-zinc-700 mb-3" />
                <p className="text-slate-500 dark:text-zinc-400 text-sm">
                  {mentors.length === 0 ? 'No mentors yet — check back soon, or become the first!'
                   : 'No mentors match your filters.'}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentors.map((m) => <MentorCard key={m.id} mentor={m} isStudent={isStudent} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ REQUESTS TAB ══════════════ */}
        {tab === 'requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                {isMentor ? 'Incoming mentorship requests' : 'Your mentorship requests'}
              </h2>
              {isStudent && (
                <Link href="/mentorship" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1">
                  Browse mentors <ChevronRight size={12} />
                </Link>
              )}
            </div>

            {loadingRequests ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen size={40} className="mx-auto text-slate-200 dark:text-zinc-700 mb-3" />
                <p className="text-slate-500 dark:text-zinc-400 text-sm">
                  {isMentor ? 'No requests yet. Make sure your profile is set to "accepting".'
                            : 'You haven\'t requested any mentors yet. Browse and find one!'}
                </p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                      {initials(isMentor ? (req.student?.full_name ?? '?') : (req.mentor?.full_name ?? '?'))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/profile/${isMentor ? req.student_id : req.mentor_id}`}
                          className="font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm">
                          {isMentor ? req.student?.full_name : req.mentor?.full_name}
                        </Link>
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', REQ_STATUS[req.status]?.cls)}>
                          {REQ_STATUS[req.status]?.label}
                        </span>
                      </div>
                      {!isMentor && req.mentor && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {req.mentor.job_title}{req.mentor.current_company ? ` @ ${req.mentor.current_company}` : ''}
                        </p>
                      )}
                      {isMentor && req.student && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {req.student.department} · Batch {req.student.batch_year}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[11px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">{req.area}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2 line-clamp-2">{req.goal}</p>
                      {req.mentor_note && (req.status === 'declined' || req.status === 'ended') && (
                        <p className="text-xs text-slate-500 dark:text-zinc-500 italic mt-1 flex items-start gap-1">
                          <AlertCircle size={12} className="shrink-0 mt-0.5" /> {req.mentor_note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {isMentor && req.status === 'pending' && (
                      <>
                        <button onClick={() => acceptRequest(req)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors">
                          <CheckCircle2 size={13} /> Accept
                        </button>
                        <button onClick={() => setDeclineFor(req)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                          <XCircle size={13} /> Decline
                        </button>
                      </>
                    )}
                    {isMentor && req.status === 'accepted' && (
                      <>
                        <button onClick={() => setScheduleFor({ requestId: req.id })}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
                          <CalendarClock size={13} /> Schedule session
                        </button>
                        <button onClick={() => endMentorship(req)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                          End mentorship
                        </button>
                      </>
                    )}
                    {!isMentor && req.status === 'pending' && (
                      <button onClick={() => cancelRequest(req)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                        <XCircle size={13} /> Withdraw
                      </button>
                    )}
                    {!isMentor && req.status === 'accepted' && (
                      <button onClick={() => setScheduleFor({ requestId: req.id })}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
                        <CalendarClock size={13} /> Schedule session
                      </button>
                    )}
                    <Link href={isMentor ? `/profile/${req.student_id}` : `/mentorship/${req.mentor_id}`}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-2 transition-colors">
                      View profile <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════ SESSIONS TAB ══════════════ */}
        {tab === 'sessions' && (
          <div>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Your sessions</h2>
              {(isStudent ? acceptedRequests.filter(r => requests.find(x => x.id === r.id && x.status === 'accepted')) : acceptedRequests).length > 0 && (
                <button onClick={() => setScheduleFor({})}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-colors">
                  <CalendarClock size={14} /> Schedule new session
                </button>
              )}
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16">
                <Calendar size={40} className="mx-auto text-slate-200 dark:text-zinc-700 mb-3" />
                <p className="text-slate-500 dark:text-zinc-400 text-sm">No sessions yet.</p>
                {isStudent && acceptedRequests.length === 0 && (
                  <p className="text-slate-400 dark:text-zinc-500 text-xs mt-1">Request a mentor first — sessions unlock once they accept.</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {upcomingSessions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Upcoming</p>
                    <div className="space-y-3">
                      {upcomingSessions.map((s) => (
                        <SessionCard key={s.id} session={s} me={me!} isMentor={isMentor}
                          onComplete={() => setCompleteFor(s)}
                          onReview={() => setReviewFor(s)}
                          onCancel={() => cancelSession(s)} />
                      ))}
                    </div>
                  </div>
                )}
                {pastSessions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Past</p>
                    <div className="space-y-3">
                      {pastSessions.map((s) => (
                        <SessionCard key={s.id} session={s} me={me!} isMentor={isMentor}
                          onComplete={() => setCompleteFor(s)}
                          onReview={() => setReviewFor(s)}
                          onCancel={() => cancelSession(s)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {scheduleFor !== null && me && acceptedRequests.length > 0 && (
        <ScheduleModal
          acceptedRequests={acceptedRequests.map((r) => {
            const full = requests.find((x) => x.id === r.id);
            return full ?? r;
          })}
          initialRequestId={scheduleFor.requestId}
          me={me}
          onClose={() => setScheduleFor(null)}
          onScheduled={(s) => {
            setSessions((prev) => [s, ...prev].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()));
            setSessionsLoaded(true);
          }}
        />
      )}
      {completeFor && (
        <CompleteModal session={completeFor} onClose={() => setCompleteFor(null)}
          onCompleted={(notes) => setSessions((prev) => prev.map((s) => s.id === completeFor!.id ? { ...s, status: 'completed', session_notes: notes || null } : s))} />
      )}
      {reviewFor && (
        <ReviewModal session={reviewFor} onClose={() => setReviewFor(null)}
          onReviewed={(rev) => setSessions((prev) => prev.map((s) => s.id === reviewFor!.id ? { ...s, my_review: rev } : s))} />
      )}
      {declineFor && (
        <DeclineModal request={declineFor} onClose={() => setDeclineFor(null)}
          onDeclined={() => setRequests((prev) => prev.map((r) => r.id === declineFor!.id ? { ...r, status: 'declined' } : r))} />
      )}
    </div>
  );
}

// ── Mentor card (browse grid) ──────────────────────────────────────────────────
function MentorCard({ mentor, isStudent }: { mentor: Mentor; isStudent: boolean }) {
  const displayAreas = mentor.areas.slice(0, 3);
  const extraAreas   = mentor.areas.length - 3;
  const isFull = mentor.active_mentee_count >= mentor.max_mentees;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-sm transition-all flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
          {initials(mentor.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-tight">{mentor.full_name}</p>
          {mentor.job_title && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              {mentor.job_title}{mentor.current_company ? ` @ ${mentor.current_company}` : ''}
            </p>
          )}
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">{mentor.department}</p>
        </div>
        <span className={cn('shrink-0 text-[10px] font-bold px-2 py-1 rounded-full',
          isFull ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500'
                 : mentor.is_accepting ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                 : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500')}>
          {isFull ? 'Full' : mentor.is_accepting ? 'Accepting' : 'Closed'}
        </span>
      </div>

      {mentor.tagline && (
        <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 -mt-1">{mentor.tagline}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {displayAreas.map((a) => (
          <span key={a} className="text-[11px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">{a}</span>
        ))}
        {extraAreas > 0 && <span className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 rounded-full">+{extraAreas}</span>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
          {mentor.review_count > 0 ? (
            <span className="flex items-center gap-1">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {mentor.avg_rating} <span className="text-slate-400 dark:text-zinc-500">({mentor.review_count})</span>
            </span>
          ) : (
            <span className="text-slate-400 dark:text-zinc-500">No reviews yet</span>
          )}
          <span className="flex items-center gap-1">
            <Users size={12} />
            {mentor.active_mentee_count}/{mentor.max_mentees}
          </span>
        </div>
      </div>

      <Link href={`/mentorship/${mentor.id}`}
        className="w-full text-center text-sm font-semibold py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
        View profile {isStudent && mentor.is_accepting && !isFull && '& request'}
      </Link>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────
function SessionCard({ session, me, isMentor, onComplete, onReview, onCancel }: {
  session: MentorSession; me: Profile; isMentor: boolean;
  onComplete: () => void; onReview: () => void; onCancel: () => void;
}) {
  const other      = isMentor ? session.student : session.mentor;
  const isPast     = new Date(session.scheduled_at) < new Date();
  const canComplete = isMentor && session.status === 'scheduled' && isPast;
  const canReview   = !isMentor && session.status === 'completed' && !session.my_review;
  const canCancel   = session.status === 'scheduled' && !isPast;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
            {initials(other?.full_name ?? '?')}
          </div>
          <div>
            <Link href={`/profile/${isMentor ? session.student_id : session.mentor_id}`}
              className="font-semibold text-slate-900 dark:text-zinc-100 text-sm hover:text-indigo-600 dark:hover:text-indigo-400">
              {isMentor ? 'with ' : ''}{other?.full_name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border', SES_STATUS[session.status]?.cls)}>
                {SES_STATUS[session.status]?.label}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                <Clock size={11} /> {session.duration_mins}m
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{fmtDateTime(session.scheduled_at)}</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Pakistan time</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-zinc-800">
        <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mb-1">Agenda</p>
        <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed line-clamp-3">{session.agenda}</p>
      </div>

      {session.session_notes && (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Session notes</p>
          <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{session.session_notes}</p>
        </div>
      )}

      {session.my_review && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center gap-2">
          <div className="flex">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} size={12} className={s <= session.my_review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-600'} />
            ))}
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">Reviewed</p>
        </div>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        {canComplete && (
          <button onClick={onComplete}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors">
            <CheckCircle2 size={13} /> Mark complete
          </button>
        )}
        {canReview && (
          <button onClick={onReview}
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl transition-colors">
            <Star size={13} /> Leave review
          </button>
        )}
        {canCancel && (
          <button onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
            Cancel session
          </button>
        )}
        <Link href={`/mentorship/sessions/${session.id}`}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-2 transition-colors">
          <MessageCircle size={12} /> Details
        </Link>
      </div>
    </div>
  );
}

export default function MentorshipPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <MentorshipInner />
    </Suspense>
  );
}
