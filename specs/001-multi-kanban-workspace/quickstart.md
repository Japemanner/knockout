# Quickstart: Multi-Kanban Workspace Development

**Feature**: 001-multi-kanban-workspace
**Phase**: 1 — Local Development Setup
**Date**: 2026-06-02

## Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (`npm i -g supabase`)
- Git

## Environment Setup

1. **Clone en install**:
```bash
git clone <repo-url>
cd knockout
git checkout 001-multi-kanban-workspace
npm install
```

2. **Environment variabelen** (kopieer `.env.example` → `.env.local`):
```env
# Supabase (bestaand project)
NEXT_PUBLIC_SUPABASE_URL=https://ddfjigrjwlfpaljhhogv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Server-only (nooit met NEXT_PUBLIC_ prefix)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ENCRYPTION_KEY=<256-bit-base64-key>

# Optioneel: externe test-database
TEST_DB_URL=postgresql://user:pass@localhost:5432/testdb

# Snyk (voor fitness checks)
SNYK_API_KEY=<your-snyk-key>
GITHUB_TOKEN=<your-gh-token>
```

3. **Genereer ENCRYPTION_KEY** (eenmalig):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Database Setup

1. **Start Supabase lokaal** (optioneel, voor lokale dev):
```bash
supabase start
```

2. **Run migraties** (tegen Supabase cloud instance):
- De bestaande migratie `001_initial_schema.sql` bevat de AI-platform tabellen
- Nieuwe migratie `002_kanban_workspace.sql` bevat de Kanban-tabellen
- Via Supabase MCP of Supabase CLI:
```bash
supabase db push
```

## Development

```bash
# Start dev server (Next.js met Turbopack)
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## Project Structuur (na migratie naar Next.js)

```
knockout/
├── src/
│   ├── app/           # Next.js App Router pagina's
│   ├── actions/       # Server actions
│   ├── components/    # React componenten
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities (supabase, db pool, encrypt, RSS parser)
│   ├── store/         # Zustand stores
│   └── types/         # TypeScript types
├── supabase/
│   └── migrations/    # SQL migraties
├── specs/
│   └── 001-multi-kanban-workspace/  # Deze feature documentatie
├── netlify.toml
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Netlify Deployment

`netlify.toml` wordt aangepast voor Next.js:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Supabase env vars worden ingesteld via Netlify UI of CLI:
```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL https://xxx.supabase.co
netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY eyJ...
netlify env:set SUPABASE_SERVICE_ROLE_KEY eyJ...      # Server-only
netlify env:set ENCRYPTION_KEY <base64-key>            # Server-only
```

## Testing

```bash
# Playwright e2e (via Playwright MCP in development)
# Unit tests (toe te voegen)
npm test
```
