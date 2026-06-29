'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Medal, Loader2, ChevronDown } from 'lucide-react';
import {
  type ParchiScoreEntry, type ParchiTier,
  getParchiTier, PARCHI_TIER_CONFIG, DEPARTMENTS,
} from '@/types';

// ─── Tier badge ───────────────────────────────────────────────────────────────

export function TierBadge({ score, size = 'sm' }: { score: number; size?: 'xs' | 'sm' | 'md' }) {
  const tier = getParchiTier(score);
  const cfg  = PARCHI_TIER_CONFIG[tier];
  const cls  = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }[size];
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${cls} ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ─── Rank medal colors ────────────────────────────────────────────────────────

const rankStyle = (rank: number) => {
  if (rank === 1) return 'text-yellow-500 font-black text-lg';
  if (rank === 2) return 'text-slate-400 font-black text-lg';
  if (rank === 3) return 'text-amber-600 font-black text-lg';
  return 'text-slate-400 dark:text-zinc-500 font-semibold';
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function LeaderRow({
  entry, rank, isMe,
}: { entry: ParchiScoreEntry; rank: number; isMe: boolean }) {
  const tier = getParchiTier(entry.parchi_score);
  const cfg  = PARCHI_TIER_CONFIG[tier];
  const sub  = entry.role === 'student'
    ? `${entry.department} · Batch ${entry.batch_year}`
    : `${entry.job_title ?? entry.role} · ${entry.current_company ?? entry.department}`;

  return (
    <Link
      href={`/profile/${entry.id}`}
      className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/60 ${
        isMe ? 'bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800' : ''
      }`}
    >
      {/* Rank */}
      <div className={`w-8 text-center shrink-0 ${rankStyle(rank)}`}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </div>

      {/* Avatar */}
      <div className="shrink-0">
        {entry.profile_picture_url ? (
          <Image
            src={entry.profile_picture_url}
            alt={entry.full_name}
            width={40} height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
            {entry.full_name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + sub */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 dark:text-zinc-100 text-sm truncate">
          {entry.full_name} {isMe && <span className="text-indigo-500 font-normal text-xs">(you)</span>}
        </div>
        <div className="text-xs text-slate-400 dark:text-zinc-500 truncate">{sub}</div>
      </div>

      {/* Tier + score */}
      <div className="text-right shrink-0">
        <div className={`text-sm font-bold ${cfg.color}`}>{entry.parchi_score} pts</div>
        <TierBadge score={entry.parchi_score} size="xs" />
      </div>
    </Link>
  );
}

// ─── Score breakdown tooltip ──────────────────────────────────────────────────

function MyScoreCard({ entry }: { entry: ParchiScoreEntry }) {
  const tier = getParchiTier(entry.parchi_score);
  const cfg  = PARCHI_TIER_CONFIG[tier];
  const rows = [
    { label: 'Profile completeness', pts: entry.profile_pts  },
    { label: 'Referrals given',      pts: entry.referral_pts },
    { label: 'Jobs posted',          pts: entry.job_pts      },
    { label: 'Mentorship sessions',  pts: entry.session_pts  },
    { label: 'Salary submitted',     pts: entry.salary_pts   },
    { label: 'Stories posted',       pts: entry.story_pts    },
  ].filter((r) => r.pts > 0);

  return (
    <div className={`rounded-2xl border p-5 mb-6 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-2xl font-black ${cfg.color}`}>{entry.parchi_score} pts</div>
          <TierBadge score={entry.parchi_score} size="md" />
        </div>
        {cfg.nextScore && (
          <div className="text-right text-xs text-slate-400 dark:text-zinc-500">
            <div>{cfg.nextScore - entry.parchi_score} pts to next tier</div>
            <div className="mt-1 w-28 h-1.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(100, ((entry.parchi_score - cfg.minScore) / (cfg.nextScore - cfg.minScore)) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between">
              <span className="text-slate-500 dark:text-zinc-400">{r.label}</span>
              <span className={`font-semibold ${cfg.color}`}>+{r.pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | 'alumni' | 'student' | 'teacher' | 'dept';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all',     label: 'Overall'  },
  { key: 'alumni',  label: 'Alumni'   },
  { key: 'student', label: 'Students' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'dept',    label: 'By Dept'  },
];

export default function LeaderboardPage() {
  const supabase = createClient();

  const [entries,  setEntries]  = useState<ParchiScoreEntry[]>([]);
  const [myId,     setMyId]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('all');
  const [dept,     setDept]     = useState<string>(DEPARTMENTS[0]);

  useEffect(() => {
    (async () => {
      const [scoreRes, userRes] = await Promise.all([
        supabase.from('parchi_scores').select('*').order('parchi_score', { ascending: false }).limit(200),
        supabase.auth.getUser(),
      ]);
      if (scoreRes.data) setEntries(scoreRes.data as ParchiScoreEntry[]);
      if (userRes.data.user) setMyId(userRes.data.user.id);
      setLoading(false);
    })();
  }, [supabase]);

  const filtered = useMemo(() => {
    if (tab === 'all')    return entries;
    if (tab === 'dept')   return entries.filter((e) => e.department === dept);
    return entries.filter((e) => e.role === tab);
  }, [entries, tab, dept]);

  const myEntry = entries.find((e) => e.id === myId);
  const myRankOverall = myEntry ? entries.findIndex((e) => e.id === myId) + 1 : null;

  const tierCounts = useMemo(() => {
    const counts: Record<ParchiTier, number> = { newcomer: 0, contributor: 0, connector: 0, champion: 0, legend: 0 };
    for (const e of entries) counts[getParchiTier(e.parchi_score)]++;
    return counts;
  }, [entries]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Medal size={22} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Leaderboard</h1>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">
            Ranked by contributions to the MAJU community.
          </p>
        </div>

        {/* Tier legend strip */}
        {!loading && (
          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(PARCHI_TIER_CONFIG) as ParchiTier[]).map((t) => {
              const c = PARCHI_TIER_CONFIG[t];
              return (
                <span key={t} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${c.color} ${c.bg} ${c.border}`}>
                  {c.emoji} {c.label} <span className="opacity-60">({tierCounts[t]})</span>
                </span>
              );
            })}
          </div>
        )}

        {/* My score card */}
        {myEntry && (
          <div className="mb-2">
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">
              Your Parchi Score · #{myRankOverall} overall
            </p>
            <MyScoreCard entry={myEntry} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-slate-100 dark:bg-zinc-800/60 rounded-xl p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                tab === key
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Department picker */}
        {tab === 'dept' && (
          <div className="relative mb-4">
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="w-full appearance-none pl-4 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors"
            >
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-zinc-500 text-sm">
            No users in this category yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 divide-y divide-slate-50 dark:divide-zinc-800/60 overflow-hidden">
            {filtered.map((entry, idx) => (
              <LeaderRow
                key={entry.id}
                entry={entry}
                rank={idx + 1}
                isMe={entry.id === myId}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-slate-300 dark:text-zinc-600 mt-6">
            Score = profile completeness + referrals given + jobs posted + mentorship + salary contributed + stories
          </p>
        )}
      </div>
    </div>
  );
}
