# LegalOSS

Open-source legal practice management platform with AI superpowers. Built with Next.js 16, powered by [Case.dev](https://case.dev).

## Setup

   ```bash
# Install dependencies
bun install

# Configure environment
   cp .env.example .env.local
# Add your CASE_API_KEY from console.case.dev
# Generate NEXTAUTH_SECRET with: openssl rand -base64 32

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and create your admin account.

## Environment Variables

```env
# Case.dev API
   CASE_API_KEY=sk_case_your_api_key_here
   CASE_API_URL=https://api.case.dev

# NextAuth
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

Get your API key from [console.case.dev](https://console.case.dev).

## Features

Vaults • OCR • Transcription • AI Chat • Case Management • RBAC • GraphRAG • Semantic Search

See [docs.case.dev](https://docs.case.dev) for API documentation.

## License

MIT - see [LICENSE](LICENSE)
