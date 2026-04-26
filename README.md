# Command Center

Personal sales intelligence + research vault. Solo build, desktop-only, hosted on Vercel.

This repo follows the build order in the PRD. **Phase 1 (foundation)** is complete: Next.js 14 (App Router) + Tailwind + shadcn/ui + dark mode, MongoDB connection helper, NextAuth.js Google OAuth with Drive scope and a single-email gate, protected `/dashboard/*` and `/api/*` routes, and a desktop-only guard that blocks anything below 1024px.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui + `next-themes` (light/dark) |
| Auth | NextAuth.js + Google OAuth (with `drive.readonly` scope) |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | Anthropic SDK (Claude) — wired in Phase 4 |
| Drive | `googleapis` (Drive API v3) — wired in Phase 3 |
| Deploy | Vercel |

---

## One-time setup

### 1. Install
```bash
cd command-center
npm install
```

### 2. Environment
Copy and fill in:
```bash
cp .env.example .env.local
```

You'll need:

- **`NEXTAUTH_SECRET`** — `openssl rand -base64 32`
- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — see Google Cloud setup below
- **`ALLOWED_EMAIL`** — your Google account; only this email can sign in
- **`MONGODB_URI`** — from MongoDB Atlas (free tier is fine)
- **`LIGHTFIELD_API_KEY` / `LIGHTFIELD_BASE_URL`** — Phase 2
- **`ANTHROPIC_API_KEY`** — Phase 4
- **`CLOUDINARY_*`** — Phase 3
- **`CRON_SECRET`** — `openssl rand -hex 32`

### 3. Google Cloud Console (one-time)
1. Create a project (or reuse one).
2. **APIs & Services → Library**: enable **Google Drive API**.
3. **OAuth consent screen**: External, add your email as a test user. Scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.readonly`.
4. **Credentials → Create OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` (and your Vercel URL later)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (and `https://YOUR-DOMAIN/api/auth/callback/google`)
5. Copy the client ID + secret into `.env.local`.

### 4. MongoDB Atlas (one-time)
1. Create a free M0 cluster.
2. Create a DB user, allow your IP (or 0.0.0.0/0 in dev).
3. Copy the connection string into `MONGODB_URI`. Name the database `command-center`.

### 5. Run
```bash
npm run dev
```
Visit http://localhost:3000 → you'll be redirected to `/login`. Click **Continue with Google**. If your email matches `ALLOWED_EMAIL`, you'll land on `/dashboard/sales`.

---

## What works in Phase 1

- ✅ Google OAuth with Drive scope (read-only)
- ✅ Refresh-token rotation (server-side, persisted to Mongo)
- ✅ Single-email gate (any other Google account is rejected)
- ✅ Middleware protecting `/dashboard/*` and `/api/*` (with `/api/auth/*` and `/api/cron/*` excluded)
- ✅ Shared layout: top nav with Sales / Planning / search-placeholder, theme toggle, user menu, sign out
- ✅ Light / dark / system theme toggle
- ✅ Desktop-only guard below 1024px
- ✅ Stub pages for `/dashboard/sales` and `/dashboard/planning`

## What's next

| Phase | Scope |
|---|---|
| 2 | Lightfield API client, 6-hour cron sync, deal cards UI, manual refresh |
| 3 | Project + Note CRUD, link previews, Cloudinary uploads with drag/drop, Drive linking |
| 4 | MongoDB Atlas Search, unified search UI, Claude summarization (streaming) |

---

## Project layout

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts   # NextAuth handler
│   ├── dashboard/
│   │   ├── layout.tsx                    # Auth-protected shell + nav
│   │   ├── page.tsx                      # Redirects to /sales
│   │   ├── sales/page.tsx                # Sales dashboard (stub)
│   │   └── planning/page.tsx             # Planning grid (stub)
│   ├── login/page.tsx                    # Google sign-in
│   ├── layout.tsx                        # Root layout + Providers
│   ├── page.tsx                          # Root redirect
│   └── globals.css                       # Tailwind + shadcn tokens
├── components/
│   ├── ui/                               # shadcn primitives (button, avatar, dropdown)
│   ├── nav-bar.tsx                       # Top nav
│   ├── desktop-only.tsx                  # < 1024px guard
│   ├── theme-toggle.tsx                  # Light/dark/system
│   └── providers.tsx                     # Session + Theme + React Query
├── lib/
│   ├── auth.ts                           # NextAuth config
│   ├── mongodb.ts                        # Cached Mongoose connection
│   └── utils.ts                          # cn() helper
├── models/
│   └── User.ts                           # Mongoose user (tokens persisted)
├── types/
│   └── next-auth.d.ts                    # Session/JWT augmentation
└── middleware.ts                         # Route protection
```

---

## Deploying to Vercel

1. Push this folder to a Git repo.
2. Import into Vercel.
3. Add every env var from `.env.example`.
4. Update Google OAuth redirect URIs to include `https://<your-domain>/api/auth/callback/google`.
5. Set `NEXTAUTH_URL` to your production URL.

A Vercel cron job is configured in Phase 2 — it'll need `CRON_SECRET` to be set in production env.
