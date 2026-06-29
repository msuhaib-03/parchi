// ─────────────────────────────────────────────────────────────────────────────
// Parchi — Weekly Digest email  (Supabase Edge Function · Deno)
//
// Fired weekly by pg_cron → pg_net (see supabase/weekly_digest_migration.sql).
// Builds a personalised, role-aware digest for every opted-in user and sends it
// via Brevo's transactional API. Idempotent per 7-day window (won't double-send).
//
// AUTH: invoked server-to-server. In the dashboard, turn OFF "Enforce JWT
// verification" for this function; access is gated instead by a shared secret
// header (x-digest-secret) that must equal the DIGEST_CRON_SECRET env var.
//
// Manual testing (still requires the x-digest-secret header):
//   POST .../weekly-digest?test_email=you@maju.edu.pk   → send ONLY to you
//   POST .../weekly-digest?dry_run=1                     → compute, send nothing
//
// SWAPPING EMAIL PROVIDER: only sendEmail() below talks to Brevo. To move to
// Resend / SMTP / SendGrid, rewrite that one function — nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BREVO_API_KEY    = Deno.env.get('BREVO_API_KEY') ?? '';
const SENDER_EMAIL     = Deno.env.get('DIGEST_SENDER_EMAIL') ?? '';
const SENDER_NAME      = Deno.env.get('DIGEST_SENDER_NAME') ?? 'Parchi.maju';
const CRON_SECRET      = Deno.env.get('DIGEST_CRON_SECRET') ?? '';
const UNSUB_SECRET     = Deno.env.get('DIGEST_UNSUB_SECRET') ?? '';
const APP_URL          = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://parchi-maju.vercel.app').replace(/\/$/, '');
const MAX_SENDS        = parseInt(Deno.env.get('DIGEST_MAX_SENDS') ?? '280', 10); // stay under Brevo's 300/day free cap
const FN_BASE          = `${SUPABASE_URL}/functions/v1`;

// ── Palette (matches the app's indigo theme) ─────────────────────────────────
const BRAND = '#4f46e5', INK = '#0f172a', SUB = '#64748b', LINE = '#e2e8f0', BG = '#f1f5f9';

// ── Utils ──────────────────────────────────────────────────────────────────────
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Mirror of the app's skill-match logic (frontend getMatchInfo): normalise + intersect.
function matchedSkills(skills?: string[] | null, tags?: string[] | null): string[] {
  if (!skills?.length || !tags?.length) return [];
  const norm = (s: string) => s.toLowerCase().trim();
  const set = new Set(skills.map(norm));
  return tags.filter((t) => set.has(norm(t)));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } });

// ── Per-user digest model ─────────────────────────────────────────────────────
interface DigestModel {
  firstName: string;
  isStudent: boolean;
  isAlumni: boolean;
  subject: string;
  hasContent: boolean;
  itemsCount: number;
  matchedJobCount: number;
  jobs: { title: string; company: string; jobType: string; where: string; matched: string[] }[];
  stories: { who: string; company: string; role: string }[];
  alumni: { name: string; sub: string }[];
  pendingReferrals: number;
  profileNudge?: string;
  salaryStats?: { newThisWeek: number; totalCount: number; medianPkr: number };
  upcomingEvents: { id: string; title: string; eventType: string; startsAt: string; isOnline: boolean; location?: string; organizer?: string }[];
}

interface GlobalData {
  jobs: any[];
  stories: { is_anonymous: boolean; company: string; role: string; user_name?: string; user_dept?: string }[];
  alumni: any[];
  pendingByAlumni: Record<string, number>;
  salaryEntries: { monthly_salary_pkr: number; created_at: string }[];
  upcomingEvents: { id: string; title: string; event_type: string; starts_at: string; is_online: boolean; location?: string; organizer?: string }[];
}

