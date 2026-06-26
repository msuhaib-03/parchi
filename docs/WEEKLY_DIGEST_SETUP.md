# Weekly Digest Email — Setup & Deploy

A personalised, role-aware weekly email summarising new jobs (skill-matched for
students), success stories, new alumni, and pending referral actions. Sent every
Monday 08:00 PKT via a Supabase Edge Function, scheduled with `pg_cron` + `pg_net`.

```
pg_cron (Mon 08:00 PKT)
   └─ pg_net.http_post ──► Edge Function: weekly-digest
                              ├─ reads last-7-days activity (service role)
                              ├─ builds a personalised email per opted-in user
                              ├─ sends via Brevo  ──► inbox
                              ├─ logs each send to email_digest_log (idempotent)
                              └─ every email has a one-click unsubscribe link
                                    └─► Edge Function: email-unsubscribe
```

Everything runs on free tiers. **Total cost: PKR 0.**

---

## What's in the repo

| File | Purpose |
|------|---------|
| `supabase/weekly_digest_migration.sql` | DB: opt-out column, send log, cron schedule |
| `supabase/functions/weekly-digest/index.ts` | Builds + sends the digest |
| `supabase/functions/email-unsubscribe/index.ts` | Handles unsubscribe / resubscribe links |
| `frontend/src/app/profile/[id]/page.tsx` | In-app "Weekly digest email" toggle (already wired) |

---

## Prerequisites

