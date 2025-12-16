# LegalOSS Setup

## Development (Zero Config)

```bash
npm install
npm run dev
```

Open http://localhost:3000 → **You're in.** No login required.

When `IS_DEV=true` (set in `.env.development`), auth is completely bypassed.

### Add Your Case.dev API Key

Edit `.env.development` and add your key:
```env
CASE_API_KEY=your_key_here
```

Get a key at https://case.dev

---

## Production

```bash
cp .env.prod.example .env.local
# Edit .env.local with your values
npm run build
npm start
```

---

## Files

| File | Purpose |
|------|---------|
| `.env.development` | Dev config (committed, auth disabled) |
| `.env.prod.example` | Production template |
| `.env.local` | Your secrets (never committed) |
