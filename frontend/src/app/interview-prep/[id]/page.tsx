'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, InterviewExperience } from '@/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, OUTCOME_LABELS, OUTCOME_COLORS } from '@/types';
import { AppNav } from '@/components/AppNav';
import { HelpfulButton } from '@/components/HelpfulButton';
import {
  Loader2, ArrowLeft, Building2, Layers, Edit2, Trash2,
  MessageCircle, ListChecks, MessageSquareQuote, Lightbulb, Users,
} from 'lucide-react';

export default function ExperienceDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const supabase = createClient();

  const [me, setMe]           = useState<Profile | null>(null);
  const [exp, setExp]         = useState<InterviewExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: profile }, { data: e }, { data: mark }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('interview_experiences_feed')
          .select('*')
          .eq('id', id).single(),
        supabase.from('interview_experience_helpful')
          .select('experience_id').eq('experience_id', id).eq('user_id', user.id).maybeSingle(),
      ]);

      if (!e) { router.push('/interview-prep'); return; }
      setMe(profile as Profile);
      setExp({ ...(e as unknown as InterviewExperience), i_found_helpful: !!mark });
      setLoading(false);
    })();
  }, [id, router, supabase]);

  const handleDelete = async () => {
    if (!exp) return;
    if (!confirm('Delete this experience permanently? This cannot be undone.')) return;
    setDeleting(true);
    const { error } = await supabase.from('interview_experiences').delete().eq('id', exp.id);
    setDeleting(false);
    if (error) { alert(error.message); return; }
    router.push('/interview-prep');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!exp) return null;

  const isOwner = me?.id === exp.author_id;
  const showAuthor = !exp.is_anonymous && !!exp.author_id;
  const authorName = exp.is_anonymous
    ? `A ${exp.department || 'MAJU'} student`
    : exp.author_name ?? 'A MAJUite';
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={me?.full_name} userId={me?.id} />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <Link href="/interview-prep"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft size={15} /> Back to Interview Prep
        </Link>

        {/* ── Header card ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <Building2 size={22} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                {exp.role} <span className="font-normal text-slate-500 dark:text-zinc-400">at {exp.company}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[exp.difficulty]}`}>{DIFFICULTY_LABELS[exp.difficulty]}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${OUTCOME_COLORS[exp.outcome]}`}>{OUTCOME_LABELS[exp.outcome]}</span>
                {exp.num_rounds ? <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1"><Layers size={11} /> {exp.num_rounds} round{exp.num_rounds > 1 ? 's' : ''}</span> : null}
                {exp.interview_date && <span className="text-[11px] text-slate-400 dark:text-zinc-500">{exp.interview_date}</span>}
              </div>
            </div>
          </div>

          {/* Author + actions */}
          <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {showAuthor
                ? <>Shared by <Link href={`/profile/${exp.author_id}`} className="font-semibold text-slate-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400">{authorName}</Link>{exp.author_batch_year ? ` · Batch ${exp.author_batch_year}` : ''}</>
                : authorName}
              {' · '}{formatDate(exp.created_at)}
            </p>
            <div className="flex items-center gap-2">
              <HelpfulButton kind="experience" targetId={exp.id} userId={me!.id} initialCount={exp.helpful_count} initialMarked={!!exp.i_found_helpful} />
              {isOwner && (
                <>
                  <Link href={`/interview-prep/new?id=${exp.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                    <Edit2 size={12} /> Edit
                  </Link>
                  <button onClick={handleDelete} disabled={deleting}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900 px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-60">
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Process ── */}
        <Section icon={<ListChecks size={16} className="text-indigo-500 dark:text-indigo-400" />} title="The process">
          {exp.process}
        </Section>

        {/* ── Questions ── */}
        <Section icon={<MessageSquareQuote size={16} className="text-indigo-500 dark:text-indigo-400" />} title="Questions asked">
          {exp.questions}
        </Section>

        {/* ── Tips ── */}
        {exp.tips && (
          <Section icon={<Lightbulb size={16} className="text-amber-500" />} title="Tips for juniors">
            {exp.tips}
          </Section>
        )}

        {/* ── Tags ── */}
        {(exp.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {exp.tags!.map((t) => (
              <span key={t} className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium">{t}</span>
            ))}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
          <h2 className="font-bold text-base mb-1">Targeting {exp.company}?</h2>
          <p className="text-indigo-200 text-sm mb-4 leading-relaxed">
            Connect with MAJU alumni who can refer you — or message the person who shared this.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/alumni"
              className="flex items-center gap-2 text-sm font-semibold bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2.5 rounded-xl transition-colors">
              <Users size={14} /> Browse alumni
            </Link>
            {showAuthor && !isOwner && (
              <Link href={`/messages?with=${exp.author_id}`}
                className="flex items-center gap-2 text-sm font-semibold bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl transition-colors border border-white/20">
                <MessageCircle size={14} /> Message {(exp.author_name ?? '').split(' ')[0]}
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide">{title}</h2>
      </div>
      <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{children}</p>
    </div>
  );
}