function buildModel(u: any, data: GlobalData, windowStart: string): DigestModel {
  const firstName = String(u.full_name || 'there').split(' ')[0];
  const isStudent = u.role === 'student';
  const isAlumni  = u.role === 'alumni';

  // Jobs — students get skill-ranked picks; everyone else gets recent postings.
  let jobs: DigestModel['jobs'];
  if (isStudent) {
    jobs = data.jobs
      .map((j) => ({ j, matched: matchedSkills(u.skills, j.tags) }))
      .sort((a, b) => b.matched.length - a.matched.length) // recency preserved for ties (query is ordered)
      .slice(0, 5)
      .map(({ j, matched }) => ({
        title: j.title, company: j.company, jobType: j.job_type,
        where: j.is_remote ? 'Remote' : (j.location || ''), matched,
      }));
  } else {
    jobs = data.jobs.slice(0, 3).map((j) => ({
      title: j.title, company: j.company, jobType: j.job_type,
      where: j.is_remote ? 'Remote' : (j.location || ''), matched: [],
    }));
  }

  const stories = data.stories.slice(0, 3).map((s) => ({
    who: s.is_anonymous ? `A${s.user_dept ? ' ' + s.user_dept : ' MAJU'} student` : (s.user_name || 'Someone'),
    company: s.company, role: s.role,
  }));

  const alumni = data.alumni
    .filter((a) => a.id !== u.id)
    .slice(0, 4)
    .map((a) => ({
      name: a.full_name,
      sub: (a.job_title && a.current_company) ? `${a.job_title} · ${a.current_company}` : `${a.department} · Batch ${a.batch_year}`,
    }));

  const pendingReferrals = isAlumni ? (data.pendingByAlumni[u.id] ?? 0) : 0;

  // One highest-impact profile nudge (only if their profile is thin).
  let profileNudge: string | undefined;
  if (isStudent && (u.skills?.length ?? 0) === 0)        profileNudge = 'Add your skills and we’ll match you to the right jobs automatically.';
  else if ((u.bio?.trim().length ?? 0) < 50)             profileNudge = 'Add a short bio — complete profiles get up to 3× more responses.';
  else if (!u.linkedin_url)                              profileNudge = 'Connect your LinkedIn to build credibility with alumni.';

  // Salary stats — show section when there's enough data (3+ total) or new submissions this week.
  let salaryStats: DigestModel['salaryStats'];
  if (data.salaryEntries.length >= 3 || data.salaryEntries.some((e) => e.created_at >= windowStart)) {
    const sorted = [...data.salaryEntries].map((e) => e.monthly_salary_pkr).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianPkr = sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
    const newThisWeek = data.salaryEntries.filter((e) => e.created_at >= windowStart).length;
    salaryStats = { newThisWeek, totalCount: data.salaryEntries.length, medianPkr };
  }

  const upcomingEvents = data.upcomingEvents.slice(0, 3).map((e) => ({
    id: e.id, title: e.title, eventType: e.event_type,
    startsAt: e.starts_at, isOnline: e.is_online,
    location: e.location, organizer: e.organizer,
  }));

  const matchedJobCount = jobs.filter((j) => j.matched.length > 0).length;
  const itemsCount = jobs.length + stories.length + alumni.length + (salaryStats ? 1 : 0) + upcomingEvents.length;
  const hasContent = itemsCount > 0 || pendingReferrals > 0;

  let subject: string;
  if (isStudent && matchedJobCount > 0)   subject = `${matchedJobCount} new job${matchedJobCount > 1 ? 's' : ''} match your skills this week 🎯`;
  else if (isAlumni && pendingReferrals)  subject = `${pendingReferrals} referral request${pendingReferrals > 1 ? 's' : ''} waiting for you`;
  else if (jobs.length)                   subject = `${jobs.length} new opportunit${jobs.length > 1 ? 'ies' : 'y'} at Parchi this week`;
  else if (stories.length)                subject = `New MAJU success stories this week 🏆`;
  else                                    subject = `What’s new at Parchi this week`;

  return { firstName, isStudent, isAlumni, subject, hasContent, itemsCount, matchedJobCount,
    jobs, stories, alumni, pendingReferrals, profileNudge, salaryStats, upcomingEvents };
}

// ── HTML email (inline styles, table layout — email-client safe) ──────────────
const chip = (label: string) =>
  `<span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600;margin:0 5px 5px 0;">${label}</span>`;

