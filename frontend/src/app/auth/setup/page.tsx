'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DEPARTMENTS, validateMajuId } from '@/types';
import { GraduationCap, Briefcase, BookOpen, BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const inputCls =
  'w-full py-2.5 px-4 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

type Role = 'student' | 'alumni' | 'teacher';

// Students are not allowed to sign up via Google OAuth — email + password only.
const ROLES: { value: Role; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'alumni',  label: 'Alumni',   icon: Briefcase,     desc: 'Graduated from MAJU' },
  { value: 'teacher', label: 'Teacher',  icon: BookOpen,      desc: 'Faculty at MAJU / SZABIST' },
];

export default function SetupPage() {
  const router  = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState('');
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const [form, setForm] = useState({
    role:        'alumni' as Role,
    department:  '',
    batch_year:  new Date().getFullYear(),
    student_id:  '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Already set up — skip straight to dashboard
      const { data: profile } = await supabase
        .from('profiles').select('role, department').eq('id', user.id).single();
      if (profile?.role && profile?.department) {
        router.replace('/dashboard');
        return;
      }

      setUserEmail(user.email ?? '');
      setLoading(false);
    })();
  }, [supabase, router]);

  const isStudent      = form.role === 'student';
  const isGmailUser    = userEmail.endsWith('@gmail.com');
  const needsMajuId    = !isStudent && isGmailUser;
  const showMajuId     = !isStudent;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isStudent && !userEmail.endsWith('@maju.edu.pk')) {
      setError('Students must use their @maju.edu.pk university email. Please sign in with your MAJU account.');
      return;
    }

    if (!form.department) { setError('Please select your department.'); return; }

    if (needsMajuId) {
      if (!form.student_id.trim()) {
        setError('MAJU ID is required when signing up with a Gmail address. Format: FA22-BSCS-0114');
        return;
      }
      if (!validateMajuId(form.student_id)) {
        setError('Invalid MAJU ID format. Expected: FA22-BSCS-0114');
        return;
      }
    }

    if (!isStudent && form.student_id.trim() && !validateMajuId(form.student_id)) {
      setError('Invalid MAJU ID format. Expected: FA22-BSCS-0114');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { error: err } = await supabase
      .from('profiles')
      .update({
        role:        form.role,
        department:  form.department,
        batch_year:  form.batch_year,
        student_id:  form.student_id.trim() || null,
        updated_at:  new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);
    if (err) { setError(err.message); return; }

    toast.success('Profile set up! Welcome to Parchi.');
    router.replace('/onboarding');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-indigo-600">
            Parchi<span className="text-slate-400 dark:text-zinc-500 font-normal">.maju</span>
          </Link>
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">One last step — tell us who you are</p>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Signed in as <strong>{userEmail}</strong></p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8">
          <form onSubmit={handleSave} className="space-y-5">

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setForm((f) => ({ ...f, role: value }))}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                      form.role === value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                    }`}>
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              {isStudent && isGmailUser && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Students must be signed in with their @maju.edu.pk Google account.
                </p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Department</label>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} required className={inputCls}>
                <option value="">Select your department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Batch year */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                {isStudent ? 'Batch Year' : 'Graduation Year'}
              </label>
              <input type="number"
                value={form.batch_year}
                onChange={(e) => setForm((f) => ({ ...f, batch_year: parseInt(e.target.value) || 0 }))}
                min={2000} max={2035} required placeholder="e.g. 2022" className={inputCls} />
            </div>

            {/* MAJU ID (alumni/teacher) */}
            {showMajuId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  MAJU Student ID
                  {needsMajuId
                    ? <span className="ml-1.5 text-xs font-normal text-red-500">required for Gmail</span>
                    : <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-zinc-500">optional</span>}
                </label>
                <div className="relative">
                  <BadgeCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input type="text"
                    value={form.student_id}
                    onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value.toUpperCase() }))}
                    placeholder="FA22-BSCS-0114"
                    required={needsMajuId}
                    className={`${inputCls} pl-10 font-mono tracking-wide`} />
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  Format: FA/SP + year + dept + number (e.g. FA22-BSCS-0114)
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {saving && <Loader2 size={18} className="animate-spin" />}
              {saving ? 'Saving…' : 'Complete setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
