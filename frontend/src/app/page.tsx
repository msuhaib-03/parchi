import Link from 'next/link';
import { Users, Briefcase, MessageCircle, ArrowRight, Star, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600 tracking-tight">
            Parchi<span className="text-gray-400 font-normal">.maju</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
            >
              Join free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          <Zap size={12} />
          For MAJU students &amp; alumni — all departments
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight max-w-3xl mb-6">
          Your <span className="text-indigo-600">parchi</span> should be
          <br />
          your skills, not your wasta.
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mb-10 leading-relaxed">
          Connect with MAJU alumni who are actually working in your dream companies.
          Get referred. Get mentored. Land the job you deserve.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-indigo-200"
          >
            Get started — it&apos;s free
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl text-base hover:bg-gray-50 transition-colors"
          >
            I have an account
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Only <strong>@maju.edu.pk</strong> emails. No randos. No spam.
        </p>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            How Parchi works
          </h2>
          <p className="text-center text-gray-500 mb-14">Three things. That&apos;s it.</p>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Users size={28} className="text-indigo-600" />}
              title="Find your alumni"
              description="Browse MAJU graduates by department, company, or batch year. See who's open to referrals right now."
            />
            <FeatureCard
              icon={<Briefcase size={28} className="text-purple-600" />}
              title="Request a referral"
              description="Send a referral request with your resume and a note. Alumni review and mark it as referred when done."
            />
            <FeatureCard
              icon={<MessageCircle size={28} className="text-pink-600" />}
              title="Have the real talk"
              description="Message seniors to ask what the industry actually expects, what to prep, and what to avoid."
            />
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center gap-8 flex-wrap">
            <Stat value="All depts" label="Not just CS" />
            <Stat value="Free" label="Always, forever" />
            <Stat value="MAJU only" label="Trusted network" />
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-indigo-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Talent should win. Let&apos;s make it happen.</h2>
        <p className="text-indigo-200 mb-8 max-w-md mx-auto">
          Join the platform built by a MAJU student, for every MAJU student and alumni.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          Create your profile <ArrowRight size={18} />
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="py-6 px-4 text-center text-xs text-gray-400 border-t border-gray-100">
        Built with ❤️ at MAJU &nbsp;·&nbsp; Free forever &nbsp;·&nbsp; Only for <strong>@maju.edu.pk</strong> &nbsp;·&nbsp; © Muhammad Suhaib
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-start p-6 rounded-2xl border border-gray-100 bg-gray-50 hover:shadow-md transition-shadow">
      <div className="p-3 bg-white rounded-xl shadow-sm mb-4">{icon}</div>
      <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-extrabold text-indigo-700">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
