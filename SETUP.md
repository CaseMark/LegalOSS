# LegalOSS Setup

## Development

```bash
npm install
```

Add your Case.dev API key to `.env.development`:
```env
CASE_API_KEY=your_key_here
```

```bash
npm run dev
```

Open http://localhost:3000 → **Done.** No `.env.local` needed.

> Next.js auto-loads `.env.development` in dev mode.

Get a key at https://case.dev

---

## Production

```bash
cp .env.prod.example .env.local
# Add your CASE_API_KEY and generate AUTH_SECRET
npm run build && npm start
```

---

## Files

| File | Loaded When | Committed |
|------|-------------|-----------|
| `.env.development` | `npm run dev` | ✅ Yes |
| `.env.prod.example` | Template only | ✅ Yes |
| `.env.local` | Always (overrides) | ❌ Never |

**Do NOT create `.env.local` for development.** It's only needed for production secrets.
