# LegalOSS Setup Guide

## Quick Start (Development) - 2 Minutes

### 1. Clone and Install

```bash
git clone https://github.com/CaseMark/LegalOSS.git
cd LegalOSS
npm install
```

### 2. Create `.env.local`

Create a file named `.env.local` in the project root:

```env
# ===========================================
# DEVELOPMENT CONFIGURATION
# Copy this exactly for dev mode to work
# ===========================================

# Dev Mode - enables pre-seeded admin user
IS_DEV=true

# NextAuth - required for authentication
AUTH_SECRET=dev-secret-do-not-use-in-production-1234567890
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-do-not-use-in-production-1234567890

# Case.dev API - get your key at https://case.dev
CASE_API_KEY=your_case_api_key_here
CASE_API_URL=https://api.case.dev
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Login (Zero Config!)

1. Open http://localhost:3000
2. You'll be redirected to the login page
3. The form is **automatically pre-filled** with dev credentials
4. Just click **"Login"** - that's it!

**Dev Credentials (auto-filled):**
| Field | Value |
|-------|-------|
| Email | `admin-dev@case.dev` |
| Password | `password` |

---

## How Dev Mode Works

When `IS_DEV=true`:

1. **On first page load**, the login form calls `/api/auth/dev-credentials`
2. **This triggers database seeding** - creates the dev admin user
3. **Credentials are returned** and pre-filled in the form
4. **You just click Login** - no signup required!

The seeding is **atomic and race-condition safe**:
- Mutex lock prevents duplicate admin creation
- Credentials endpoint waits for seeding to complete
- Form won't show credentials until admin exists

---

## Production Setup

For production, create `.env.local` with:

```env
# ===========================================
# PRODUCTION CONFIGURATION
# ===========================================

# Production Mode - disables dev features
IS_DEV=false

# NextAuth - REQUIRED, generate a secure secret
# Run: openssl rand -base64 32
AUTH_SECRET=your_secure_production_secret_here
AUTH_TRUST_HOST=true
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secure_production_secret_here

# Case.dev API - REQUIRED
CASE_API_KEY=your_production_api_key
CASE_API_URL=https://api.case.dev
```

In production:
- No admin is pre-seeded
- First user to register becomes admin
- Login form is NOT pre-filled
- Signup is disabled after first admin created

---

## Environment Variables Reference

| Variable | Required | Dev Default | Description |
|----------|----------|-------------|-------------|
| `IS_DEV` | No | `false` | Enable dev mode with pre-seeded admin |
| `AUTH_SECRET` | Yes | - | NextAuth JWT signing secret |
| `AUTH_TRUST_HOST` | Yes | - | Must be `true` for localhost |
| `NEXTAUTH_URL` | Yes | - | Full URL of your app |
| `NEXTAUTH_SECRET` | Yes | - | Same as AUTH_SECRET |
| `CASE_API_KEY` | Yes | - | Your Case.dev API key |
| `CASE_API_URL` | No | `https://api.case.dev` | Case.dev API endpoint |

---

## Database

LegalOSS uses **PGlite** - PostgreSQL compiled to WebAssembly:

- **Zero native dependencies** - no compilation required
- **Works everywhere** - Linux, macOS, Windows, Docker, sandboxes
- **Auto-initializes** - creates tables on first run
- **Persists to disk** - data stored in `./data/pgdata/`

To reset the database:
```bash
rm -rf data/pgdata
npm run dev
```

---

## Troubleshooting

### "Login failed - Invalid email or password"

The database may not have seeded yet. Solutions:
1. Refresh the page and wait 2-3 seconds before clicking Login
2. Delete `data/pgdata/` and restart the server
3. Check that `IS_DEV=true` is in your `.env.local`

### "Configuration" error on login page

Missing or invalid NextAuth config:
1. Ensure `AUTH_SECRET` and `NEXTAUTH_SECRET` are set
2. Ensure `AUTH_TRUST_HOST=true` is set
3. Ensure `NEXTAUTH_URL=http://localhost:3000` matches your port

### Server won't start

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Ensure Node.js 18+ is installed

---

## Dev Credentials

When `IS_DEV=true`, these credentials are auto-created and pre-filled:

```
Email:    admin-dev@case.dev
Password: password
Role:     admin
```

Defined in: `src/lib/auth/dev-seed.ts`
