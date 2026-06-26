'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, ResourceType, PrepResourceFormData } from '@/types';
import { RESOURCE_TYPE_LABELS } from '@/types';
import { AppNav } from '@/components/AppNav';
import { Loader2, ArrowLeft, BookOpen, Link2, Tag } from 'lucide-react';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const labelCls = 'block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5';

function NewResourceInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const editId       = searchParams.get('id');
  const supabase     = createClient();

  const [me, setMe]               = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [tagInput, setTagInput]   = useState('');

  const [form, setForm] = useState<PrepResourceFormData>({
    title: '', resource_type: 'guide', url: '', description: '', tags: [],
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      // Only alumni & faculty can post resources (mirrors the RLS policy).
      if (!profile || (profile.role !== 'alumni' && profile.role !== 'teacher')) {
        router.push('/interview-prep?tab=resources');
        return;
      }
      setMe(profile as Profile);

      if (editId) {
        const { data: res } = await supabase.from('prep_resources').select('*').eq('id', editId).single();
        if (!res) { router.push('/interview-prep?tab=resources'); return; }
        if (res.author_id !== user.id) { router.push(`/interview-prep/resources/${editId}`); return; }
        setForm({
          title: res.title, resource_type: res.resource_type, url: res.url ?? '',
          description: res.description, tags: res.tags ?? [],
        });
      }
      setLoading(false);
    })();
  }, [router, supabase, editId]);

  const update = <K extends keyof PrepResourceFormData>(field: K, value: PrepResourceFormData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags?.includes(t)) return;
    update('tags', [...(form.tags ?? []), t]);
    setTagInput('');
  };
  const removeTag = (tag: string) => update('tags', form.tags?.filter((t) => t !== tag) ?? []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim())       { setError('Title is required.'); return; }
    if (!form.description.trim()) { setError('Please add a description.'); return; }

    setSubmitting(true);
    const payload = {
      title:         form.title.trim(),
      resource_type: form.resource_type,
      url:           form.url?.trim() || null,
      description:   form.description.trim(),
      tags:          form.tags?.length ? form.tags : null,
    };

    if (editId) {
      const { error: upErr } = await supabase.from('prep_resources').update(payload).eq('id', editId);
      setSubmitting(false);
      if (upErr) { setError(upErr.message); return; }
      router.push(`/interview-prep/resources/${editId}`);
    } else {
      const { data, error: insErr } = await supabase.from('prep_resources')
        .insert({ ...payload, author_id: me!.id }).select('id').single();
      setSubmitting(false);
      if (insErr || !data) { setError(insErr?.message ?? 'Could not save.'); return; }
      router.push(`/interview-prep/resources/${data.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/interview-prep?tab=resources"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to Resources
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-1">
          {editId ? 'Edit resource' : 'Add a prep resource'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Share a guide, question bank, cheatsheet, or anything that helps juniors prepare.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 space-y-5 transition-colors">

            {/* Title */}
            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.title} onChange={(e) => update('title', e.target.value)}
                  placeholder="e.g. DSA Patterns Cheat Sheet for FAANG-style interviews" required className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* Type */}
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.resource_type} onChange={(e) => update('resource_type', e.target.value as ResourceType)}
                className={inputCls}>
                {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</option>)}
              </select>
            </div>

            {/* URL */}
            <div>
              <label className={labelCls}>Link <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input type="url" value={form.url ?? ''} onChange={(e) => update('url', e.target.value)}
                  placeholder="https://… (Google Doc, YouTube, LeetCode list, etc.)" className={`${inputCls} pl-9`} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
                placeholder="What is it, who is it for, and how should they use it? You can paste the full guide here too."
                rows={6} required className={`${inputCls} resize-none`} />
            </div>

            {/* Tags */}
            <div>
              <label className={labelCls}>Topics / Tags <span className="text-xs text-slate-400 dark:text-zinc-500 font-normal">(optional)</span></label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="DSA, System Design, CV, HR… (Enter to add)" className={`${inputCls} pl-9`} />
                </div>
                <button type="button" onClick={addTag}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
                  Add
                </button>
              </div>
              {(form.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.tags!.map((tag) => (
                    <span key={tag} className="flex items-center gap-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)}
                        className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 font-bold leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Saving…' : editId ? 'Save changes' : 'Publish resource'}
            </button>
            <Link href="/interview-prep?tab=resources"
              className="px-6 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewResourcePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <NewResourceInner />
    </Suspense>
  );
}
