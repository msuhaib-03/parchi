'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { Building2, Briefcase, Link2, X, Loader2, CheckCircle } from 'lucide-react';

const inputCls = 'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    bio: '',
    linkedin_url: '',
    // Alumni
    current_company: '',
    job_title: '',
    is_open_to_referrals: true,
    // Student
    skills: [] as string[],
    graduation_year: new Date().getFullYear() + 1,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!data) { router.push('/login'); return; }

      const p = data as Profile;
      setProfile(p);

      // Pre-fill whatever already exists
      setForm({
        bio: p.bio ?? '',
        linkedin_url: p.linkedin_url ?? '',
        current_company: p.current_company ?? '',
        job_title: p.job_title ?? '',
        is_open_to_referrals: p.is_open_to_referrals ?? true,
        skills: p.skills ?? [],
        graduation_year: p.graduation_year ?? new Date().getFullYear() + 1,
      });

      setLoading(false);
    })();
  }, [supabase, router]);

  const addSkill = () => {
    const t = skillInput.trim();
    if (!t || form.skills.includes(t)) return;
    setForm((f) => ({ ...f, skills: [...f.skills, t] }));
    setSkillInput('');
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError('');

    const updates: Record<string, unknown> = {
      bio: form.bio || null,
      linkedin_url: form.linkedin_url || null,
      updated_at: new Date().toISOString(),
    };

    if (profile.role === 'alumni') {
      if (!form.current_company.trim()) {
        setError('Please enter your current company.');
        setSaving(false);
        return;
      }
      updates.current_company = form.current_company;
      updates.job_title = form.job_title || null;
      updates.is_open_to_referrals = form.is_open_to_referrals;
    } else {
      updates.skills = form.skills;
      updates.graduation_year = form.graduation_year || null;
    }

    const { error: err } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  const isAlumni = profile?.role === 'alumni';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{isAlumni ? '💼' : '🎓'}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAlumni ? 'Set up your alumni profile' : 'Complete your profile'}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {isAlumni
              ? 'Help juniors find you and request referrals'
              : 'Help alumni know who you are and what you\'re looking for'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">

          {/* ── Alumni Fields ─────────────────────────────────────────────── */}
          {isAlumni && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Current Company <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.current_company}
                    onChange={(e) => setForm((f) => ({ ...f, current_company: e.target.value }))}
                    placeholder="e.g. Systems Limited, Arbisoft, Unilever…"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
                <div className="relative">
                  <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.job_title}
                    onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                    placeholder="e.g. Software Engineer, Product Manager…"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>

              {/* Open to referrals */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative mt-0.5">
                    <input type="checkbox" className="sr-only"
                      checked={form.is_open_to_referrals}
                      onChange={(e) => setForm((f) => ({ ...f, is_open_to_referrals: e.target.checked }))}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${form.is_open_to_referrals ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_open_to_referrals ? 'translate-x-5' : ''}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Open to referrals</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Juniors will be able to send you referral requests. You can change this anytime.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* ── Student Fields ────────────────────────────────────────────── */}
          {!isAlumni && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Graduation Year</label>
                <input
                  type="number"
                  value={form.graduation_year}
                  onChange={(e) => setForm((f) => ({ ...f, graduation_year: parseInt(e.target.value) || 0 }))}
                  placeholder="e.g. 2026"
                  min={2024} max={2035}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Skills</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="e.g. React, Python, Figma… press Enter"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={addSkill}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {form.skills.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                      {s}
                      <button onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))}>
                        <X size={12} className="text-indigo-400 hover:text-indigo-700" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Shared Fields ─────────────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bio <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder={isAlumni
                ? 'Tell juniors about your journey and what kind of help you can offer…'
                : 'Tell seniors about yourself and what you\'re looking for…'}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              LinkedIn <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.linkedin_url}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/yourprofile"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {saving ? 'Saving…' : 'Complete profile →'}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
