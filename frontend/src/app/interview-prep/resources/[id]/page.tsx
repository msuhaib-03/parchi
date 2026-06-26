'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, PrepResource } from '@/types';
import { RESOURCE_TYPE_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import { HelpfulButton } from '@/components/HelpfulButton';
import {
  Loader2, ArrowLeft, BookOpen, ExternalLink, Edit2, Trash2,
} from 'lucide-react';

export default function ResourceDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [me, setMe]           = useState<Profile | null>(null);
  const [res, setRes]         = useState<PrepResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: r }, { data: mark }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('prep_resources')
          .select('*, author:profiles!author_id(id, full_name, role, job_title, current_company)')
          .eq('id', id).single(),
        supabase.from('prep_resource_helpful')
          .select('resource_id').eq('resource_id', id).eq('user_id', user.id).maybeSingle(),
      ]);

      if (!r) { router.push('/interview-prep?tab=resources'); return; }
      setMe(profile as Profile);
      setRes({ ...(r as unknown as PrepResource), i_found_helpful: !!mark });
      setLoading(false);
    })();
  }, [id, router, supabase]);

  const handleDelete = async () => {
    if (!res) return;
    if (!confirm('Delete this resource permanently? This cannot be undone.')) return;
    setDeleting(true);
    const { error } = await supabase.from('prep_resources').delete().eq('id', res.id);
    setDeleting(false);
    if (error) { alert(error.message); return; }
    router.push('/interview-prep?tab=resources');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!res) return null;

  const isOwner = me?.id === res.author_id;
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <Link href="/interview-prep?tab=resources"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft size={15} /> Back to Resources
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <BookOpen size={22} className="text-violet-500 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">{res.title}</h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                  {RESOURCE_TYPE_LABELS[res.resource_type]}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5">
                {res.author
                  ? <>by <Link href={`/profile/${res.author.id}`} className="font-semibold text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400">{res.author.full_name}</Link></>
                  : 'by a MAJUite'}
                {' · '}{formatDate(res.created_at)}
              </p>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap mt-4">{res.description}</p>

          {/* Tags */}
          {(res.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {res.tags!.map((t) => (
                <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium">{t}</span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
            <div className="flex items-center gap-2">
              {res.url && (
                <a href={res.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors">
                  <ExternalLink size={14} /> Open resource
                </a>
              )}
              <HelpfulButton kind="resource" targetId={res.id} userId={me!.id} initialCount={res.helpful_count} initialMarked={!!res.i_found_helpful} />
            </div>
            {isOwner && (
              <div className="flex items-center gap-2">
                <Link href={`/interview-prep/resources/new?id=${res.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                  <Edit2 size={12} /> Edit
                </Link>
                <button onClick={handleDelete} disabled={deleting}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900 px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
