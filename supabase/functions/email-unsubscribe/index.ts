// ─────────────────────────────────────────────────────────────────────────────
// Parchi — Email unsubscribe  (Supabase Edge Function · Deno)
//
// Public endpoint hit from the "Unsubscribe" link in digest emails, and by
// mail clients honouring the RFC 8058 one-click List-Unsubscribe-Post header.
// Verifies an HMAC token (so the link can't be forged), flips
// profiles.email_weekly_digest, and shows a friendly confirmation page.
//
// AUTH: turn OFF "Enforce JWT verification" in the dashboard — this link is
// clicked from an email with no session. Security comes from the signed token.
//
// Links:
//   GET  ?uid=<id>&t=<hmac>               → unsubscribe + confirmation page
//   GET  ?uid=<id>&t=<hmac>&action=resub  → re-subscribe + confirmation page
//   POST ?uid=<id>&t=<hmac>               → one-click unsubscribe (returns 200)
//
// The token MUST be generated with the SAME DIGEST_UNSUB_SECRET as weekly-digest.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UNSUB_SECRET     = Deno.env.get('DIGEST_UNSUB_SECRET') ?? '';
const APP_URL          = (Deno.env.get('PUBLIC_APP_URL') ?? 'https://parchi-maju.vercel.app').replace(/\/$/, '');

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Length-aware constant-ish comparison to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function page(title: string, messageHtml: string): Response {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Parchi.maju</title></head>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:440px;margin:80px auto;padding:0 16px;">
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;text-align:center;">
      <div style="font-size:20px;font-weight:800;color:#4f46e5;">Parchi<span style="color:#c7d2fe;font-weight:500;">.maju</span></div>
      <h1 style="font-size:18px;color:#0f172a;margin:20px 0 8px;">${title}</h1>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">${messageHtml}</p>
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:22px;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 20px;border-radius:11px;">Go to Parchi</a>
    </div>
  </div>
</body></html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  if (!UNSUB_SECRET) return page('Unavailable', 'Unsubscribe is not configured yet. Please contact support.');

  const url    = new URL(req.url);
  const uid    = url.searchParams.get('uid') ?? '';
  const token  = url.searchParams.get('t') ?? '';
  const resub  = url.searchParams.get('action') === 'resub';

  if (!uid || !token) return page('Invalid link', 'This link is missing information. Please use the link from your email.');

  const expected = await hmacHex(UNSUB_SECRET, uid);
  if (!safeEqual(token, expected)) {
    if (req.method === 'POST') return new Response('Forbidden', { status: 403 });
    return page('Invalid link', 'This link is invalid or has expired.');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await admin.from('profiles').update({ email_weekly_digest: resub }).eq('id', uid);

  // RFC 8058 one-click: clients just need a 2xx, no HTML.
  if (req.method === 'POST') return new Response(error ? 'Error' : 'OK', { status: error ? 500 : 200 });

  if (error) return page('Something went wrong', 'We couldn’t update your preference right now. Please try again later.');

  if (resub) {
    return page('You’re back in 🎉', 'You’ll receive the Parchi weekly digest again. Welcome back!');
  }

  const resubUrl = `${url.origin}${url.pathname}?uid=${encodeURIComponent(uid)}&t=${encodeURIComponent(token)}&action=resub`;
  return page(
    'Unsubscribed',
    `You won’t receive the weekly digest anymore. You’ll still get important account emails.<br><br>Changed your mind? <a href="${resubUrl}" style="color:#4f46e5;font-weight:600;">Resubscribe</a>.`,
  );
});
