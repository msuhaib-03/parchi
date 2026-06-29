'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp, Shield, PlusCircle, Search, SlidersHorizontal,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, MapPin, Briefcase,
} from 'lucide-react';
import type { SalaryEntry, MySalaryEntry, SalaryRoleLevel, SalaryLocation } from '@/types';
import { fmtPKR, SALARY_ROLE_LEVELS, SALARY_LOCATIONS } from '@/types';

// ─── Aggregation ─────────────────────────────────────────────────────────────

interface SalaryGroup {
  key:        string;
  role_title: string;
  role_level: string;
  count:      number;
  median:     number;
  min:        number;
  max:        number;
  locations:  string[];
  companies:  string[];
  years:      number[];
}

function calcMedian(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m];
}

function aggregate(entries: SalaryEntry[], minCount = 3): SalaryGroup[] {
  const map = new Map<string, SalaryEntry[]>();
  for (const e of entries) {
    const k = `${e.role_title.toLowerCase().trim()}|${e.role_level}`;
    const bucket = map.get(k) ?? [];
    bucket.push(e);
    map.set(k, bucket);
  }
  const groups: SalaryGroup[] = [];
  for (const [, bucket] of map) {
    if (bucket.length < minCount) continue;
    const salaries  = bucket.map((e) => e.monthly_salary_pkr);
    const companies = [...new Set(bucket.map((e) => e.company))].slice(0, 4);
    const locs      = [...new Set(bucket.map((e) => e.location))];
    const years     = [...new Set(bucket.map((e) => e.year_of_data))];
    groups.push({
      key:        `${bucket[0].role_title}|${bucket[0].role_level}`,
      role_title: bucket[0].role_title,
      role_level: bucket[0].role_level,
      count:      bucket.length,
      median:     calcMedian(salaries),
      min:        Math.min(...salaries),
      max:        Math.max(...salaries),
      locations:  locs,
      companies,
      years,
    });
  }
  return groups.sort((a, b) => b.count - a.count);
}

// ─── Level badge ──────────────────────────────────────────────────────────────

const levelColor: Record<string, string> = {
  intern:   'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400',
  junior:   'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  mid:      'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
  senior:   'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  lead:     'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300',
  manager:  'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300',
  director: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
};

// ─── Salary Card ─────────────────────────────────────────────────────────────

