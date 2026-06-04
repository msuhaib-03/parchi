'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { DEPARTMENTS } from '@/types';
import { Search, Briefcase, ExternalLink, Loader2, MessageCircle } from 'lucide-react';
import ReferralModal from '@/components/ReferralModal';
import { AppNav } from '@/components/AppNav';

export default function AlumniPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ department: '', company: '', open_to_referrals: false });
  const [selectedAlumni, setSelectedAlumni] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setCurrentUser(data as Profile);
      });
    });
  }, [supabase, router]);

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const result = await usersApi.getAlumni({
        department: filters.department || undefined,
        company: filters.company || undefined,
        open_to_referrals: filters.open_to_referrals || undefined,
      });
      setAlumni(result.alumni);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchAlumni(); }, [fetchAlumni]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-5">Browse Alumni</h1>

        {/* ─── Filters ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-4 mb-6 flex flex-wrap gap-3 transition-colors">
          <select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className="flex-1 min-w-[150px] px-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company…"
              value={filters.company}
              onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={filters.open_to_referrals}
                onChange={(e) => setFilters((f) => ({ ...f, open_to_referrals: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${filters.open_to_referrals ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-700'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.open_to_referrals ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm text-slate-600 dark:text-zinc-300 font-medium">Open to referrals</span>
          </label>
        </div>

        {/* ─── Grid ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : alumni.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-zinc-500">
            <Search size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium text-slate-600 dark:text-zinc-300">No alumni found</p>
            <p className="text-sm mt-1">Try changing your filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumni.map((person) => (
              <AlumniCard
                key={person.id}
                person={person}
                isOwnProfile={person.id === currentUser?.id}
                onRequestReferral={() => setSelectedAlumni(person)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedAlumni && (
        <ReferralModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onSuccess={() => { setSelectedAlumni(null); router.push('/referrals'); }}
        />
      )}
    </div>
  );
}

function AlumniCard({ person, isOwnProfile, onRequestReferral }: {
  person: Profile; isOwnProfile: boolean; onRequestReferral: () => void;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 hover:shadow-md hover:shadow-slate-100/50 dark:hover:shadow-none hover:border-slate-200 dark:hover:border-zinc-700 transition-all flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-base shrink-0">
          {person.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-zinc-100 truncate text-sm">{person.full_name}</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            {person.department} · Batch {person.batch_year}
          </p>
        </div>
        {person.is_open_to_referrals && (
          <span className="shrink-0 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Open
          </span>
        )}
      </div>

      {person.current_company && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-300">
          <Briefcase size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
          <span className="font-medium truncate">{person.job_title}</span>
          <span className="text-slate-300 dark:text-zinc-600">·</span>
          <span className="truncate text-slate-500 dark:text-zinc-400">{person.current_company}</span>
        </div>
      )}

      {person.bio && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">{person.bio}</p>
      )}

      <div className="flex gap-2 mt-auto">
        <Link href={`/profile/${person.id}`}
          className="flex-1 text-center text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
          View profile
        </Link>
        {!isOwnProfile && person.is_open_to_referrals && (
          <button onClick={onRequestReferral}
            className="flex-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl transition-colors">
            Ask referral
          </button>
        )}
        {!isOwnProfile && (
          <Link href={`/messages?with=${person.id}`}
            className="p-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
            title="Message">
            <MessageCircle size={15} />
          </Link>
        )}
        {person.linkedin_url && (
          <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer"
            className="p-2 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  );
}
