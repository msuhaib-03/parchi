'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import {
  X, CheckCircle, Share2, Download, Copy, Check,
  Loader2, ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  currentUser: Profile;
  /** Pre-filled from a referral request */
  prefill?: {
    referralId?: string;
    referredById?: string;
    referredByName?: string;
    company: string;
    role: string;
  };
}

type Step = 'form' | 'card';

export function SuccessStoryModal({ open, onClose, currentUser, prefill }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep]         = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied]     = useState(false);
  const [storyId, setStoryId]   = useState<string | null>(null);

  const [form, setForm] = useState({
    company:     prefill?.company ?? '',
    role:        prefill?.role    ?? '',
    message:     '',
    is_anonymous: false,
  });

  if (!open) return null;

  const ogParams = new URLSearchParams({
    company: form.company,
    role:    form.role,
    name:    currentUser.full_name,
    dept:    currentUser.department ?? '',
    batch:   String(currentUser.batch_year ?? ''),
    ref:     prefill?.referredByName ?? '',
    anon:    form.is_anonymous ? '1' : '0',
  });
  const ogUrl     = `/api/og?${ogParams}`;
  const storyUrl  = storyId ? `${window.location.origin}/stories/${storyId}` : '';
  const shareText = `I got placed at ${form.company} as ${form.role} via Parchi — MAJU's alumni-student network! 🎉`;

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.role.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        user_id:       currentUser.id,
        referral_id:   prefill?.referralId   ?? null,
        referred_by_id:prefill?.referredById ?? null,
        company:       form.company.trim(),
        role:          form.role.trim(),
        department:    currentUser.department,
        batch_year:    currentUser.batch_year,
        message:       form.message.trim() || null,
        is_anonymous:  form.is_anonymous,
      })
      .select('id')
      .single();

    setSubmitting(false);
    if (error || !data) return;

    setStoryId(data.id);
    setStep('card');
  };

  const copyLink = () => {
    if (!storyUrl) return;
    navigator.clipboard.writeText(storyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinkedIn = () => {
    if (!storyUrl) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(storyUrl)}`, '_blank');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\n\n${storyUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const displayName = form.is_anonymous
    ? `A ${currentUser.department || 'MAJU'} Student`
    : currentUser.full_name;

  const batchShort = currentUser.batch_year
    ? `'${String(currentUser.batch_year).slice(-2)}`
    : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden animate-fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {step === 'card' && (
                <button
                  onClick={() => setStep('form')}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors mr-1"
                >
                  ←
                </button>
              )}
              <CheckCircle size={18} className="text-emerald-500" />
              <span className="font-bold text-slate-900 dark:text-zinc-100 text-sm">
                {step === 'form' ? 'Share your win' : 'Your success card'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Step 1: Form ─────────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                Inspire juniors by sharing your placement. Your card will be visible on the
                Parchi Wall of Fame and shareable on LinkedIn &amp; WhatsApp.
              </p>

              {/* Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Company <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="e.g. Systems Limited"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Role / Position <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Junior Software Engineer"
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Your message{' '}
                  <span className="normal-case font-normal">(optional · {280 - form.message.length} chars left)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => {
                    if (e.target.value.length <= 280)
                      setForm((f) => ({ ...f, message: e.target.value }));
                  }}
                  placeholder="A short note of gratitude or advice for others who are starting out…"
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 resize-none"
                />
              </div>

              {/* Anonymous toggle */}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_anonymous: !f.is_anonymous }))}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors',
                  form.is_anonymous
                    ? 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                )}
              >
                {form.is_anonymous ? <EyeOff size={16} /> : <Eye size={16} />}
                <div className="text-left">
                  <p className="font-semibold">
                    {form.is_anonymous ? 'Posting anonymously' : 'Post with your name'}
                  </p>
                  <p className="text-xs opacity-70 font-normal mt-0.5">
                    {form.is_anonymous
                      ? 'Your name is hidden — shown as "A ' + (currentUser.department ?? 'MAJU') + ' Student"'
                      : 'Your full name and department will be visible on the card'}
                  </p>
                </div>
              </button>

              {/* Live mini-preview */}
              {form.company && form.role && (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-950 p-5 text-center text-white">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-indigo-300 text-[10px] uppercase tracking-widest mb-1">Got placed at</p>
                  <p className="font-black text-lg leading-tight">{form.company}</p>
                  <p className="text-indigo-200 text-xs mt-1">as {form.role}</p>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-indigo-300">
                    {displayName} · {currentUser.department} {batchShort}
                    {prefill?.referredByName && (
                      <> · Referred by {prefill.referredByName}</>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.company.trim() || !form.role.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ChevronRight size={16} />
                )}
                {submitting ? 'Publishing…' : 'Publish & get shareable card'}
              </button>
            </div>
          )}

          {/* ── Step 2: Shareable Card ───────────────────────────────────── */}
          {step === 'card' && (
            <div className="p-6 space-y-5">
              {/* Card preview (matches OG image) */}
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-8 text-center text-white relative">
                {/* Decorative orbs */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/20 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-purple-500/15 translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={22} className="text-emerald-400" />
                  </div>
                  <p className="text-purple-300/70 text-[10px] uppercase tracking-[4px] mb-2">Got placed at</p>
                  <h2 className="font-black text-2xl leading-tight mb-2">{form.company}</h2>
                  <p className="text-indigo-200/80 text-sm mb-5">as <span className="font-semibold text-indigo-200">{form.role}</span></p>

                  <div className="w-8 h-px bg-indigo-500/50 mx-auto mb-4" />

                  <p className="font-bold text-base text-white/90">{displayName}</p>
                  {(currentUser.department || batchShort) && (
                    <p className="text-indigo-300/60 text-xs mt-1">
                      {currentUser.department}{currentUser.department && batchShort ? ' · ' : ''}MAJU {batchShort}
                    </p>
                  )}
                  {prefill?.referredByName && (
                    <p className="text-emerald-400/70 text-xs mt-2">
                      Referred by {prefill.referredByName}
                    </p>
                  )}

                  {form.message && (
                    <p className="text-white/50 text-xs mt-4 italic leading-relaxed max-w-xs mx-auto">
                      &ldquo;{form.message}&rdquo;
                    </p>
                  )}

                  <div className="mt-5 pt-4 border-t border-white/10">
                    <p className="text-indigo-400/50 text-[10px] tracking-widest uppercase">
                      Parchi · MAJU Alumni Network
                    </p>
                  </div>
                </div>
              </div>

              {/* Share actions */}
              <div className="grid grid-cols-2 gap-2">
                {/* LinkedIn */}
                <button
                  onClick={shareLinkedIn}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#0A66C2] hover:bg-[#004182] py-2.5 rounded-xl transition-colors"
                >
                  <Share2 size={14} /> LinkedIn
                </button>

                {/* WhatsApp */}
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#25D366] hover:bg-[#128C7E] py-2.5 rounded-xl transition-colors"
                >
                  <Share2 size={14} /> WhatsApp
                </button>

                {/* Download image */}
                <a
                  href={ogUrl}
                  download={`parchi-${form.company.toLowerCase().replace(/\s+/g, '-')}.png`}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 py-2.5 rounded-xl transition-colors"
                >
                  <Download size={14} /> Download card
                </a>

                {/* Copy link */}
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

              {/* View full story */}
              {storyId && (
                <button
                  onClick={() => { onClose(); router.push(`/stories/${storyId}`); }}
                  className="w-full text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline text-center"
                >
                  View full story page →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
