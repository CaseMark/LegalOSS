# LegalOSS Setup

## Development (2 steps)

```bash
npm install
```

Edit `.env.development` and add your Case.dev API key:
```env
CASE_API_KEY=your_key_here
```

```bash
npm run dev
```

Open http://localhost:3000 → **You're in.** No login required.

Get a Case.dev API key at https://case.dev

---

## Production

```bash
cp .env.prod.example .env.local
# Edit .env.local - add CASE_API_KEY and generate AUTH_SECRET
npm run build && npm start
```

---

## Environment Files

| File | Purpose | Needs Edit? |
|------|---------|-------------|
| `.env.development` | Dev config | Add `CASE_API_KEY` |
| `.env.prod.example` | Prod template | Copy to `.env.local` |
| `.env.local` | Your secrets | Never committed |
