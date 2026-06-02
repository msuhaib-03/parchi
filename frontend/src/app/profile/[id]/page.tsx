'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { DEPARTMENTS } from '@/types';
import {
  ArrowLeft, Edit2, Save, X, LogOut, Briefcase, Link2,
  GraduationCap, Building2, CheckCircle, Plus, Trash2,
  ExternalLink, MessageCircle, Send, Loader2
} from 'lucide-react';

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState<Partial<Profile>>({});

  const isOwn = currentUserId === id;
  const isAlumni = profile?.role === 'alumni';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) { router.push('/dashboard'); return; }
      setProfile(data as Profile);
      setForm(data as Profile);
      setLoading(false);
    })();
  }, [id, supabase, router]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        bio: form.bio,
        department: form.department,
        batch_year: form.batch_year,
        linkedin_url: form.linkedin_url,
        current_company: form.current_company,
        job_title: form.job_title,
        is_open_to_referrals: form.is_open_to_referrals,
        skills: form.skills,
        graduation_year: form.graduation_year,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);

    if (error) { setError(error.message); return; }
    setProfile(data as Profile);
    setForm(data as Profile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm(profile!);
    setIsEditing(false);
    setError('');
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/');
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || form.skills?.includes(trimmed)) return;
    setForm((f) => ({ ...f, skills: [...(f.skills ?? []), trimmed] }));
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skills: f.skills?.filter((s) => s !== skill) }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* ─── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">
            {isOwn ? 'My Profile' : `${profile.full_name.split(' ')[0]}'s Profile`}
          </span>
          <div className="flex items-center gap-2">
            {isOwn && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                  Logout
                </button>
              </>
            )}
            {isOwn && isEditing && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ─── Error ───────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {/* ─── Hero Card ───────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 transition-colors">
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
                  className={`${inputCls} text-lg font-bold mb-2`}
                  placeholder="Full name"
                />
              ) : (
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.full_name}</h1>
              )}

              {/* Role badge */}
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full mt-1 ${
                isAlumni
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                  : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              }`}>
                {isAlumni ? '💼 Alumni' : '🎓 Student'}
              </span>

              {/* Alumni: company + job title */}
              {isAlumni && (
                <div className="mt-3 space-y-2">
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={form.current_company ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))}
                          placeholder="Company"
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                      <div className="relative">
                        <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={form.job_title ?? ''}
                          onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                          placeholder="Job title"
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                    </div>
                  ) : (
                    profile.current_company && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mt-2">
                        <Building2 size={14} className="text-gray-400 dark:text-gray-500" />
                        <span className="font-medium">{profile.job_title}</span>
                        <span className="text-gray-400">@</span>
                        <span>{profile.current_company}</span>
                      </p>
                    )
                  )}

                  {/* Open to referrals toggle */}
                  {isEditing ? (
                    <label className="flex items-center gap-3 cursor-pointer mt-2">
                      <div className="relative">
                        <input type="checkbox" className="sr-only"
                          checked={form.is_open_to_referrals ?? false}
                          onChange={(e) => setForm((f) => ({ ...f, is_open_to_referrals: e.target.checked }))}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${form.is_open_to_referrals ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_open_to_referrals ? 'translate-x-5' : ''}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Open to referrals</span>
                    </label>
                  ) : (
                    profile.is_open_to_referrals && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800 mt-1">
                        <CheckCircle size={11} /> Open to referrals
                      </span>
                    )
                  )}
                </div>
              )}

              {/* Student: graduation year */}
              {!isAlumni && (
                <div className="mt-2">
                  {isEditing ? (
                    <input
                      type="number"
                      value={form.graduation_year ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, graduation_year: parseInt(e.target.value) || undefined }))}
                      placeholder="Graduation year (e.g. 2026)"
                      className={`${inputCls} mt-2`}
                      min={2020} max={2035}
                    />
                  ) : (
                    profile.graduation_year && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-gray-400 dark:text-gray-500" />
                        Graduating {profile.graduation_year}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dept + batch row */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-3">
            {isEditing ? (
              <>
                <select
                  value={form.department ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  className={`${inputCls} flex-1 min-w-[180px]`}
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                  type="number"
                  value={form.batch_year ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, batch_year: parseInt(e.target.value) || 0 }))}
                  placeholder="Batch year"
                  className={`${inputCls} w-32`}
                  min={2000} max={2035}
                />
              </>
            ) : (
              <>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                  {profile.department}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                  Batch {profile.batch_year}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ─── LinkedIn + Actions ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-wrap gap-3 items-center transition-colors">
          {isEditing ? (
            <div className="relative flex-1 min-w-[200px]">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.linkedin_url ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/yourname"
                className={`${inputCls} pl-9`}
              />
            </div>
          ) : (
            <>
              {profile.linkedin_url ? (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800 transition-colors"
                >
                  <ExternalLink size={14} /> LinkedIn
                </a>
              ) : isOwn ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <Plus size={14} /> Add LinkedIn
                </button>
              ) : null}

              {/* Message button (not own profile) */}
              {!isOwn && (
                <Link
                  href={`/messages?with=${profile.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <MessageCircle size={14} /> Message
                </Link>
              )}

              {/* Request referral (not own, is alumni, open to referrals) */}
              {!isOwn && isAlumni && profile.is_open_to_referrals && (
                <Link
                  href={`/alumni?request=${profile.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors"
                >
                  <Send size={14} /> Request Referral
                </Link>
              )}
            </>
          )}
        </div>

        {/* ─── Bio ─────────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">About</h2>
          {isEditing ? (
            <>
              <textarea
                value={form.bio ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder={isAlumni
                  ? "Tell juniors about yourself, your experience, and what kind of referrals you can help with…"
                  : "Tell seniors about yourself, your skills, and what you're looking for…"}
                rows={4}
                maxLength={500}
                className={`${inputCls} resize-none`}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{(form.bio ?? '').length}/500</p>
            </>
          ) : (
            profile.bio ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                {isOwn ? 'No bio yet — click Edit to add one.' : 'No bio yet.'}
              </p>
            )
          )}
        </div>

        {/* ─── Skills (students) ────────────────────────────────────────────────── */}
        {(!isAlumni || isEditing) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Skills</h2>
            {isEditing ? (
              <>
                <div className="flex gap-2 mb-3">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Type a skill and press Enter"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(form.skills ?? []).map((skill) => (
                    <span key={skill} className="flex items-center gap-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              (profile.skills?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills!.map((skill) => (
                    <span key={skill} className="text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  {isOwn ? 'No skills added yet — click Edit to add some.' : 'No skills listed.'}
                </p>
              )
            )}
          </div>
        )}

        {/* ─── Danger Zone (own profile only) ──────────────────────────────────── */}
        {isOwn && !isEditing && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/50 p-5 transition-colors">
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Account</h2>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 transition-colors w-full justify-center"
            >
              {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {loggingOut ? 'Logging out…' : 'Log out of Parchi'}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