function buildHtml(m: DigestModel, unsubUrl: string): string {
  const jobsHeading = m.isStudent
    ? (m.matchedJobCount > 0 ? '🎯 Jobs picked for you' : '💼 New jobs this week')
    : '💼 New opportunities shared';

  const jobRows = m.jobs.map((j) => `
    <tr><td style="padding:12px 0;border-bottom:1px solid ${LINE};">
      <div style="font-weight:600;color:${INK};font-size:15px;line-height:1.3;">${esc(j.title)} <span style="font-weight:400;color:${SUB};">· ${esc(j.company)}</span></div>
      <div style="color:${SUB};font-size:13px;margin-top:3px;text-transform:capitalize;">${esc(j.jobType)}${j.where ? ' · ' + esc(j.where) : ''}</div>
      ${j.matched.length ? `<div style="margin-top:6px;">${j.matched.slice(0, 4).map((s) => chip(`✓ ${esc(s)}`)).join('')}</div>` : ''}
    </td></tr>`).join('');

  const storyRows = m.stories.map((s) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};color:${INK};font-size:14px;line-height:1.4;">
      <span style="font-weight:600;">${esc(s.who)}</span> placed at <span style="font-weight:600;">${esc(s.company)}</span> as ${esc(s.role)} 🏆
    </td></tr>`).join('');

  const alumniRows = m.alumni.map((a) => `
    <tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};">
      <div style="font-weight:600;color:${INK};font-size:14px;">${esc(a.name)}</div>
      <div style="color:${SUB};font-size:13px;margin-top:1px;">${esc(a.sub)}</div>
    </td></tr>`).join('');

  const section = (title: string, rows: string, ctaText: string, ctaHref: string) => rows ? `
    <tr><td style="padding:22px 28px 0;">
      <div style="font-size:13px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:.04em;">${title}</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${rows}</table>
      <a href="${ctaHref}" style="display:inline-block;margin-top:10px;color:${BRAND};font-size:13px;font-weight:600;text-decoration:none;">${ctaText} →</a>
    </td></tr>` : '';

  const pendingBlock = m.pendingReferrals > 0 ? `
    <tr><td style="padding:22px 28px 0;">
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;padding:16px;">
        <div style="font-weight:700;color:#3730a3;font-size:15px;">📥 ${m.pendingReferrals} referral request${m.pendingReferrals > 1 ? 's' : ''} waiting</div>
        <div style="color:#4338ca;font-size:13px;margin-top:4px;">Juniors are counting on you. Review and respond when you get a moment.</div>
        <a href="${APP_URL}/referrals" style="display:inline-block;margin-top:10px;background:${BRAND};color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:9px 16px;border-radius:10px;">Review requests</a>
      </div>
    </td></tr>` : '';

  const fmtPKR = (n: number) => n >= 100000 ? `PKR ${(n / 100000).toFixed(1).replace(/\.0$/, '')}L` : `PKR ${Math.round(n / 1000)}K`;

  const salaryBlock = m.salaryStats ? (() => {
    const { newThisWeek, totalCount, medianPkr } = m.salaryStats!;
    const badge = newThisWeek > 0
      ? `<span style="background:#7c3aed;color:#fff;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;">+${newThisWeek} this week</span>`
      : '';
    return `
    <tr><td style="padding:22px 28px 0;">
      <div style="font-size:13px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:.04em;">💰 Salary Insights</div>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:14px;padding:18px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div style="font-size:26px;font-weight:800;color:#1e1b4b;line-height:1;">${fmtPKR(medianPkr)}<span style="font-size:14px;font-weight:500;color:#6d28d9;">/mo</span></div>
            <div style="font-size:13px;color:#6d28d9;margin-top:4px;">Market median · ${totalCount} anonymous submission${totalCount !== 1 ? 's' : ''}</div>
          </div>
          ${badge}
        </div>
        <div style="margin-top:12px;font-size:13px;color:#5b21b6;line-height:1.5;">See what MAJU alumni and students are earning — by role, level, and company. All anonymous.</div>
        <a href="${APP_URL}/salary" style="display:inline-block;margin-top:10px;color:${BRAND};font-size:13px;font-weight:600;text-decoration:none;">Browse salary data →</a>
      </div>
    </td></tr>`;
  })() : '';

  const EVENT_EMOJI: Record<string, string> = {
    workshop: '🛠️', seminar: '🎤', competition: '🏆', networking: '🤝',
    career_fair: '💼', club_event: '🎭', hackathon: '💻', sports: '⚽', other: '📅',
  };

  const fmtDigestDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const eventsBlock = m.upcomingEvents.length > 0 ? (() => {
    const rows = m.upcomingEvents.map((e) => `
      <tr><td style="padding:10px 0;border-bottom:1px solid ${LINE};">
        <div style="font-weight:600;color:${INK};font-size:14px;line-height:1.3;">
          ${EVENT_EMOJI[e.eventType] ?? '📅'} <a href="${APP_URL}/events/${esc(e.id)}" style="color:${INK};text-decoration:none;">${esc(e.title)}</a>
        </div>
        <div style="color:${SUB};font-size:12px;margin-top:3px;">${fmtDigestDate(e.startsAt)}${e.isOnline ? ' · Online' : (e.location ? ' · ' + esc(e.location) : '')}${e.organizer ? ' · ' + esc(e.organizer) : ''}</div>
      </td></tr>`).join('');
    return `
    <tr><td style="padding:22px 28px 0;">
      <div style="font-size:13px;font-weight:700;color:${BRAND};text-transform:uppercase;letter-spacing:.04em;">📅 Upcoming Events</div>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">${rows}</table>
      <a href="${APP_URL}/events" style="display:inline-block;margin-top:10px;color:${BRAND};font-size:13px;font-weight:600;text-decoration:none;">See all events →</a>
    </td></tr>`;
  })() : '';

  const nudgeBlock = m.profileNudge ? `
    <tr><td style="padding:22px 28px 0;">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:14px 16px;color:#92400e;font-size:13px;line-height:1.5;">
        ✨ <span style="font-weight:600;">Tip:</span> ${esc(m.profileNudge)}
      </div>
    </td></tr>` : '';

  const today = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long' });

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parchi weekly digest</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:18px;overflow:hidden;border:1px solid ${LINE};">

        <tr><td style="background:${BRAND};padding:26px 28px;">
          <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.02em;">Parchi<span style="color:#c7d2fe;font-weight:500;">.maju</span></div>
          <div style="color:#c7d2fe;font-size:12px;margin-top:2px;">Your weekly digest · ${today}</div>
        </td></tr>

        <tr><td style="padding:24px 28px 0;">
          <div style="font-size:18px;font-weight:700;color:${INK};">Hey ${esc(m.firstName)} 👋</div>
          <div style="color:${SUB};font-size:14px;margin-top:4px;line-height:1.5;">Here’s what happened at MAJU this week.</div>
        </td></tr>

        ${pendingBlock}
        ${section(jobsHeading, jobRows, 'See all jobs', `${APP_URL}/jobs`)}
        ${salaryBlock}
        ${eventsBlock}
        ${section('🏆 Success stories', storyRows, 'Read stories', `${APP_URL}/stories`)}
        ${section('🎓 New alumni to connect with', alumniRows, 'Browse alumni', `${APP_URL}/alumni`)}
        ${nudgeBlock}

        <tr><td style="padding:26px 28px;">
          <a href="${APP_URL}/dashboard" style="display:block;text-align:center;background:${BRAND};color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:13px;border-radius:12px;">Open Parchi</a>
        </td></tr>

        <tr><td style="padding:18px 28px 28px;border-top:1px solid ${LINE};">
          <div style="color:#94a3b8;font-size:12px;line-height:1.6;">
            You’re receiving this because you’re part of Parchi.maju. You’ll still get important account emails.<br>
            <a href="${unsubUrl}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe from the weekly digest</a>
          </div>
        </td></tr>

      </table>
      <div style="color:#cbd5e1;font-size:11px;margin-top:14px;">Parchi.maju · Built for Muhammad Ali Jinnah University 🇵🇰</div>
    </td></tr>
  </table>
</body></html>`;
}

