# LegalOSS Setup Guide

## Quick Start (Development) - 30 Seconds

```bash
# 1. Clone and install
git clone https://github.com/CaseMark/LegalOSS.git
cd LegalOSS
npm install

# 2. Copy the dev env file
cp .env.dev .env.local

# 3. Add your Case.dev API key to .env.local
# Get one at https://case.dev

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000 and click Login
# Credentials are pre-filled: admin-dev@case.dev / password
```

That's it! The only thing you need is a Case.dev API key.

---

## How It Works

When `IS_DEV=true` (set in `.env.dev`):

1. **Database seeds automatically** with a dev admin user
2. **Login form pre-fills** with dev credentials
3. **Just click Login** - no signup required

| Dev Credentials | |
|-----------------|--------------------------|
| Email           | `admin-dev@case.dev`     |
| Password        | `password`               |

---

## Production Setup

```bash
# Copy the production template
cp .env.prod.example .env.local

# Edit .env.local and set:
# - CASE_API_KEY (your production key)
# - AUTH_SECRET (run: openssl rand -base64 32)
# - NEXTAUTH_SECRET (same as AUTH_SECRET)
# - NEXTAUTH_URL (your domain)
```

In production (`IS_DEV=false`):
- No admin is pre-seeded
- First user to register becomes admin
- Signup disabled after first admin created

---

## Environment Files

| File | Purpose | Committed? |
|------|---------|------------|
| `.env.dev` | Dev defaults, just add API key | ✅ Yes |
| `.env.prod.example` | Production template | ✅ Yes |
| `.env.local` | Your secrets (copied from above) | ❌ No |

---

## Database

Uses **PGlite** (PostgreSQL in WebAssembly):
- Zero native dependencies
- Works everywhere (Docker, sandboxes, any OS)
- Data stored in `./data/pgdata/`

Reset database:
```bash
rm -rf data/pgdata && npm run dev
```

---

## Troubleshooting

**"Login failed"** - Refresh and wait 2-3 seconds, or reset the database.

**"Configuration error"** - Check `.env.local` has all required vars from `.env.dev`.

**Port conflict** - Kill other Next.js processes: `pkill -f next`
