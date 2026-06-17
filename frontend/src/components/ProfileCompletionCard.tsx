'use client';

import { useState } from 'react';
import type { ProfileCompletion, CompletionLevel } from '@/types';
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { levelLabelAt } from '@/lib/profileCompletion';

// ── Per-level colour tokens ───────────────────────────────────────────────────
const COLORS: Record<CompletionLevel, {
  ring:   string;
  badge:  string;
  bar:    string;
  pendingBg: string;
}> = {
  starter: {
    ring:      '#94a3b8',
    badge:     'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
    bar:       'bg-slate-400 dark:bg-slate-600',
    pendingBg: 'bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700',
  },
  rising: {
    ring:      '#3b82f6',
    badge:     'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800',
    bar:       'bg-blue-500',
    pendingBg: 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  },
  established: {
    ring:      '#6366f1',
    badge:     'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
    bar:       'bg-indigo-500',
    pendingBg: 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
  },
  pro: {
    ring:      '#8b5cf6',
    badge:     'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800',
    bar:       'bg-violet-500',
    pendingBg: 'bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/30',
  },
  complete: {
    ring:      '#10b981',
    badge:     'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
    bar:       'bg-emerald-500',
    pendingBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
};

interface Props {
  completion: ProfileCompletion;
  onEdit:     () => void;
}

export function ProfileCompletionCard({ completion, onEdit }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { score, items, level, levelLabel, nextMilestone, ptsToNextMilestone } = completion;
  const c       = COLORS[level];
  const pending = items.filter((i) => !i.done);
  const done    = items.filter((i) => i.done);

  // SVG circle params
  const R  = 27;
  const C  = 2 * Math.PI * R;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">

      {/* ── Top row: ring + text ─────────────────────────────────────────── */}
      <div className="flex items-start gap-4">

        {/* Animated SVG ring */}
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            {/* Track */}
            <circle cx="32" cy="32" r={R}
              fill="none" strokeWidth="6"
              className="stroke-slate-100 dark:stroke-zinc-800" />
            {/* Progress */}
            <circle cx="32" cy="32" r={R}
              fill="none" strokeWidth="6"
              strokeLinecap="round"
              stroke={c.ring}
              strokeDasharray={C}
              strokeDashoffset={C * (1 - score / 100)}
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-base font-black leading-none text-slate-900 dark:text-zinc-100">
              {score}%
            </span>
          </div>
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
              Profile Completion
            </h3>
            <span className={cn(
              'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
              c.badge
            )}>
              {levelLabel}
            </span>
          </div>

          {level === 'complete' ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Your profile is 100% complete — you look great!
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                {ptsToNextMilestone} pt{ptsToNextMilestone !== 1 ? 's' : ''}
              </span>{' '}
              to{' '}
              <span className="font-semibold">{nextMilestone}% · {levelLabelAt(nextMilestone)}</span>
              <span className="mx-1 text-slate-300 dark:text-zinc-600">·</span>
              {pending.length} item{pending.length !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div className="mt-4 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', c.bar)}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Milestone markers */}
      <div className="relative mt-1">
        {([25, 50, 75] as const).map((m) => (
          <div
            key={m}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${m}%`, transform: 'translateX(-50%)' }}
          >
            <div className={cn(
              'w-px h-1.5',
              score >= m ? c.bar : 'bg-slate-200 dark:bg-zinc-700'
            )} />
          </div>
        ))}
      </div>

      {/* ── Toggle checklist ─────────────────────────────────────────────── */}
      {items.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors select-none"
          >
            {expanded
              ? <ChevronUp  size={13} />
              : <ChevronDown size={13} />}
            {expanded ? 'Hide checklist' : `View checklist (${pending.length} to do)`}
          </button>

          {/* ── Checklist ──────────────────────────────────────────────── */}
          {expanded && (
            <div className="mt-3 space-y-1.5">

              {/* Pending items — clickable, link to edit */}
              {pending.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest px-1 mb-2">
                    To complete
                  </p>
                  {pending.map((item) => (
                    <button
                      key={item.key}
                      onClick={onEdit}
                      className={cn(
                        'w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-colors group',
                        c.pendingBg
                      )}
                    >
                      <Circle size={15} className="text-slate-300 dark:text-zinc-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 leading-snug">
                          {item.label}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                          {item.hint}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
                        +{item.points}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {/* Completed items — muted */}
              {done.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-slate-300 dark:text-zinc-600 uppercase tracking-widest px-1 mt-3 mb-2">
                    Done
                  </p>
                  {done.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-55"
                    >
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <p className="flex-1 text-xs font-medium text-slate-400 dark:text-zinc-500 line-through truncate">
                        {item.label}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-500 shrink-0">
                        ✓{item.points}
                      </span>
                    </div>
                  ))}
                </>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
}
