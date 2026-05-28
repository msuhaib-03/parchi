# Parchi.maju 🎓

> **Bridge the gap. Your skills are your parchi.**

Parchi is a free alumni-student networking platform built exclusively for **Muhammad Ali Jinnah University (MAJU)**. It connects current students with MAJU alumni working at top companies — for referrals, mentorship, and real industry insights. No connections needed. No wasta. Just talent.

🔗 **Live at → [parchi-eta.vercel.app](https://parchi-eta.vercel.app)**

---

## The Problem

Getting a job in Pakistan often requires a "parchi" — a connection, a reference, someone vouching for you on the inside. Most students don't have that. Most alumni are willing to help their juniors but have no way to find them.

Parchi.maju fixes that.

---

## Features

### For Students
- 🔍 **Browse alumni** — filter by company, department, or referral availability
- 📨 **Send referral requests** — attach your message directly to alumni at your target company
- 💬 **Message alumni** — chat directly without needing WhatsApp groups
- 📊 **Track your requests** — see pending, accepted, and referred statuses in real time
- 👤 **Build your profile** — showcase your skills, bio, and LinkedIn

### For Alumni
- 📥 **Receive referral requests** — from juniors who match your company
- ✅ **Accept, decline, or mark as referred** — manage your inbox cleanly
- 💬 **Chat with students** — answer questions before committing to a referral
- 🔧 **Control availability** — toggle open/closed for referrals anytime
- 🏢 **Showcase your journey** — company, role, and bio visible to all MAJU students

### Platform
- 🔒 **MAJU-only access** — only `@maju.edu.pk` emails can sign up. No randos.
- 📱 **Installable as a mobile app** — works on Android and iOS via PWA
- 🖥️ **Installable on desktop** — Edge and Chrome show an install prompt automatically
- ⚡ **Free forever** — zero cost, built entirely on free tiers

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS | Vercel (free) |
| Backend | Node.js + Express + TypeScript | Render (free) |
| Database | PostgreSQL + Row Level Security | Supabase (free) |
| Auth | Supabase Auth (email magic link) | Supabase (free) |

**Total monthly cost: PKR 0 🎉**

---

## Install as a Mobile App (PWA)

Parchi is a **Progressive Web App** — no app store needed. Install it directly from your browser.

### Android (Chrome or Edge)
1. Open **[parchi-eta.vercel.app](https://parchi-eta.vercel.app)** in Chrome or Edge
2. Tap the **install banner** that appears at the bottom, OR tap the 3-dot menu → **"Add to Home screen"**
3. Tap **Add** — done! The Parchi icon appears on your home screen

### iPhone / iPad (Safari)
1. Open **[parchi-eta.vercel.app](https://parchi-eta.vercel.app)** in Safari
2. Tap the **Share button** (box with arrow at the bottom)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add** — done!

### Windows Desktop (Chrome or Edge)
1. Open **[parchi-eta.vercel.app](https://parchi-eta.vercel.app)** in Chrome or Edge
2. Click the **install icon** in the address bar (looks like a `+` or monitor icon)
3. Click **Install** — Parchi appears in your Start Menu and taskbar

---

## Project Structure

```
Parchi/
├── frontend/                  Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── page.tsx       Landing page
│       │   ├── login/         Login
│       │   ├── signup/        Signup (MAJU email gate)
│       │   ├── onboarding/    First-time profile setup
│       │   ├── dashboard/     Home dashboard with stats
│       │   ├── alumni/        Browse & filter alumni
│       │   ├── referrals/     Referral request management
│       │   ├── messages/      Direct messaging
│       │   └── profile/       View & edit profiles
│       ├── components/        Reusable UI components
│       ├── lib/               Supabase client setup
│       └── types/             Shared TypeScript types
│
├── backend/                   Express REST API
│   └── src/
│       ├── index.ts           Server entry + health check
│       ├── routes/
│       │   ├── users.ts       Profile CRUD + alumni browse
│       │   ├── referrals.ts   Referral request lifecycle
│       │   └── messages.ts    Async messaging
│       ├── middleware/
│       │   └── auth.ts        Supabase JWT verification
│       └── lib/
│           └── supabase.ts    Service role client (bypasses RLS)
│
└── supabase/
    └── schema.sql             DB schema, RLS policies, triggers
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) account

### 1. Clone the repo
```bash
git clone https://github.com/msuhaib-03/parchi.git
cd parchi
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
3. Go to **Authentication → URL Configuration** → set Site URL to `http://localhost:3000`

### 3. Frontend
```bash
cd frontend
cp .env.local.example .env.local
# Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
# Runs at http://localhost:3000
```

### 4. Backend
```bash
cd backend
cp .env.example .env
# Add your SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, FRONTEND_URL
npm install
npm run dev
# Runs at http://localhost:4000
```

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Set root directory to `frontend`, add env vars |
| Backend | Render | Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `FRONTEND_URL` |
| Keep-alive | UptimeRobot | Ping `/health` every 5 min to prevent Render sleep |

After deploying, update your Supabase **Authentication → URL Configuration** with your Vercel URL.

---

## Roadmap

- [x] University email gate (`@maju.edu.pk` only)
- [x] Student & alumni profiles with onboarding
- [x] Browse alumni by department, company, referral availability
- [x] Send referral requests with personalised message
- [x] Alumni accept / decline / mark-as-referred workflow
- [x] Direct messaging between students and alumni
- [x] Dashboard with live stats
- [x] PWA — installable on Android, iOS, and desktop
- [ ] Profile picture upload
- [ ] Resume / CV upload
- [ ] Email notifications on referral status change
- [ ] Real-time chat (WebSockets)
- [ ] Alumni batch / graduation year filter

---

## Contributing

This project is open to MAJU students and alumni. If you have ideas, find bugs, or want to add features — open an issue or pull request.

---

## Author

Built with ❤️ at MAJU by **Muhammad Suhaib**
Final year student, CS — Muhammad Ali Jinnah University, Karachi

*Tired of needing a parchi to use your skills? Same. That's why I built this.*

---

*Free forever · Only for @maju.edu.pk · Made in Karachi 🇵🇰*
