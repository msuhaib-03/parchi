'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { DEPARTMENTS, validateMajuId } from '@/types';
import {
  Edit2, Save, X, Briefcase, Link2,
  GraduationCap, Building2, CheckCircle, Plus,
  ExternalLink, MessageCircle, Send, Loader2,
  GitBranch, Globe, BadgeCheck, BookOpen,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { ProfileCompletionCard } from '@/components/ProfileCompletionCard';
import { calculateCompletion } from '@/lib/profileCompletion';
import { cn } from '@/lib/utils';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();

  const [profile, setProfile]         = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [idError, setIdError]         = useState('');
  const [skillInput, setSkillInput]   = useState('');

  const [form, setForm] = useState<Partial<Profile>>({});

  const isOwn     = currentUserId === id;
  const isAlumni  = profile?.role === 'alumni';
  const isTeacher = profile?.role === 'teacher';
  const isAlumniOrTeacher = isAlumni || isTeacher;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);

      const { data, error: fetchErr } = await supabase
        .from('profiles').select('*').eq('id', id).single();

      if (fetchErr || !data) { router.push('/dashboard'); return; }
      setProfile(data as Profile);
      setForm(data as Profile);
      setLoading(false);
    })();
  }, [id, supabase, router]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');
    setIdError('');

    // Validate MAJU ID format if provided
    if (form.student_id?.trim()) {
      if (!validateMajuId(form.student_id.trim())) {
        setIdError('Invalid format. Use: FA22-BSCS-0114 (semester-dept-number)');
        setSaving(false);
        return;
      }
    }

    // Step 1 — core fields (always present in schema)
    const { data, error: coreErr } = await supabase
      .from('profiles')
      .update({
        full_name:            form.full_name,
        bio:                  form.bio,
        department:           form.department,
        batch_year:           form.batch_year,
        linkedin_url:         form.linkedin_url,
        current_company:      form.current_company,
        job_title:            form.job_title,
        is_open_to_referrals: form.is_open_to_referrals,
        skills:               form.skills,
        graduation_year:      form.graduation_year,
        student_id:           form.student_id?.trim() || null,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);
    if (coreErr) { setError(coreErr.message); return; }

    // Step 2 — extended links (require supabase_migration.sql)
    const needsLinks =
      form.github_url    !== profile.github_url ||
      form.portfolio_url !== profile.portfolio_url;

    if (needsLinks) {
      const { error: linksErr } = await supabase
        .from('profiles')
        .update({ github_url: form.github_url ?? null, portfolio_url: form.portfolio_url ?? null })
        .eq('id', profile.id);

      if (linksErr) {
        setError(
          '⚠️ GitHub & Portfolio fields need a one-time DB migration. ' +
          'Run frontend/supabase_migration.sql in Supabase → SQL Editor, then save again.'
        );
        setProfile(data as Profile);
        setForm(data as Profile);
        setIsEditing(false);
        return;
      }
    }

    // Step 3 — further education (require supabase_migration_v2.sql)
    const needsEdu =
      form.further_edu_degree      !== profile.further_edu_degree ||
      form.further_edu_institution !== profile.further_edu_institution ||
      form.further_edu_since       !== profile.further_edu_since;

    if (needsEdu) {
      const { error: eduErr } = await supabase
        .from('profiles')
        .update({
          further_edu_degree:      form.further_edu_degree      ?? null,
          further_edu_institution: form.further_edu_institution ?? null,
          further_edu_since:       form.further_edu_since       ?? null,
        })
        .eq('id', profile.id);

      if (eduErr) {
        setError(
          '⚠️ Further education fields need a one-time DB migration. ' +
          'Run frontend/supabase_migration_v2.sql in Supabase → SQL Editor, then save again.'
        );
        setProfile(data as Profile);
        setForm(data as Profile);
        setIsEditing(false);
        return;
      }
    }

    // Merge the freshest data (step 2+3 updated in place, refetch to be safe)
    const { data: fresh } = await supabase
      .from('profiles').select('*').eq('id', profile.id).single();

    const final = (fresh ?? data) as Profile;
    setProfile(final);
    setForm(final);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm(profile!);
    setIsEditing(false);
    setError('');
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || form.skills?.includes(trimmed)) return;
    setForm((f) => ({ ...f, skills: [...(f.skills ?? []), trimmed] }));
    setSkillInput('');
  };

  const removeSkill = (s: string) =>
    setForm((f) => ({ ...f, skills: f.skills?.filter((x) => x !== s) }));

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!profile) return null;

  const completion = calculateCompletion(form as Profile);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
      <AppNav userName={profile.full_name} userId={currentUserId ?? undefined} />

      {/* ── Edit / Save toolbar ────────────────────────────────────────────── */}
      {isOwn && (
        <div className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 transition-colors">
          <div className="max-w-3xl mx-auto px-4 h-11 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {isEditing ? 'Editing profile' : 'My Profile'}
            </span>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-1.5 rounded-lg transition-colors">
                  <Edit2 size={13} /> Edit profile
                </button>
              ) : (
                <>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 px-3 py-1.5 rounded-lg transition-colors">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={handleCancel}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors">
                    <X size={13} /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* ── Profile Completion Card (owner only, in both view + edit mode) ─── */}
        {isOwn && (
          <ProfileCompletionCard
            completion={completion}
            onEdit={() => setIsEditing(true)}
          />
        )}

        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6 transition-colors">
          <div className="flex items-start gap-5">

            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shrink-0 shadow-md">
              {profile.full_name?.[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  value={form.full_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className={cn(inputCls, 'text-lg font-bold mb-2')}
                  placeholder="Full name"
                />
              ) : (
                <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">{profile.full_name}</h1>
              )}

              {/* Role badge */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${
                isAlumni
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : isTeacher
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              }`}>
                {isAlumni ? <Briefcase size={11} /> : isTeacher ? <BookOpen size={11} /> : <GraduationCap size={11} />}
                {isAlumni ? 'Alumni' : isTeacher ? 'Faculty' : 'Student'}
              </span>

              {/* ── Alumni / Teacher work info ─────────────────────────── */}
              {isAlumniOrTeacher && (
                <div className="mt-3 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      {/* Company (alumni) or title (teacher) */}
                      {isAlumni && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                            <input value={form.current_company ?? ''} onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))} placeholder="Company" className={cn(inputCls, 'pl-9')} />
                          </div>
                          <div className="relative">
                            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                            <input value={form.job_title ?? ''} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} placeholder="Job title" className={cn(inputCls, 'pl-9')} />
                          </div>
                        </div>
                      )}
                      {isTeacher && (
                        <div className="relative">
                          <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                          <input value={form.job_title ?? ''} onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Assistant Professor, Lecturer" className={cn(inputCls, 'pl-9')} />
                        </div>
                      )}

                      {/* ── Further Education ──────────────────────────── */}
                      <div className="border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-3 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={11} /> Further Education (MS, MBA, PhD… — optional)
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            value={form.further_edu_degree ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, further_edu_degree: e.target.value }))}
                            placeholder="Degree (e.g. MS CS)"
                            className={cn(inputCls, 'col-span-2')}
                          />
                          <input
                            value={form.further_edu_since ?? ''}
                            onChange={(e) => setForm((f) => ({ ...f, further_edu_since: e.target.value }))}
                            placeholder="Since (e.g. 2024)"
                            className={inputCls}
                          />
                        </div>
                        <input
                          value={form.further_edu_institution ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, further_edu_institution: e.target.value }))}
                          placeholder="Institution (e.g. FAST-NU, NED, LUMS, IBA)"
                          className={inputCls}
                        />
                      </div>

                      {/* Referrals toggle (alumni only) */}
                      {isAlumni && (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={form.is_open_to_referrals ?? false} onChange={(e) => setForm((f) => ({ ...f, is_open_to_referrals: e.target.checked }))} />
                            <div className={`w-11 h-6 rounded-full transition-colors ${form.is_open_to_referrals ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_open_to_referrals ? 'translate-x-5' : ''}`} />
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Open to referrals</span>
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      {/* Work line */}
                      {(profile.job_title || profile.current_company) && (
                        <p className="text-sm text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                          {profile.job_title && <span className="font-medium">{profile.job_title}</span>}
                          {profile.job_title && profile.current_company && <span className="text-slate-300 dark:text-zinc-600">·</span>}
                          {profile.current_company && <span>{profile.current_company}</span>}
                        </p>
                      )}
                      {/* Further education line */}
                      {profile.further_edu_degree && (
                        <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <BookOpen size={13} className="text-indigo-400 dark:text-indigo-500 shrink-0" />
                          <span className="font-medium text-slate-600 dark:text-zinc-300">
                            {profile.further_edu_degree}
                          </span>
                          {profile.further_edu_institution && (
                            <><span className="text-slate-300 dark:text-zinc-600">at</span> {profile.further_edu_institution}</>
                          )}
                          {profile.further_edu_since && (
                            <span className="text-slate-400 dark:text-zinc-500 text-xs">· since {profile.further_edu_since}</span>
                          )}
                        </p>
                      )}
                      {/* Open to referrals badge */}
                      {isAlumni && profile.is_open_to_referrals && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                          <CheckCircle size={11} /> Open to referrals
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Student graduation year ────────────────────────────── */}
              {!isAlumniOrTeacher && (
                <div className="mt-2">
                  {isEditing ? (
                    <input type="number"
                      value={form.graduation_year ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, graduation_year: parseInt(e.target.value) || undefined }))}
                      placeholder="Expected graduation year (e.g. 2026)"
                      className={cn(inputCls, 'mt-2')}
                      min={2020} max={2035}
                    />
                  ) : (
                    profile.graduation_year && (
                      <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                        <GraduationCap size={13} className="text-slate-400 dark:text-zinc-500" />
                        Graduating {profile.graduation_year}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Department + batch */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <select
                  value={form.department ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className={cn(inputCls, 'flex-1 min-w-[180px]')}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="number"
                  value={form.batch_year ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, batch_year: parseInt(e.target.value) || 0 }))}
                  placeholder="Batch year"
                  className={cn(inputCls, 'w-28')}
                  min={2000} max={2035}
                />
              </>
            ) : (
              <>
                {profile.department && (
                  <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-3 py-1 rounded-full font-medium">
                    {profile.department}
                  </span>
                )}
                {profile.batch_year > 0 && (
                  <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-3 py-1 rounded-full font-medium">
                    Batch {profile.batch_year}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Links + Actions ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
          {isEditing ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1">Links</h2>
              <div className="relative">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.linkedin_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/yourname" className={cn(inputCls, 'pl-9')} />
              </div>
              <div className="relative">
                <GitBranch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.github_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, github_url: e.target.value }))} placeholder="https://github.com/yourusername" className={cn(inputCls, 'pl-9')} />
              </div>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input value={form.portfolio_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://yourportfolio.com" className={cn(inputCls, 'pl-9')} />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {/* LinkedIn */}
              {profile.linkedin_url ? (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800 transition-colors">
                  <ExternalLink size={14} /> LinkedIn
                </a>
              ) : isOwn ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:border-slate-300 transition-colors">
                  <Plus size={14} /> Add LinkedIn
                </button>
              ) : null}

              {/* GitHub */}
              {profile.github_url ? (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors">
                  <GitBranch size={14} /> GitHub
                </a>
              ) : isOwn ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:border-slate-300 transition-colors">
                  <Plus size={14} /> Add GitHub
                </button>
              ) : null}

              {/* Portfolio */}
              {profile.portfolio_url ? (
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800 transition-colors">
                  <Globe size={14} /> Portfolio
                </a>
              ) : isOwn ? (
                <button onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:border-slate-300 transition-colors">
                  <Plus size={14} /> Add Portfolio
                </button>
              ) : null}

              {!isOwn && (profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
                <div className="w-px h-6 bg-slate-100 dark:bg-zinc-800 mx-1 shrink-0" />
              )}

              {!isOwn && (
                <Link href={`/messages?with=${profile.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 transition-colors">
                  <MessageCircle size={14} /> Message
                </Link>
              )}
              {!isOwn && isAlumni && profile.is_open_to_referrals && (
                <Link href={`/alumni?request=${profile.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors">
                  <Send size={14} /> Request Referral
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ── MAJU ID (owner only — always shown so they can add/edit it) ─────── */}
        {isOwn && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">MAJU ID</h2>
              {profile.student_id && !isEditing && (
                <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                  Verified
                </span>
              )}
            </div>

            {isEditing ? (
              <div>
                <div className="relative">
                  <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    value={form.student_id ?? ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, student_id: e.target.value }));
                      setIdError('');
                    }}
                    placeholder={isAlumni ? 'e.g. FA19-BSCS-0047' : 'e.g. FA22-BSCS-0114'}
                    className={cn(
                      inputCls, 'pl-9 font-mono',
                      idError ? 'border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800' : ''
                    )}
                  />
                </div>
                {idError ? (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">{idError}</p>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1.5">
                    Format: <span className="font-mono">FA22-BSCS-0114</span> · semester · department · roll number
                  </p>
                )}
              </div>
            ) : profile.student_id ? (
              <div className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="font-mono text-sm text-slate-700 dark:text-zinc-300 tracking-wide">
                  {profile.student_id}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm text-slate-400 dark:text-zinc-500 border border-dashed border-slate-200 dark:border-zinc-700 px-4 py-2 rounded-xl hover:border-slate-300 dark:hover:border-zinc-600 transition-colors"
              >
                <Plus size={14} /> Add your MAJU ID
              </button>
            )}
          </div>
        )}

        {/* ── Bio ───────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-3">About</h2>
          {isEditing ? (
            <>
              <textarea
                value={form.bio ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder={
                  isAlumni
                    ? 'Tell juniors about your experience, what companies you can refer to, and advice for landing a job…'
                    : isTeacher
                    ? 'Share your research interests, courses you teach, and advice for students…'
                    : 'Tell seniors about yourself, your skills, and what you\'re looking to achieve…'
                }
                rows={4} maxLength={500}
                className={cn(inputCls, 'resize-none')}
              />
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 text-right">
                {(form.bio ?? '').length}/500
                {(form.bio?.trim().length ?? 0) < 50 && (
                  <span className="ml-2 text-amber-500">· {50 - (form.bio?.trim().length ?? 0)} more chars for completion</span>
                )}
              </p>
            </>
          ) : (
            profile.bio
              ? <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">{profile.bio}</p>
              : <p className="text-sm text-slate-400 dark:text-zinc-500 italic">
                  {isOwn ? 'No bio yet — click Edit to add one.' : 'No bio yet.'}
                </p>
          )}
        </div>

        {/* ── Skills ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Skills</h2>
            {(profile.skills?.length ?? 0) > 0 && !isEditing && (
              <span className="text-xs text-slate-400 dark:text-zinc-500">{profile.skills!.length} skill{profile.skills!.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          {isEditing ? (
            <>
              <div className="flex gap-2 mb-3">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Type a skill and press Enter"
                  className={cn(inputCls, 'flex-1')}
                />
                <button type="button" onClick={addSkill}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.skills ?? []).map((skill) => (
                  <span key={skill} className="flex items-center gap-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              {(form.skills?.length ?? 0) < 3 && (
                <p className="text-xs text-amber-500 dark:text-amber-400 mt-2">
                  Add {3 - (form.skills?.length ?? 0)} more skill{(3 - (form.skills?.length ?? 0)) !== 1 ? 's' : ''} to unlock completion points
                </p>
              )}
            </>
          ) : (
            (profile.skills?.length ?? 0) > 0
              ? <div className="flex flex-wrap gap-2">
                  {profile.skills!.map((skill) => (
                    <span key={skill} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-semibold border border-indigo-100 dark:border-indigo-800">
                      {skill}
                    </span>
                  ))}
                </div>
              : <p className="text-sm text-slate-400 dark:text-zinc-500 italic">
                  {isOwn ? 'No skills added yet — click Edit to add some.' : 'No skills listed.'}
                </p>
          )}
        </div>

      </main>
    </div>
  );
}
