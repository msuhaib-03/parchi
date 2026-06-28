import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Users, Briefcase, MessageCircle, ArrowRight, Zap, ShieldCheck, TrendingUp } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  // Redirect already-logged-in users straight to the dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 transition-colors">

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
            Parchi<span className="text-slate-300 dark:text-zinc-600 font-normal">.maju</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              Join free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-4 py-28 md:py-36 bg-dot-grid">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/60 to-white dark:from-zinc-950/90 dark:via-zinc-950/60 dark:to-zinc-950 pointer-events-none" />

        {/* Floating orbs */}
        <div className="animate-float absolute -top-24 -left-24 w-80 h-80 bg-indigo-400/15 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="animate-float-delayed absolute -top-12 -right-20 w-72 h-72 bg-violet-400/15 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="animate-float-slow absolute bottom-0 left-1/2 w-64 h-64 bg-indigo-300/10 dark:bg-indigo-700/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800">
            <Zap size={11} />
            Students &amp; alumni of MAJU — all departments
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-100 text-5xl md:text-6xl font-extrabold leading-tight text-slate-900 dark:text-zinc-50 mb-6 tracking-tight">
            Your <span className="text-gradient">parchi</span> should be<br className="hidden sm:block" />
            {' '}your skills, not wasta.
          </h1>

          <p className="animate-fade-in-up delay-200 text-lg text-slate-500 dark:text-zinc-400 max-w-lg mx-auto mb-10 leading-relaxed">
            Connect with MAJU alumni at your dream companies.
            Get referred, get mentored, and land the job you actually deserve.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-950 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Get started — it&apos;s free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold px-7 py-3.5 rounded-xl text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              I already have an account
            </Link>
          </div>

          <p className="animate-fade-in-up delay-400 text-xs text-slate-400 dark:text-zinc-500 mt-5">
            Students use <strong className="text-slate-500 dark:text-zinc-400">@maju.edu.pk</strong>&nbsp;&nbsp;·&nbsp;&nbsp;
            Alumni &amp; teachers use <strong className="text-slate-500 dark:text-zinc-400">@gmail.com</strong> or <strong className="text-slate-500 dark:text-zinc-400">@maju.edu.pk</strong>
          </p>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white dark:bg-zinc-950 transition-colors">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-zinc-50 mb-4 tracking-tight">
              Three steps to your next role
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 max-w-md mx-auto text-sm leading-relaxed">
              No cold emails. No LinkedIn spam. Just your alumni network, finally organised.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <FeatureCard
              step="01"
              icon={<Users size={20} />}
              color="indigo"
              title="Find your alumni"
              description="Browse MAJU graduates by department, company, or batch. See who's open to referrals right now."
            />
            <FeatureCard
              step="02"
              icon={<Briefcase size={20} />}
              color="violet"
              title="Request a referral"
              description="Send a request with your details. Alumni review it and mark it referred once done."
            />
            <FeatureCard
              step="03"
              icon={<MessageCircle size={20} />}
              color="purple"
              title="Have the real talk"
              description="Message seniors to ask what the industry actually expects, what to study, and what to avoid."
            />
          </div>
        </div>
      </section>

      {/* ─── Trust strip ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-zinc-900 border-y border-slate-100 dark:border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <TrustCard icon={<ShieldCheck size={18} />} title="Verified network" desc="Only @maju.edu.pk students and verified alumni. No strangers." />
            <TrustCard icon={<TrendingUp size={18} />} title="All departments" desc="CS, BBA, Telecom, Cyber Security, AI — every batch, every dept." />
            <TrustCard icon={<Zap size={18} />} title="Always free" desc="No premium tier, no ads. Built by a student, for students." />
          </div>
        </div>
      </section>

      {/* ─── Community ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white dark:bg-zinc-950 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
              Part of the MAJU community
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-zinc-50 mb-4 tracking-tight">
              Rooted in the ecosystem you&apos;re already in
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 max-w-lg mx-auto text-sm leading-relaxed">
              The same students at MAJU&apos;s IEEE talks, ACM events, and annual tech conferences —
              now connected with their alumni, in one place.
            </p>
          </div>

          {/* Logo cards */}
          <div className="flex items-stretch justify-center gap-5 flex-wrap mb-14">
            <CommunityCard
              href="https://jinnah.edu"
              logo="/logos/maju.png"
              alt="Muhammad Ali Jinnah University"
              name="MAJU"
              desc="Mohammad Ali Jinnah University — 25+ years of academic excellence in Karachi"
              logoW={68} logoH={68}
            />
            <CommunityCard
              href="https://khihtc.maju.edu.pk/"
              logo="/logos/ieee.png"
              alt="IEEE"
              name="IEEE @ MAJU"
              desc="Karachi Humanitarian Technology Conference & student chapter on campus"
              logoW={90} logoH={44}
            />
            <CommunityCard
              href="https://jinnah.edu/societies-clubs/"
              logo="/logos/acm.png"
              alt="ACM"
              name="ACM Chapter"
              desc="International scholarships, 250+ speaker lectures & co-curricular development"
              logoW={76} logoH={44}
            />
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-slate-100 dark:border-zinc-800 pt-12">
            {[
              { stat: '25+',      label: 'Years of university excellence' },
              { stat: '6',        label: 'Active student societies & clubs' },
              { stat: 'IEEE · ACM', label: 'International chapters on campus' },
              { stat: 'KHI-HTC', label: 'Annual humanitarian tech conference' },
            ].map(({ stat, label }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-extrabold text-slate-800 dark:text-zinc-100 tracking-tight">{stat}</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-zinc-900 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-12 text-center text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-950">
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-300/20 rounded-full blur-2xl" />
            <div className="relative">
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mb-3">Ready to start?</p>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                Talent should win.<br />Let&apos;s make it happen.
              </h2>
              <p className="text-indigo-200 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Join the platform built by a MAJU student, for every MAJU student and alumni.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-indigo-50 transition-all text-sm shadow-lg hover:-translate-y-0.5">
                  Create your profile <ArrowRight size={16} />
                </Link>
                <Link href="/alumni"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-sm">
                  Browse alumni first
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-6 px-4 text-center text-xs text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800 transition-colors">
        Built with care at MAJU &nbsp;·&nbsp; Free forever &nbsp;·&nbsp;{' '}
        Only for <strong className="text-slate-500 dark:text-zinc-400">@maju.edu.pk</strong>{' '}
        &nbsp;·&nbsp; © Muhammad Suhaib
      </footer>
    </div>
  );
}

function FeatureCard({ step, icon, color, title, description }: {
  step: string; icon: React.ReactNode; color: string; title: string; description: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-100 dark:shadow-none',
    violet: 'from-violet-500 to-violet-700 shadow-violet-100 dark:shadow-none',
    purple: 'from-purple-500 to-purple-700 shadow-purple-100 dark:shadow-none',
  };
  return (
    <div className="group flex flex-col p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-300">
      <span className="text-xs font-bold text-slate-200 dark:text-zinc-700 mb-4">{step}</span>
      <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br ${colors[color]} text-white shadow-sm mb-4 shrink-0`}>
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-zinc-100 mb-2 text-base">{title}</h3>
      <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function TrustCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-700 p-5">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-900 dark:text-zinc-100 text-sm mb-0.5">{title}</p>
        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function CommunityCard({ href, logo, alt, name, desc, logoW, logoH }: {
  href: string; logo: string; alt: string; name: string; desc: string; logoW: number; logoH: number;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="group flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-300 w-52">
      <div className="h-16 flex items-center justify-center mb-4">
        <Image
          src={logo} alt={alt} width={logoW} height={logoH}
          className="object-contain grayscale group-hover:grayscale-0 transition-all duration-300"
        />
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mb-1.5">{name}</p>
      <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">{desc}</p>
    </a>
  );
}
