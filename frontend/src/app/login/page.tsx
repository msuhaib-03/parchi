'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const inputCls = 'w-full py-3 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 focus:border-transparent transition-colors';

const ALLOWED_DOMAINS = ['@maju.edu.pk', '@jinnah.edu', '@gmail.com'];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  domain:             'That Google account isn\'t a MAJU community email. Use @maju.edu.pk, @jinnah.edu, or @gmail.com.',
  oauth:              'Google sign-in failed. Please try again.',
  students_use_email: 'Student accounts use email & password — please sign in below.',
};

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const oauthError = searchParams.get('error');

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error,         setError]         = useState(
    oauthError ? (ERROR_MESSAGES[oauthError] ?? 'Sign-in failed. Please try again.') : ''
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validDomain = ALLOWED_DOMAINS.some((d) => email.endsWith(d));
    if (!validDomain) {
      setError('Please use your @maju.edu.pk, @jinnah.edu, or @gmail.com email.');
      return;
    }

    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) { setError(authError.message); return; }

    toast.success('Welcome back!');
    router.push('/dashboard');
    router.refresh();
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      toast.error(authError.message);
      setGoogleLoading(false);
    }
    // On success the browser navigates to Google — nothing runs after this
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 px-4 transition-colors">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-extrabold text-indigo-600">
            Parchi<span className="text-gray-400 dark:text-zinc-500 font-normal">.maju</span>
          </Link>
          <p className="text-gray-500 dark:text-zinc-400 mt-2 text-sm">Welcome back</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-8">

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-200 font-semibold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-700 disabled:opacity-60 transition-colors"
          >
            {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
            <span>Continue with Google <span className="font-normal text-slate-400 dark:text-zinc-500 text-xs">· alumni &amp; teachers</span></span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-zinc-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-zinc-900 px-3 text-xs text-slate-400 dark:text-zinc-500">or continue with email</span>
            </div>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@maju.edu.pk or @gmail.com" required
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className={`${inputCls} pl-10 pr-4`} />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-xl transition-colors">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-zinc-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-4">
          Students: <strong className="text-gray-500 dark:text-zinc-400">@maju.edu.pk</strong> &nbsp;·&nbsp;
          Alumni &amp; Teachers: <strong className="text-gray-500 dark:text-zinc-400">@maju.edu.pk · @jinnah.edu · @gmail.com</strong>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
