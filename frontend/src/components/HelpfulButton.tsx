'use client';

import { useState } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  kind: 'experience' | 'resource';
  targetId: string;
  userId: string;
  initialCount: number;
  initialMarked: boolean;
  size?: 'sm' | 'md';
}

// Maps each kind to its join table + the FK column the row keys on.
const MAP = {
  experience: { table: 'interview_experience_helpful', col: 'experience_id' },
  resource:   { table: 'prep_resource_helpful',        col: 'resource_id'   },
} as const;

export function HelpfulButton({ kind, targetId, userId, initialCount, initialMarked, size = 'md' }: Props) {
  const supabase = createClient();
  const [marked, setMarked] = useState(initialMarked);
  const [count, setCount]   = useState(initialCount);
  const [busy, setBusy]     = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    // Cards are often wrapped in a <Link>; don't navigate when voting.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const { table, col } = MAP[kind];
    const next = !marked;

    // Optimistic update
    setMarked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setBusy(true);

    const res = next
      ? await supabase.from(table).insert({ [col]: targetId, user_id: userId })
      : await supabase.from(table).delete().eq(col, targetId).eq('user_id', userId);

    setBusy(false);
    if (res.error) {
      // Revert on failure
      setMarked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const sm = size === 'sm';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={marked}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors disabled:opacity-60 shrink-0',
        sm ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5',
        marked
          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-indigo-300 dark:hover:border-indigo-700'
      )}
    >
      {busy
        ? <Loader2 size={sm ? 12 : 13} className="animate-spin" />
        : <ThumbsUp size={sm ? 12 : 13} className={marked ? 'fill-current' : ''} />}
      Helpful{count > 0 ? ` · ${count}` : ''}
    </button>
  );
}
