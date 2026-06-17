'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, ReferralRequest, ReferralStatus } from '@/types';
import { Clock, CheckCircle, XCircle, Star, ExternalLink, Loader2, Inbox, Trophy } from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { Badge } from '@/components/ui/badge';
import { SuccessStoryModal } from '@/components/SuccessStoryModal';

const STATUS_META: Record<ReferralStatus, { label: string; variant: 'warning' | 'default' | 'destructive' | 'success'; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  variant: 'warning',     icon: <Clock size={11} /> },
  accepted: { label: 'Accepted', variant: 'default',     icon: <CheckCircle size={11} /> },
  declined: { label: 'Declined', variant: 'destructive', icon: <XCircle size={11} /> },
  referred: { label: 'Referred', variant: 'success',     icon: <Star size={11} /> },
};

export default function ReferralsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser]   = useState<Profile | null>(null);
  const [requests, setRequests]         = useState<ReferralRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [activeTab, setActiveTab]       = useState<ReferralStatus | 'all'>('all');
  const [updatingId, setUpdatingId]     = useState<string | null>(null);
  const [storyPrefill, setStoryPrefill] = useState<{
    referralId?: string; referredById?: string; referredByName?: string;
    company: string; role: string;
  } | null>(null);
  const [sharedStoryIds, setSharedStoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: p, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', user.id).single();
      if (pErr || !p) { router.push('/onboarding'); return; }
      setCurrentUser(p as Profile);

      // Check which referred requests already have a story shared
      const { data: myStories } = await supabase
        .from('success_stories')
        .select('referral_id')
        .eq('user_id', user.id)
        .not('referral_id', 'is', null);
      setSharedStoryIds(new Set((myStories ?? []).map((s) => s.referral_id as string)));

      let query;
      if (p.role === 'alumni' || p.role === 'teacher') {
        // Inbox: requests sent to this alumni/teacher
        query = supabase
          .from('referral_requests')
          .select(`
            *,
            requester:profiles!requester_id (
              id, full_name, department, batch_year,
              profile_picture_url, linkedin_url, skills
            )
          `)
          .eq('alumni_id', user.id)
          .order('created_at', { ascending: false });
      } else {
        // Student: their own sent requests
        query = supabase
          .from('referral_requests')
          .select(`
            *,
            alumni:profiles!alumni_id (
              id, full_name, job_title, current_company,
              profile_picture_url
            )
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });
      }

      const { data, error: qErr } = await query;
      if (qErr) { setError(qErr.message); }
      else { setRequests((data ?? []) as unknown as ReferralRequest[]); }
      setLoading(false);
    })();
  }, [supabase, router]);

  const handleStatusUpdate = async (
    id: string,
    status: ReferralStatus,
    notes?: string,
  ) => {
    setUpdatingId(id);
    const { data, error: uErr } = await supabase
      .from('referral_requests')
      .update({
        status,
        ...(notes !== undefined ? { alumni_notes: notes } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    setUpdatingId(null);
    if (uErr) { setError(uErr.message); return; }
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  };

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab);

  const isAlumni = currentUser?.role === 'alumni' || currentUser?.role === 'teacher';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-5">
          {isAlumni ? 'Referral Inbox' : 'My Referral Requests'}
        </h1>

        {/* Error banner */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'accepted', 'referred', 'declined'] as const).map((tab) => {
            const count = tab === 'all'
              ? requests.length
              : requests.filter((r) => r.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-600'
                }`}
              >
                {tab === 'all' ? `All (${count})` : `${tab} (${count})`}
              </button>
            );
          })}
        </div>

        {/* ── Share story modal ──────────────────────────────────── */}
        {currentUser && storyPrefill && (
          <SuccessStoryModal
            open={!!storyPrefill}
            onClose={() => setStoryPrefill(null)}
            currentUser={currentUser}
            prefill={storyPrefill}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Inbox size={36} className="mx-auto mb-3 text-slate-300 dark:text-zinc-600" />
            <p className="font-medium text-slate-600 dark:text-zinc-300">Nothing here yet</p>
            {!isAlumni && (
              <Link
                href="/alumni"
                className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
              >
                Browse alumni and send your first request →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <ReferralCard
                key={req.id}
                request={req}
                isAlumni={!!isAlumni}
                updatingId={updatingId}
                onUpdateStatus={handleStatusUpdate}
                alreadyShared={sharedStoryIds.has(req.id)}
                onShareStory={() => setStoryPrefill({
                  referralId:     req.id,
                  referredById:   req.alumni_id,
                  referredByName: req.alumni?.full_name,
                  company:        req.company,
                  role:           req.role,
                })}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Card component ─────────────────────────────────────────────────────────────

function ReferralCard({
  request, isAlumni, updatingId, onUpdateStatus, alreadyShared, onShareStory,
}: {
  request: ReferralRequest;
  isAlumni: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: ReferralStatus, notes?: string) => void;
  alreadyShared?: boolean;
  onShareStory?: () => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes]         = useState('');
  const meta   = STATUS_META[request.status];
  const person = isAlumni ? request.requester : request.alumni;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
            {person?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <Link
              href={`/profile/${person?.id}`}
              className="font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors"
            >
              {person?.full_name ?? '—'}
            </Link>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              {isAlumni
                ? `${request.requester?.department ?? ''} · Batch ${request.requester?.batch_year ?? ''}`
                : `${request.alumni?.job_title ?? ''} @ ${request.alumni?.current_company ?? ''}`}
            </p>
          </div>
        </div>
        <Badge variant={meta.variant} className="shrink-0 gap-1">
          {meta.icon}{meta.label}
        </Badge>
      </div>

      {/* Job info */}
      <div className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{request.role}</span>
          <span className="text-slate-400 text-xs">at</span>
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{request.company}</span>
          {request.job_url && (
            <a
              href={request.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{request.message}</p>
      </div>

      {/* Alumni note */}
      {request.alumni_notes && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> {request.alumni_notes}
        </div>
      )}

      {/* Skills (alumni view) */}
      {isAlumni && (request.requester?.skills?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {request.requester!.skills!.map((s) => (
            <span
              key={s}
              className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Alumni actions — pending */}
      {isAlumni && request.status === 'pending' && (
        <div className="space-y-3">
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note for the requester (e.g. timeline, next steps)…"
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              rows={3}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!showNotes) setShowNotes(true);
                else onUpdateStatus(request.id, 'accepted', notes || undefined);
              }}
              disabled={updatingId === request.id}
              className="flex-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 py-2 rounded-xl transition-colors"
            >
              {updatingId === request.id
                ? <Loader2 size={15} className="animate-spin mx-auto" />
                : showNotes ? 'Confirm accept' : 'Accept'}
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'referred', notes || undefined)}
              disabled={updatingId === request.id}
              className="flex-1 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 py-2 rounded-xl transition-colors"
            >
              Mark referred
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'declined')}
              disabled={updatingId === request.id}
              className="px-4 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 py-2 rounded-xl transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Alumni actions — accepted → referred */}
      {isAlumni && request.status === 'accepted' && (
        <button
          onClick={() => onUpdateStatus(request.id, 'referred')}
          disabled={updatingId === request.id}
          className="w-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 py-2 rounded-xl transition-colors"
        >
          {updatingId === request.id
            ? <Loader2 size={15} className="animate-spin mx-auto" />
            : 'Mark as referred'}
        </button>
      )}

      {/* ── Share success story prompt (student, referred status) ─── */}
      {!isAlumni && request.status === 'referred' && onShareStory && (
        <div className={`mt-4 rounded-xl p-4 border transition-colors ${
          alreadyShared
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900'
            : 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-100 dark:border-indigo-900'
        }`}>
          {alreadyShared ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
              <Trophy size={15} />
              Story shared! Inspiring future MAJUites.
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                  🎉 You got referred!
                </p>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-0.5">
                  Share your success story and inspire juniors.
                </p>
              </div>
              <button
                onClick={onShareStory}
                className="shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                <Trophy size={12} /> Share story
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-4">
        {new Date(request.created_at).toLocaleDateString('en-PK', {
          day: 'numeric', month: 'short', year: 'numeric',
        })}
      </p>
    </div>
  );
}
