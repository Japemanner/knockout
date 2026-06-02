# Research: Multi-Kanban Workspace

**Feature**: 001-multi-kanban-workspace
**Phase**: 0 — Technology Research & Decisions
**Date**: 2026-06-02

## R1: Next.js 15 vs Vite — Migratiebesluit

**Decision**: Migreren van Vite SPA naar Next.js 15 App Router.

**Context**: De specificeert Next.js 15 met server actions, @supabase/ssr cookie-auth, en middleware. De bestaande codebase is Vite + React 18 + react-router-dom met client-side Supabase auth.

**Alternatives considered**:
1. **Next.js 15 migratie** (gekozen): Volledige migratie. Server actions, middleware, SSR-compatibele auth.
2. **Vite blijven + Express backend toevoegen**: Werkt technisch maar mist server actions, middleware, en @supabase/ssr integratie. Vereist eigen API-laag wat meer code en onderhoud betekent.
3. **Apart Next.js project naast Vite**: Twee projecten met gedeelde Supabase, complexe deploy-config.

**Reasoning**: Next.js 15 App Router met server actions elimineert de noodzaak voor een aparte API-laag. Supabase @supabase/ssr met cookie-based auth is veiliger (geen tokens in localStorage) en werkt beter met SSR. De bestaande pagina's zijn relatief eenvoudig te porten (React components blijven React components).

**Trade-offs**: 
- Migratie-effort voor ~7 bestaande pagina's en auth flow
- Leercurve voor team op server actions en App Router patronen
- Next.js op Netlify vereist `@netlify/plugin-nextjs`

## R2: Drag-and-Drop — @dnd-kit

**Decision**: @dnd-kit/core + @dnd-kit/sortable

**Context**: Multi-kolom Kanban met cross-board drag-and-drop. Vereist sortable lists, droppable zones, en drag overlays.

**Alternatives considered**:
1. **@dnd-kit** (gekozen): Modulair, toegankelijk (keyboard support), tree-shakeable, actief onderhouden, React-first API.
2. **react-beautiful-dnd**: Verouderd (geen React 18 support, geen onderhoud).
3. **Pragmatic drag and drop (Atlassian)**: Relatief nieuw, minder community, complexere setup.

**Reasoning**: @dnd-kit is de de-facto standaard voor React drag-and-drop in 2024+. Ingebouwde keyboard support sluit aan bij keyboard-first vereiste. Sortable preset voor kolom-herordening, DndContext voor cross-kolom en cross-bord slepen.

**Research notes**: Cross-board drag vereist een BoardSwitcher overlay die tijdens drag een dropdown toont met target borden. De @dnd-kit `DragOverlay` component wordt gebruikt voor de visuele feedback tijdens cross-board drag.

## R3: Externe Postgres-verbindingen — pg (node-postgres)

**Decision**: `pg` (node-postgres) met connection pool management per connectie.

**Context**: Externe PostgreSQL-databases verbinden, schema-introspectie uitvoeren, en CRUD queries draaien — allemaal server-side.

**Alternatives considered**:
1. **pg** (gekozen): Lichtgewicht, geen ORM overhead, directe SQL controle, breed gebruikt.
2. **Knex.js**: Query builder laag bovenop pg. Voegt abstractie toe die dynamische queries bemoeilijkt (tabel/kolom-namen zijn runtime variabelen).
3. **Drizzle ORM**: Vereist schema-definitie op build-time, niet geschikt voor dynamische schema-introspectie.

**Reasoning**: `pg` geeft volledige controle over queries zonder ORM-beperkingen. Schema-introspectie via `information_schema` queries is triviaal met raw SQL. Pool management per connectie voorkomt connection leaks. Parameterized queries (`$1`, `$2`, ...) voorkomen SQL injection.

**Security**: Connection pool per connectie met 10s statement_timeout. Pool wordt vernietigd bij verwijderen connectie. Connection strings nooit naar client. Encryptie/decryptie via Web Crypto API (AES-256-GCM) met `ENCRYPTION_KEY` uit server-side env.

## R4: Encryptie — AES-256-GCM

**Decision**: Web Crypto API (AES-256-GCM) met server-side `ENCRYPTION_KEY`.

**Context**: Externe Postgres-connection strings moeten encrypted at rest in Supabase opgeslagen worden.

**Alternatives considered**:
1. **Web Crypto API** (gekozen): Built-in Node.js (geen dependency), AES-256-GCM, nonce-based.
2. **crypto-js**: Extra dependency, minder veilig dan native Web Crypto.
3. **Supabase Vault**: Supabase's eigen secrets manager. Vereist Supabase Pro/Team plan. Beperkt tot Supabase-ecosysteem.

**Reasoning**: Bestaande codebase gebruikt al Web Crypto API voor n8n webhook token encryptie (`src/lib/webhook.ts`). Zelfde patroon hergebruiken. `ENCRYPTION_KEY` als 256-bit key in Netlify env vars (server-side only).

## R5: RSS/Atom Parsing — rss-parser

**Decision**: `rss-parser` npm package (server-side only).

**Context**: RSS/Atom feeds ophalen en parsen. Moet server-side gebeuren vanwege CORS.

**Alternatives considered**:
1. **rss-parser** (gekozen): Lichtgewicht, ondersteunt RSS 2.0 en Atom, TypeScript types beschikbaar.
2. **feedparser**: Complexere API, minder actief onderhouden.
3. **Zelf XML parsen**: Foutgevoelig, edge cases met namespaces en encodings.

**Reasoning**: rss-parser is de standaard keuze met 2M+ wekelijkse downloads. API is eenvoudig: `parser.parseURL(url)`. Caching-strategie: feed data 5 minuten cachen in memory (per-request) om rate limiting te voorkomen.

## R6: Markdown rendering — react-markdown + remark-gfm

**Decision**: `react-markdown` met `remark-gfm` voor GitHub Flavored Markdown support.

**Context**: Kaartomschrijvingen in markdown moeten gerenderd worden in de detail-modal.

**Alternatives considered**:
1. **react-markdown** (gekozen): Actief onderhouden, plugin-systeem, veilig (geen raw HTML by default).
2. **marked**: Niet React-specifiek, vereist `dangerouslySetInnerHTML`.
3. **markdown-to-jsx**: Minder populair, minder plugin-ecosysteem.

## R7: Datumkiezer — geen extra dependency

**Decision**: Native `<input type="date">` en `<input type="datetime-local">` voor de MVP.

**Context**: Date/timestamp velden in dynamische CRUD-formulieren voor externe DB's.

**Reasoning**: Geen extra dependency voor een eenvoudige datepicker. Native inputs zijn toegankelijk, werken op alle browsers, en vereisen geen bundling van een date library. Indien later nodig, kan `react-day-picker` (gebruikt door shadcn/ui) toegevoegd worden.

## R8: Sneltoetsen — Custom hook

**Decision**: Zelfgebouwde `useKeyboardNav` hook met `useEffect` + `keydown` listener.

**Context**: J/K navigatie, S voor ster, N voor nieuwe kaart, / voor search.

**Reasoning**: Geen dependency nodig. Eenvoudige keydown handler gefilterd op target (niet afvuren in input/textarea). Scope-aware: andere shortcuts in verschillende contexten (bord-view vs global).

## Dependencies toe te voegen aan package.json

```json
{
  "next": "^15.1.0",
  "@supabase/ssr": "^0.5.0",
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.0",
  "pg": "^8.13.0",
  "rss-parser": "^3.13.0",
  "react-markdown": "^9.0.0",
  "remark-gfm": "^4.0.0",
  "@netlify/plugin-nextjs": "^5.7.0"
}
```
