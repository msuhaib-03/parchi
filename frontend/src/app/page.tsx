import Link from 'next/link';
import Image from 'next/image';
import { Users, Briefcase, MessageCircle, ArrowRight, Zap, Shield, Star } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-950 transition-colors">

      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
            Parchi<span className="text-gray-400 dark:text-gray-500 font-normal">.maju</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-950"
            >
              Join free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center text-center px-4 py-28 bg-dot-grid">

        {/* Gradient base layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-gray-950 dark:to-purple-950/20 pointer-events-none" />

        {/* Floating blur orbs */}
        <div className="animate-float absolute -top-20 -left-20 w-72 h-72 bg-indigo-400/20 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="animate-float-delayed absolute top-10 -right-16 w-64 h-64 bg-purple-400/20 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="animate-float-slow absolute bottom-0 left-1/3 w-56 h-56 bg-violet-400/15 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-indigo-200 dark:border-indigo-800">
            <Zap size={12} />
            For MAJU students &amp; alumni — all departments
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up delay-100 text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight mb-6">
            Your <span className="text-gradient">parchi</span> should be
            <br className="hidden sm:block" />
            {' '}your skills, not your wasta.
          </h1>

          {/* Sub-headline */}
          <p className="animate-fade-in-up delay-200 text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
            Connect with MAJU alumni who are actually working in your dream companies.
            Get referred. Get mentored. Land the job you deserve.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-base transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-950 hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-indigo-900 hover:-translate-y-0.5"
            >
              Get started — it&apos;s free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-8 py-4 rounded-xl text-base hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              I have an account
            </Link>
          </div>

          <p className="animate-fade-in-up delay-400 text-xs text-gray-400 dark:text-gray-500 mt-5">
            Only <strong className="text-gray-500 dark:text-gray-400">@maju.edu.pk</strong> students &amp; verified alumni.&nbsp; No spam, ever.
          </p>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white dark:bg-gray-950 transition-colors">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
              Three steps to your next job
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No cold emails. No LinkedIn spam. Just your alumni network, finally organised.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              step="01"
              icon={<Users size={24} />}
              gradient="from-indigo-500 to-indigo-700"
              title="Find your alumni"
              description="Browse MAJU graduates by department, company, or batch year. See who's open to referrals right now."
            />
            <FeatureCard
              step="02"
              icon={<Briefcase size={24} />}
              gradient="from-violet-500 to-purple-700"
              title="Request a referral"
              description="Send a referral request with your resume and a note. Alumni review and mark it as referred when done."
            />
            <FeatureCard
              step="03"
              icon={<MessageCircle size={24} />}
              gradient="from-pink-500 to-rose-600"
              title="Have the real talk"
              description="Message seniors to ask what the industry actually expects, what to prep, and what to avoid."
            />
          </div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              icon={<Star size={20} />}
              value="All Depts"
              label="CS · BBA · Telecom · Cyber · AI"
              color="indigo"
            />
            <StatCard
              icon={<Shield size={20} />}
              value="100% Free"
              label="No paywalls, ever"
              color="violet"
            />
            <StatCard
              icon={<Users size={20} />}
              value="MAJU Only"
              label="Verified, trusted network"
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* ─── Community Logos ─────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-10">
            Part of the MAJU community
          </p>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            <Image
              src="/logos/maju.png"
              alt="Muhammad Ali Jinnah University"
              width={80}
              height={80}
              className="opacity-50 dark:opacity-30 hover:opacity-90 dark:hover:opacity-70 transition-opacity duration-200 object-contain"
            />
            <Image
              src="/logos/ieee.png"
              alt="IEEE"
              width={110}
              height={55}
              className="opacity-50 dark:opacity-30 hover:opacity-90 dark:hover:opacity-70 transition-opacity duration-200 object-contain"
            />
            <Image
              src="/logos/acm.png"
              alt="Association for Computing Machinery"
              width={130}
              height={55}
              className="opacity-50 dark:opacity-30 hover:opacity-90 dark:hover:opacity-70 transition-opacity duration-200 object-contain"
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-12 text-center text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-950">
            {/* Decorative blobs */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-300/10 rounded-full blur-xl" />

            <div className="relative">
              <p className="text-indigo-200 text-sm font-medium mb-2">Ready to get started?</p>
              <h2 className="text-4xl font-extrabold mb-4">
                Talent should win.<br />Let&apos;s make it happen.
              </h2>
              <p className="text-indigo-200 mb-10 max-w-md mx-auto leading-relaxed">
                Join the platform built by a MAJU student, for every MAJU student and alumni.
                Your network is waiting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:-translate-y-0.5"
                >
                  Create your profile
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/alumni"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-colors"
                >
                  Browse alumni first
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-6 px-4 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 transition-colors">
        Built with ❤️ at MAJU &nbsp;·&nbsp; Free forever &nbsp;·&nbsp; Only for <strong className="text-gray-500 dark:text-gray-400">@maju.edu.pk</strong> &nbsp;·&nbsp; © Muhammad Suhaib
      </footer>
    </div>
  );
}

/* ─── Feature Card ──────────────────────────────────────────────────────────── */
function FeatureCard({
  step, icon, gradient, title, description,
}: {
  step: string;
  icon: React.ReactNode;
  gradient: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:shadow-gray-100 dark:hover:shadow-gray-900/50 hover:-translate-y-1 transition-all duration-300">
      {/* Step number */}
      <span className="absolute top-5 right-5 text-xs font-bold text-gray-200 dark:text-gray-700">{step}</span>
      {/* Icon */}
      <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md mb-5`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────────────────────── */
function StatCard({
  icon, value, label, color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: 'indigo' | 'violet' | 'purple';
}) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-100 dark:shadow-none',
    violet: 'from-violet-500 to-violet-700 shadow-violet-100 dark:shadow-none',
    purple: 'from-purple-500 to-purple-700 shadow-purple-100 dark:shadow-none',
  };
  return (
    <div className={`flex flex-col items-center text-center rounded-2xl bg-gradient-to-br ${colors[color]} text-white p-8 shadow-lg`}>
      <div className="mb-3 opacity-80">{icon}</div>
      <div className="text-3xl font-extrabold mb-1">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
