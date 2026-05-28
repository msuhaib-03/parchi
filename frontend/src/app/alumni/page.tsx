'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { DEPARTMENTS } from '@/types';
import { Search, Briefcase, MapPin, ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import ReferralModal from '@/components/ReferralModal';

export default function AlumniPage() {
  const router = useRouter();
  const supabase = createClient();

  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ department: '', company: '', open_to_referrals: false });
  const [selectedAlumni, setSelectedAlumni] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      else setCurrentUserId(user.id);
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
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Browse Alumni</h1>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* ─── Filters ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-8 flex flex-wrap gap-4">
          {/* Department filter */}
          <select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className="flex-1 min-w-[160px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Company search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company..."
              value={filters.company}
              onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Open to referrals toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={filters.open_to_referrals}
                onChange={(e) => setFilters((f) => ({ ...f, open_to_referrals: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-10 h-5 rounded-full transition-colors ${filters.open_to_referrals ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${filters.open_to_referrals ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-600 font-medium">Open to referrals</span>
          </label>
        </div>

        {/* ─── Grid ────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          </div>
        ) : alumni.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No alumni found</p>
            <p className="text-sm mt-1">Try changing your filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {alumni.map((person) => (
              <AlumniCard
                key={person.id}
                person={person}
                isOwnProfile={person.id === currentUserId}
                onRequestReferral={() => setSelectedAlumni(person)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Referral Modal */}
      {selectedAlumni && (
        <ReferralModal
          alumni={selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          onSuccess={() => {
            setSelectedAlumni(null);
            router.push('/referrals');
          }}
        />
      )}
    </div>
  );
}

function AlumniCard({
  person,
  isOwnProfile,
  onRequestReferral,
}: {
  person: Profile;
  isOwnProfile: boolean;
  onRequestReferral: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
          {person.full_name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{person.full_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {person.department} · Batch {person.batch_year}
          </p>
        </div>
        {person.is_open_to_referrals && (
          <span className="ml-auto shrink-0 text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full border border-green-100">
            Open
          </span>
        )}
      </div>

      {/* Company */}
      {person.current_company && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Briefcase size={14} className="text-gray-400" />
          <span className="font-medium">{person.job_title}</span>
          <span className="text-gray-400">@</span>
          <span>{person.current_company}</span>
        </div>
      )}

      {/* Bio */}
      {person.bio && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{person.bio}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        <Link
          href={`/profile/${person.id}`}
          className="flex-1 text-center text-sm font-medium text-gray-600 border border-gray-200 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          View profile
        </Link>
        {!isOwnProfile && person.is_open_to_referrals && (
          <button
            onClick={onRequestReferral}
            className="flex-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-xl transition-colors"
          >
            Ask referral
          </button>
        )}
        {person.linkedin_url && (
          <a
            href={person.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </div>
  );
}
