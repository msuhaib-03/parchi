# Parchi.maju 🎓

> Bridge the gap. Your skills are your parchi.

A university alumni-student networking platform for MAJU — connecting juniors with seniors for referrals, mentorship, and real industry insights. Open to all departments.

---

## Stack

| Layer | Tech | Hosting |
|---|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind | Vercel (free) |
| Backend | Node.js + Express + TypeScript | Railway (free) |
| Database | PostgreSQL | Supabase (free) |
| Auth | Supabase Auth | Supabase (free) |
| Storage | Supabase Storage | Supabase (free) |

**Total monthly cost: PKR 0**

---

## Getting Started

### 1. Supabase Setup (5 minutes)

1. Go to [supabase.com](https://supabase.com) → New project → name it `parchi`
2. Open **SQL Editor** → paste contents of `supabase/schema.sql` → Run
3. Go to **Settings → API** → copy your `URL` and `anon key`
4. Go to **Authentication → URL Configuration** → set Site URL to `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key in .env.local
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Supabase URL and SERVICE ROLE key in .env
npm install
npm run dev
```

Backend runs at: http://localhost:4000

---

## Project Structure

```
Parchi/
├── frontend/               Next.js 14 app
│   └── src/
│       ├── app/            Pages (App Router)
│       │   ├── page.tsx    Landing page
│       │   ├── login/      Login
│       │   ├── signup/     Signup
│       │   ├── dashboard/  Main dashboard
│       │   ├── alumni/     Browse alumni
│       │   ├── referrals/  Referral requests
│       │   └── profile/    User profiles
│       ├── components/     Reusable UI
│       ├── lib/            Supabase client + API helper
│       └── types/          TypeScript types
│
├── backend/                Express API
│   └── src/
│       ├── index.ts        Server entry
│       ├── routes/         users, referrals, messages
│       ├── middleware/      Auth (JWT verification)
│       └── lib/            Supabase service client
│
└── supabase/
    ├── schema.sql          DB schema + RLS policies
    └── seed.sql            Sample data (dev only)
```

---

## Deployment

### Frontend → Vercel
```bash
# Push to GitHub, then connect repo to Vercel
# Add env vars in Vercel dashboard:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL (your Railway URL)
```

### Backend → Railway
```bash
# Push to GitHub, connect to Railway
# Add env vars in Railway dashboard:
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
# SUPABASE_ANON_KEY
# FRONTEND_URL (your Vercel URL)
# PORT=4000
```

---

## Features (MVP)

- [x] University email gate (`@maju.edu.pk` only)
- [x] Student & alumni profiles
- [x] Browse alumni by dept / company / open-to-referrals
- [x] Send referral requests with message
- [x] Alumni accept / decline / mark-as-referred
- [x] Async messaging between users
- [x] Dashboard with stats
- [ ] Resume upload (Supabase Storage — Week 3)
- [ ] Profile picture upload (Week 3)
- [ ] Email notifications (Week 4)
- [ ] Real-time chat with Socket.io (post-MVP)

---

*Built at MAJU, for MAJU. By a student who got tired of needing a parchi to use their skills.*