// ── Email provider (the ONLY provider-specific code) ──────────────────────────
async function sendEmail(opts: { toEmail: string; toName?: string; subject: string; html: string; unsubUrl: string }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: SENDER_EMAIL, name: SENDER_NAME },
      to: [{ email: opts.toEmail, name: opts.toName || undefined }],
      subject: opts.subject,
      htmlContent: opts.html,
      // RFC 8058 one-click unsubscribe — keeps Gmail/Outlook happy with bulk mail.
      headers: {
        'List-Unsubscribe': `<${opts.unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// ── Handler ────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-digest-secret') !== CRON_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    return json({ error: 'email not configured: set BREVO_API_KEY and DIGEST_SENDER_EMAIL secrets' }, 500);
  }
  if (!UNSUB_SECRET) {
    return json({ error: 'set the DIGEST_UNSUB_SECRET secret (used to sign unsubscribe links)' }, 500);
  }

  const url       = new URL(req.url);
  const testEmail = url.searchParams.get('test_email');
  const dryRun    = url.searchParams.get('dry_run') === '1';

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const now         = new Date();
  const windowStart = new Date(now.getTime() - 7 * 864e5).toISOString();
  const storyWindow = new Date(now.getTime() - 14 * 864e5).toISOString(); // stories are rarer → wider window

  // ── Global "what's new" (one set of queries, reused for every recipient) ───
  const weekAhead = new Date(now.getTime() + 7 * 864e5).toISOString();

  const [{ data: jobs }, { data: storiesRaw }, { data: alumni }, { data: pending }, { data: salaryRaw }, { data: eventsRaw }] = await Promise.all([
    admin.from('jobs')
      .select('id, title, company, job_type, location, is_remote, tags, created_at')
      .eq('is_active', true).gte('created_at', windowStart)
      .order('created_at', { ascending: false }),
    admin.from('success_stories')
      .select('id, company, role, is_anonymous, created_at, user:profiles!user_id(full_name, department)')
      .gte('created_at', storyWindow).order('created_at', { ascending: false }).limit(6),
    admin.from('profiles')
      .select('id, full_name, job_title, current_company, department, batch_year, created_at')
      .eq('role', 'alumni').gte('created_at', windowStart)
      .order('created_at', { ascending: false }).limit(8),
    admin.from('referral_requests').select('alumni_id').eq('status', 'pending'),
    admin.from('salary_entries').select('monthly_salary_pkr, created_at'),
    admin.from('events')
      .select('id, title, event_type, starts_at, is_online, location, organizer')
      .eq('is_active', true)
      .gte('starts_at', now.toISOString())
      .lte('starts_at', weekAhead)
      .order('starts_at', { ascending: true })
      .limit(5),
  ]);

  const pendingByAlumni: Record<string, number> = {};
  for (const r of (pending ?? []) as any[]) pendingByAlumni[r.alumni_id] = (pendingByAlumni[r.alumni_id] ?? 0) + 1;

  const stories = ((storiesRaw ?? []) as any[]).map((s) => {
    const u = Array.isArray(s.user) ? s.user[0] : s.user; // supabase returns the join as an array
    return { is_anonymous: s.is_anonymous, company: s.company, role: s.role, user_name: u?.full_name, user_dept: u?.department };
  });

  const salaryEntries = (salaryRaw ?? []) as { monthly_salary_pkr: number; created_at: string }[];
  const upcomingEvents = (eventsRaw ?? []) as GlobalData['upcomingEvents'];
  const data: GlobalData = { jobs: jobs ?? [], stories, alumni: alumni ?? [], pendingByAlumni, salaryEntries, upcomingEvents };

  // ── Recipients ─────────────────────────────────────────────────────────────
  let recipients: any[];
  if (testEmail) {
    const { data: r } = await admin.from('profiles').select('*').eq('email', testEmail).limit(1);
    recipients = r ?? [];
    if (!recipients.length) return json({ error: `no profile found with email ${testEmail}` }, 404);
  } else {
    const { data: r } = await admin.from('profiles').select('*').eq('email_weekly_digest', true).not('email', 'is', null);
    recipients = r ?? [];
  }

  // ── Per-user send ────────────────────────────────────────────────────────────
  let sent = 0, skipped = 0, failed = 0, capped = 0;
  const errors: string[] = [];
  const sixDaysAgo = new Date(now.getTime() - 6 * 864e5).toISOString();

  for (const u of recipients) {
    if (!testEmail && sent >= MAX_SENDS) { capped++; continue; }

    // Idempotency: skip if we already sent to this user in the last 6 days.
    if (!testEmail && !dryRun) {
      const { data: prior } = await admin.from('email_digest_log')
        .select('id').eq('user_id', u.id).eq('status', 'sent').gte('sent_at', sixDaysAgo).limit(1);
      if (prior?.length) { skipped++; continue; }
    }

    const model = buildModel(u, data, windowStart);
    // Don't spam users with an empty digest — but in test mode always send so the
    // template/pipeline can be verified even during a quiet week.
    if (!model.hasContent && !testEmail) {
      if (!dryRun) {
        await admin.from('email_digest_log').insert({ user_id: u.id, period_start: windowStart, status: 'skipped_empty', items_count: 0 });
      }
      skipped++; continue;
    }

    if (dryRun) { sent++; continue; }

    const token    = await hmacHex(UNSUB_SECRET, u.id);
    const unsubUrl = `${FN_BASE}/email-unsubscribe?uid=${u.id}&t=${token}`;
    const html     = buildHtml(model, unsubUrl);

    try {
      await sendEmail({ toEmail: u.email, toName: u.full_name, subject: model.subject, html, unsubUrl });
      sent++;
      if (!testEmail) await admin.from('email_digest_log').insert({ user_id: u.id, period_start: windowStart, status: 'sent', items_count: model.itemsCount });
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${u.email}: ${msg}`);
      if (!testEmail) await admin.from('email_digest_log').insert({ user_id: u.id, period_start: windowStart, status: 'failed', items_count: model.itemsCount, error: msg });
    }
  }

  return json({
    ok: true,
    window_start: windowStart,
    recipients: recipients.length,
    sent, skipped, failed, capped,
    note: capped > 0
      ? `${capped} recipient(s) not emailed this run — DIGEST_MAX_SENDS=${MAX_SENDS} (Brevo free tier is 300/day). Raise the cap or upgrade the provider.`
      : undefined,
    errors: errors.slice(0, 20),
  });
});