function SalaryCard({ g }: { g: SalaryGroup }) {
  const [open, setOpen] = useState(false);
  const levelLabel = SALARY_ROLE_LEVELS.find((l) => l.value === g.role_level)?.label ?? g.role_level;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-base leading-snug">
            {g.role_title}
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${levelColor[g.role_level] ?? levelColor.mid}`}>
              {levelLabel}
            </span>
            {g.locations.map((l) => (
              <span key={l} className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                <MapPin size={10} /> {l}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{fmtPKR(g.median)}</div>
          <div className="text-xs text-slate-400 dark:text-zinc-500">median / mo</div>
        </div>
      </div>

      {/* Range bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-400 dark:text-zinc-500 mb-1">
          <span>{fmtPKR(g.min)}</span>
          <span>{fmtPKR(g.max)}</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full relative overflow-hidden">
          <div
            className="absolute h-full bg-indigo-400 dark:bg-indigo-500 rounded-full"
            style={{
              left:  `${((g.median - g.min) / (g.max - g.min || 1)) * 60}%`,
              width: '8px',
              transform: 'translateX(-50%)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-200 dark:from-zinc-700 via-indigo-300 dark:via-indigo-600 to-slate-200 dark:to-zinc-700 opacity-40 rounded-full" />
        </div>
      </div>

      {/* Toggle detail */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
      >
        {g.count} {g.count === 1 ? 'salary' : 'salaries'} reported
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 space-y-1">
          <div><span className="font-medium text-slate-700 dark:text-zinc-300">Companies: </span>{g.companies.join(', ')}{g.companies.length < g.count && ' & more'}</div>
          <div><span className="font-medium text-slate-700 dark:text-zinc-300">Data from: </span>{g.years.sort().join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

export default function SalaryPage() {
  const supabase = createClient();

  const [entries,   setEntries]   = useState<SalaryEntry[]>([]);
  const [myEntry,   setMyEntry]   = useState<MySalaryEntry | null>(null);
  const [loading,   setLoading]   = useState(true);

  const [search,   setSearch]   = useState('');
  const [location, setLocation] = useState<SalaryLocation | ''>('');
  const [level,    setLevel]    = useState<SalaryRoleLevel | ''>('');

  useEffect(() => {
    (async () => {
      const [publicRes, userRes] = await Promise.all([
        supabase.rpc('get_salary_entries_public'),
        supabase.auth.getUser(),
      ]);

      if (publicRes.data) setEntries(publicRes.data as SalaryEntry[]);

      if (userRes.data.user) {
        const { data: own } = await supabase
          .from('salary_entries')
          .select('*')
          .eq('submitted_by', userRes.data.user.id)
          .eq('year_of_data', CURRENT_YEAR)
          .maybeSingle();
        if (own) setMyEntry(own as MySalaryEntry);
      }

      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((e) => {
      if (q && !e.role_title.toLowerCase().includes(q) && !e.company.toLowerCase().includes(q)) return false;
      if (location && e.location !== location) return false;
      if (level && e.role_level !== level) return false;
      return true;
    });
  }, [entries, search, location, level]);

  const groups = useMemo(() => aggregate(filtered), [filtered]);

  const totalSalaries = entries.length;
  const overallMedian = entries.length > 0 ? calcMedian(entries.map((e) => e.monthly_salary_pkr)) : 0;
  const uniqueRoles   = new Set(entries.map((e) => e.role_title.toLowerCase())).size;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={22} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Salary Insights</h1>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Anonymous salary data shared by MAJU alumni and students.
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Shield size={12} />
            <span>No one can see who submitted what. Submissions are fully anonymous.</span>
          </div>
        </div>

        {/* Stats strip */}
        {!loading && totalSalaries > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Salaries shared', value: totalSalaries.toString() },
              { label: 'Overall median', value: fmtPKR(overallMedian) + '/mo' },
              { label: 'Roles tracked', value: uniqueRoles.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
                <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* My contribution banner */}
        {myEntry && (
          <div className="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 mb-6">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>
                You contributed{' '}
                <strong>{myEntry.role_title}</strong> at{' '}
                <strong>{myEntry.company}</strong> ({CURRENT_YEAR}) —{' '}
                {fmtPKR(myEntry.monthly_salary_pkr)}/mo
              </span>
            </div>
            <Link
              href="/salary/submit"
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              Update
            </Link>
          </div>
        )}

        {/* CTA when no contribution */}
        {!myEntry && !loading && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-5 py-4 mb-6">
            <div>
              <p className="font-medium text-indigo-900 dark:text-indigo-200 text-sm">Add your salary to help the community</p>
              <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Takes 30 seconds · 100% anonymous · helps juniors know their worth</p>
            </div>
            <Link
              href="/salary/submit"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              <PlusCircle size={15} /> Add Your Salary
            </Link>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search roles or companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as SalaryLocation | '')}
                className="appearance-none pl-8 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
              >
                <option value="">All locations</option>
                {SALARY_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="relative">
              <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as SalaryRoleLevel | '')}
                className="appearance-none pl-8 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
              >
                <option value="">All levels</option>
                {SALARY_ROLE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : groups.length > 0 ? (
          <>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">
              {groups.length} role{groups.length !== 1 ? 's' : ''} · groups with fewer than 3 submissions are hidden to protect privacy
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => <SalaryCard key={g.key} g={g} />)}
            </div>
          </>
        ) : entries.length === 0 ? (
          /* Empty state — no data at all */
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl mb-4">
              <TrendingUp size={28} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-zinc-200 mb-1">No salary data yet</h3>
            <p className="text-sm text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mb-6">
              Be the first! Your anonymous submission helps every MAJU student know their market value.
            </p>
            <Link
              href="/salary/submit"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <PlusCircle size={16} /> Add the first salary
            </Link>
          </div>
        ) : (
          /* No match for current filters */
          <div className="text-center py-16">
            <Briefcase size={28} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">No roles match your filters.</p>
            <button
              onClick={() => { setSearch(''); setLocation(''); setLevel(''); }}
              className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Footer note */}
        {!loading && entries.length > 0 && (
          <p className="text-center text-xs text-slate-300 dark:text-zinc-600 mt-10">
            Data is self-reported and anonymous. Parchi does not verify individual salaries.
          </p>
        )}
      </div>
    </div>
  );
}