- A free [Brevo](https://www.brevo.com) account (formerly Sendinblue).
- Access to your Supabase project dashboard.
- (Optional) The [Supabase CLI](https://supabase.com/docs/guides/cli) if you prefer
  deploying functions from your machine instead of pasting in the dashboard.

---

## Step 1 — Brevo: verify a sender + get an API key

No domain needed. Brevo lets you send from a single **verified sender email**.

1. Sign up at brevo.com (free plan = **300 emails/day**).
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender.** Use an email you
   control (e.g. your Gmail or a MAJU address). Brevo emails you a confirmation
   link — click it. That address is now your `DIGEST_SENDER_EMAIL`.
3. **SMTP & API → API Keys → Generate a new API key.** Copy it — that's `BREVO_API_KEY`.

> 💡 Deliverability improves later if you verify a real domain (adds SPF/DKIM and
> removes the "via brevo" note). Not required to launch. To switch to Resend/SMTP
> later, you only rewrite `sendEmail()` in `weekly-digest/index.ts`.

---

## Step 2 — Generate two secrets

Run locally (Git Bash / WSL / macOS / Linux):

```bash
openssl rand -hex 32   # → DIGEST_CRON_SECRET   (gates who can trigger the digest)
openssl rand -hex 32   # → DIGEST_UNSUB_SECRET  (signs unsubscribe links)
```

On Windows PowerShell, instead:

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

Keep both somewhere safe — you'll paste them as secrets and one into the cron SQL.

---

## Step 3 — Set the Edge Function secrets

**Dashboard → Edge Functions → Secrets** (or `supabase secrets set KEY=value`):

| Secret | Value | Required |
|--------|-------|----------|
| `BREVO_API_KEY` | from Step 1 | ✅ |
| `DIGEST_SENDER_EMAIL` | your verified Brevo sender | ✅ |
| `DIGEST_SENDER_NAME` | e.g. `Parchi.maju` | optional (defaults to `Parchi.maju`) |
| `DIGEST_CRON_SECRET` | first `openssl` value | ✅ |
| `DIGEST_UNSUB_SECRET` | second `openssl` value | ✅ |
| `PUBLIC_APP_URL` | `https://parchi-maju.vercel.app` | optional (this is the default) |
| `DIGEST_MAX_SENDS` | `280` | optional (stays under Brevo's 300/day) |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **injected automatically** by
> Supabase — do not (and cannot) set them yourself.

---

## Step 4 — Deploy the two functions

### Option A — Dashboard (matches your usual workflow)
1. **Edge Functions → Create a function**, name it exactly `weekly-digest`.
   Paste the contents of `supabase/functions/weekly-digest/index.ts`. Deploy.
2. Repeat for `email-unsubscribe` with that file's contents.
3. **For BOTH functions, turn OFF "Enforce JWT verification"** (function → Details
   → JWT settings). The digest is protected by the `x-digest-secret` header; the
   unsubscribe link is protected by its signed token.

### Option B — Supabase CLI
```bash
supabase functions deploy weekly-digest      --no-verify-jwt
supabase functions deploy email-unsubscribe  --no-verify-jwt
```
(Or add `verify_jwt = false` for each under `[functions.*]` in `supabase/config.toml`.)

---

## Step 5 — Run the database migration + schedule

1. Open `supabase/weekly_digest_migration.sql`.
2. In the cron block at the bottom, replace:
   - `<PROJECT_REF>` → your project ref (**Settings → General → Reference ID**).
   - `<DIGEST_CRON_SECRET>` → the same value you set in Step 3.
3. Paste the whole file into **SQL Editor → Run**. It's idempotent — safe to re-run.

This adds `profiles.email_weekly_digest`, creates `email_digest_log`, enables
`pg_cron`/`pg_net`, and schedules `parchi-weekly-digest` for Mondays 03:00 UTC
(= 08:00 PKT).

---

## Step 6 — Test it

Send a real digest to **only yourself** (replace the ref, secret, and your email):

```bash
curl -i -X POST \
  "https://<PROJECT_REF>.supabase.co/functions/v1/weekly-digest?test_email=you@maju.edu.pk" \
  -H "x-digest-secret: <DIGEST_CRON_SECRET>"
```

You should get a JSON summary (`sent`, `skipped`, `failed`, …) and an email.
`test_email` mode ignores opt-outs and the idempotency log, so you can re-run it.

**Dry run** (compute, send nothing — see how many would get a digest):
```bash
curl -s -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/weekly-digest?dry_run=1" \
  -H "x-digest-secret: <DIGEST_CRON_SECRET>"
```

Then click the **Unsubscribe** link in the test email — it should flip your toggle
off and offer a "Resubscribe" link. Confirm the toggle on your profile reflects it.

---

## Monitoring

Run in SQL Editor:

```sql
-- Did the schedule fire? (latest cron runs)
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- What did pg_net get back from the function?
SELECT id, status_code, content FROM net._http_response ORDER BY created DESC LIMIT 10;

-- What went out last week?
SELECT status, COUNT(*) FROM email_digest_log
WHERE sent_at > NOW() - INTERVAL '7 days' GROUP BY status;
```

You can also watch **Edge Functions → weekly-digest → Logs** live during a run.

---

## Common adjustments

- **Change the day/time:** edit the cron expression in the migration (it's UTC).
  `'0 3 * * 1'` = Mon 03:00 UTC = Mon 08:00 PKT. Re-run the migration.
- **Stop sending:** `SELECT cron.unschedule('parchi-weekly-digest');`
- **Bigger audience than 300/day:** raise `DIGEST_MAX_SENDS`, upgrade Brevo, or the
  function will report how many it capped (`capped` in the JSON) — it never silently drops.
- **Switch email provider:** rewrite only `sendEmail()` in `weekly-digest/index.ts`.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `401 unauthorized` | `x-digest-secret` header missing/wrong, or JWT still enforced. |
| `500 email not configured` | `BREVO_API_KEY` / `DIGEST_SENDER_EMAIL` secret not set. |
| `Brevo 401` in `errors[]` | Bad API key, or sender email not verified in Brevo. |
| Email in spam | Verify a domain in Brevo (SPF/DKIM), and keep content non-spammy. |
| Cron didn't fire | Check `cron.job` exists and `active = true`; check `net._http_response`. |
| `function net.http_post(... timeout_milliseconds ...) does not exist` | Old `pg_net` — remove the `timeout_milliseconds` line from the cron block. |
| Toggle shows migration warning | Run `weekly_digest_migration.sql` (Step 5) first. |
