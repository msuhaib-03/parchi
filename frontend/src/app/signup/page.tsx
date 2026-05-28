'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { DEPARTMENTS } from '@/types';

// Shared input className — explicit text + bg so it's always visible
const inputCls = 'w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student' as 'student' | 'alumni',
    department: '',
    batch_year: new Date().getFullYear(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email.endsWith('@maju.edu.pk')) {
      setError('Only @maju.edu.pk email addresses are allowed.');
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
    if (!form.batch_year || isNaN(form.batch_year)) {
      setError('Please enter a valid batch year.');
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
        },
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            We sent a confirmation link to <strong>{form.email}</strong>.
            Click it to activate your account and you&apos;re in.
          </p>
          <Link href="/login" className="mt-6 inline-block text-indigo-600 font-medium text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-indigo-600">
            Parchi<span className="text-gray-400 font-normal">.maju</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Create your free account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSignup} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">University Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="fa22bscs0114@maju.edu.pk"
                  required
                  className={`${inputCls} pl-10 pr-4`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {(['student', 'alumni'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => update('role', r)}
                    className={`py-3 rounded-xl border-2 text-sm font-medium capitalize transition-colors ${
                      form.role === r
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {r === 'student' ? '🎓 Student' : '💼 Alumni'}
                  </button>
                ))}
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
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

            {/* Batch Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Year</label>
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

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
