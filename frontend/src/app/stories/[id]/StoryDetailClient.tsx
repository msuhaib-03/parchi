'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SuccessStory } from '@/types';
import {
  CheckCircle, Share2, Download, Copy, Check,
  ArrowLeft, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function StoryDetailClient({ story }: { story: SuccessStory }) {
  const [copied, setCopied] = useState(false);

  const displayName = story.is_anonymous
    ? `A ${story.department || 'MAJU'} Student`
    : story.user?.full_name ?? '—';

  const batchShort = (story.batch_year ?? story.user?.batch_year)
    ? `'${String(story.batch_year ?? story.user?.batch_year).slice(-2)}`
    : '';

  const dept = story.department ?? story.user?.department ?? '';

  const ogParams = new URLSearchParams({
    company: story.company,
    role:    story.role,
    name:    story.user?.full_name ?? '',
    dept,
    batch:   String(story.batch_year ?? story.user?.batch_year ?? ''),
    ref:     story.referred_by?.full_name ?? '',
    anon:    story.is_anonymous ? '1' : '0',
  });
  const ogUrl     = `/api/og?${ogParams}`;
  const storyUrl  = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `I got placed at ${story.company} as ${story.role} via Parchi — MAJU's alumni referral platform! 🎉`;

  const copyLink = () => {
    navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () =>
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyUrl)}`, '_blank');

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${storyUrl}`)}`, '_blank');

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">

      {/* Simple top nav bar */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/stories" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <ArrowLeft size={15} /> Stories
          </Link>
          <Link href="/dashboard" className="text-base font-bold text-indigo-600">
            Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
          </Link>
          <div className="w-20" /> {/* spacer */}
        </div>
      </div>

      <main className="max-w-xl mx-auto px-4 py-10 space-y-6">

        {/* ── The Card ─────────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-8 text-white relative overflow-hidden shadow-2xl">
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/20 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-purple-500/15 translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 text-center">
            {/* Check badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={28} className="text-emerald-400" />
            </div>

            <p className="text-purple-300/60 text-[10px] uppercase tracking-[5px] mb-3">Got placed at</p>

            <h1 className="font-black text-3xl leading-tight mb-3">{story.company}</h1>
            <p className="text-indigo-200/75 text-lg mb-8">
              as <span className="font-semibold text-indigo-200">{story.role}</span>
            </p>

            <div className="w-12 h-px bg-indigo-500/40 mx-auto mb-6" />

            <p className="font-bold text-xl text-white/90">{displayName}</p>
            {(dept || batchShort) && (
              <p className="text-indigo-300/55 text-sm mt-1">
                {dept}{dept && batchShort ? ' · ' : ''}MAJU {batchShort}
              </p>
            )}

            {story.referred_by && (
              <div className="mt-4">
                <p className="text-emerald-400/70 text-sm">
                  Referred by{' '}
                  <Link href={`/profile/${story.referred_by.id}`}
                    className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                    {story.referred_by.full_name}
                  </Link>
                </p>
                {story.referred_by.job_title && (
                  <p className="text-white/30 text-xs mt-0.5">
                    {story.referred_by.job_title}
                    {story.referred_by.current_company ? ` @ ${story.referred_by.current_company}` : ''}
                  </p>
                )}
              </div>
            )}

            {story.message && (
              <blockquote className="mt-6 pt-6 border-t border-white/10 text-white/55 text-sm leading-relaxed italic max-w-xs mx-auto">
                &ldquo;{story.message}&rdquo;
              </blockquote>
            )}

            <div className="mt-6 pt-5 border-t border-white/10">
              <p className="text-indigo-400/40 text-[10px] tracking-[3px] uppercase">
                Parchi · MAJU Alumni Network
              </p>
              <p className="text-white/20 text-[10px] mt-1">{formatDate(story.created_at)}</p>
            </div>
          </div>
        </div>

        {/* ── Share actions ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 space-y-4 transition-colors">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Share this story</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareLinkedIn}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] py-2.5 rounded-xl transition-colors"
            >
              <Share2 size={14} /> LinkedIn
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] py-2.5 rounded-xl transition-colors"
            >
              <Share2 size={14} /> WhatsApp
            </button>
            <a
              href={ogUrl}
              download={`parchi-${story.company.toLowerCase().replace(/\s+/g, '-')}.png`}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 py-2.5 rounded-xl transition-colors"
            >
              <Download size={14} /> Download card
            </a>
            <button
              onClick={copyLink}
              className={cn(
                'flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl border transition-colors',
                copied
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800'
              )}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>

        {/* ── CTA for visitors ──────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white text-center">
          <h2 className="font-bold text-lg mb-2">Got placed via a MAJU referral?</h2>
          <p className="text-indigo-200 text-sm mb-5 leading-relaxed">
            Share your story and inspire the next batch of MAJUites.
            Every referral starts with a connection on Parchi.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/stories"
              className="flex items-center gap-2 text-sm font-semibold bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 rounded-xl transition-colors"
            >
              <ExternalLink size={14} /> View all stories
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 text-sm font-semibold bg-white/15 hover:bg-white/25 text-white px-5 py-2.5 rounded-xl transition-colors border border-white/20"
            >
              Join Parchi free
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
