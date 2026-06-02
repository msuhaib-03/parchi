'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { referralsApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { Profile, ReferralRequest, ReferralStatus } from '@/types';
import { ArrowLeft, Clock, CheckCircle, XCircle, Star, ExternalLink, Loader2 } from 'lucide-react';

const STATUS_STYLES: Record<ReferralStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',      classes: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800', icon: <Clock size={12} /> },
  accepted: { label: 'Accepted',     classes: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800',             icon: <CheckCircle size={12} /> },
  declined: { label: 'Declined',     classes: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800',                   icon: <XCircle size={12} /> },
  referred: { label: 'Referred! 🎉', classes: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800',       icon: <Star size={12} /> },
};

export default function ReferralsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReferralStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!p) { router.push('/onboarding'); return; }
      setProfile(p as Profile);

      const data = p.role === 'alumni'
        ? await referralsApi.getInbox()
        : await referralsApi.getMine();
      setRequests(data);
      setLoading(false);
    })();
  }, [supabase, router]);

  const handleStatusUpdate = async (id: string, status: ReferralStatus, notes?: string) => {
    setUpdatingId(id);
    try {
      const updated = await referralsApi.updateStatus(id, status, notes);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = activeTab === 'all' ? requests : requests.filter((r) => r.status === activeTab);
  const isAlumni = profile?.role === 'alumni';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {isAlumni ? 'Referral Inbox' : 'My Referral Requests'}
          </h1>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'accepted', 'referred', 'declined'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab === 'all' ? `All (${requests.length})` : `${tab} (${requests.filter(r => r.status === tab).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">Nothing here yet</p>
            {!isAlumni && (
              <Link href="/alumni" className="mt-3 inline-block text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">
                Browse alumni and send your first request →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req) => (
              <ReferralCard
                key={req.id}
                request={req}
                isAlumni={isAlumni}
                updatingId={updatingId}
                onUpdateStatus={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ReferralCard({
  request,
  isAlumni,
  updatingId,
  onUpdateStatus,
}: {
  request: ReferralRequest;
  isAlumni: boolean;
  updatingId: string | null;
  onUpdateStatus: (id: string, status: ReferralStatus, notes?: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const statusStyle = STATUS_STYLES[request.status];
  const person = isAlumni ? request.requester : request.alumni;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        {/* Person */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
            {person?.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <Link href={`/profile/${person?.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-sm">
              {person?.full_name}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isAlumni
                ? `${request.requester?.department} · Batch ${request.requester?.batch_year}`
                : `${request.alumni?.job_title} @ ${request.alumni?.current_company}`}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${statusStyle.classes}`}>
          {statusStyle.icon}
          {statusStyle.label}
        </span>
      </div>

      {/* Request details */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{request.role}</span>
          <span className="text-gray-400">@</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{request.company}</span>
          {request.job_url && (
            <a href={request.job_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{request.message}</p>
      </div>

      {/* Alumni notes */}
      {request.alumni_notes && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <strong>Alumni note:</strong> {request.alumni_notes}
        </div>
      )}

      {/* Skills (for alumni view) */}
      {isAlumni && request.requester?.skills && request.requester.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {request.requester.skills.map((s) => (
            <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {/* Alumni actions */}
      {isAlumni && request.status === 'pending' && (
        <div className="space-y-3">
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note for the requester (e.g. timeline, next steps)..."
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={3}
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { if (!showNotes) setShowNotes(true); else onUpdateStatus(request.id, 'accepted', notes || undefined); }}
              disabled={updatingId === request.id}
              className="flex-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-xl transition-colors"
            >
              {updatingId === request.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : showNotes ? 'Confirm accept' : 'Accept'}
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'referred', notes || undefined)}
              disabled={updatingId === request.id}
              className="flex-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 py-2 rounded-xl transition-colors"
            >
              Mark referred ✓
            </button>
            <button
              onClick={() => onUpdateStatus(request.id, 'declined')}
              disabled={updatingId === request.id}
              className="px-4 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-xl transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {isAlumni && request.status === 'accepted' && (
        <button
          onClick={() => onUpdateStatus(request.id, 'referred')}
          disabled={updatingId === request.id}
          className="w-full text-sm font-medium text-white bg-green-600 hover:bg-green-700 py-2 rounded-xl transition-colors"
        >
          Mark as referred 🎉
        </button>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        {new Date(request.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}
