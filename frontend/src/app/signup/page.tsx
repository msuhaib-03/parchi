'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Mail, Lock, User, Loader2,
  GraduationCap, Briefcase, BookOpen, BadgeCheck,
} from 'lucide-react';
import { DEPARTMENTS, validateMajuId } from '@/types';

const inputCls =
  'w-full py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const STUDENT_DOMAIN = '@maju.edu.pk';
const ALUMNI_TEACHER_DOMAINS = ['@maju.edu.pk', '@jinnah.edu', '@gmail.com'];

type Role = 'student' | 'alumni' | 'teacher';

const ROLES: { value: Role; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'student',  label: 'Student',  icon: GraduationCap, desc: 'Currently enrolled at MAJU' },
  { value: 'alumni',   label: 'Alumni',   icon: Briefcase,     desc: 'Graduated from MAJU' },
  { value: 'teacher',  label: 'Teacher',  icon: BookOpen,      desc: 'Faculty at MAJU / SZABIST' },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student' as Role,
    department: '',
    batch_year: new Date().getFullYear(),
    student_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isStudent = form.role === 'student';
  const isGmailUser = form.email.endsWith('@gmail.com');
  const needsMajuId = !isStudent && isGmailUser;      // required
  const showMajuId  = !isStudent;                     // always show for alumni/teacher

  const validateEmail = (email: string, role: Role) => {
    if (role === 'student') return email.endsWith(STUDENT_DOMAIN);
    return ALUMNI_TEACHER_DOMAINS.some((d) => email.endsWith(d));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(form.email, form.role)) {
      setError(
        isStudent
          ? 'Students must use their @maju.edu.pk university email.'
          : 'Please use your @maju.edu.pk, @jinnah.edu, or @gmail.com email.',
      );
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!form.department) {
      setError('Please select your department.');
      return;
    }

    if (isStudent && (!form.batch_year || isNaN(form.batch_year))) {
      setError('Please enter a valid batch year.');
      return;
    }

    // MAJU ID validation for alumni/teachers using Gmail (mandatory)
    if (needsMajuId) {
      if (!form.student_id.trim()) {
        setError('MAJU ID is required when signing up with a Gmail address. Format: FA22-BSCS-0114');
        return;
      }
      if (!validateMajuId(form.student_id)) {
        setError('Invalid MAJU ID format. Expected: FA22-BSCS-0114 (prefix-dept-number).');
        return;
      }
    }

    // Optional MAJU ID for @maju.edu.pk / @jinnah.edu alumni/teachers — still validate format if provided
    if (!isStudent && form.student_id.trim() && !validateMajuId(form.student_id)) {
      setError('Invalid MAJU ID format. Expected: FA22-BSCS-0114');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: form.role,
          department: form.department,
          batch_year: form.batch_year,
          student_id: form.student_id.trim() || null,
        },
      },
    });
    setLoading(false);

    if (authError) { setError(authError.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
            <Mail size={28} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-2">Check your email</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">
            We sent a confirmation link to <strong className="text-slate-700 dark:text-zinc-200">{form.email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/login" className="mt-6 inline-block text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:underline">
            Back to login →
          </Link>
        </div>
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
          <p className="text-slate-500 dark:text-zinc-400 mt-2 text-sm">Create your free account</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 p-8">
          <form onSubmit={handleSignup} className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)}
                  placeholder="Muhammad Suhaib"
                  required
                  className={`${inputCls} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* Role selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">I am a…</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update('role', value)}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                      form.role === value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                {isStudent ? 'University Email' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder={
                    isStudent
                      ? 'fa22bscs0114@maju.edu.pk'
                      : form.role === 'teacher'
                      ? 'yourname@jinnah.edu or @gmail.com'
                      : 'yourname@gmail.com or @maju.edu.pk'
                  }
                  required
                  className={`${inputCls} pl-10 pr-4`}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                {isStudent
                  ? 'Only @maju.edu.pk emails are accepted for students'
                  : 'Accepted: @maju.edu.pk · @jinnah.edu · @gmail.com'}
              </p>
            </div>

            {/* MAJU ID — alumni / teacher */}
            {showMajuId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  MAJU Student ID
                  {needsMajuId ? (
                    <span className="ml-1.5 text-xs font-normal text-red-500">required for Gmail</span>
                  ) : (
                    <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-zinc-500">optional</span>
                  )}
                </label>
                <div className="relative">
                  <BadgeCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={form.student_id}
                    onChange={(e) => update('student_id', e.target.value.toUpperCase())}
                    placeholder="FA22-BSCS-0114"
                    required={needsMajuId}
                    className={`${inputCls} pl-10 pr-4 font-mono tracking-wide`}
                  />
                </div>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  Format: FA/SP + year + dept + number (e.g. FA22-BSCS-0114)
                </p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className={`${inputCls} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Department</label>
              <select
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                required
                className={`${inputCls} px-4`}
              >
                <option value="">Select your department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Batch Year — students only */}
            {isStudent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Batch Year</label>
                <input
                  type="number"
                  value={isNaN(form.batch_year) ? '' : form.batch_year}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    update('batch_year', isNaN(val) ? 0 : val);
                  }}
                  min={2000}
                  max={2030}
                  required
                  placeholder="e.g. 2022"
                  className={`${inputCls} px-4`}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors mt-1"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-zinc-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
