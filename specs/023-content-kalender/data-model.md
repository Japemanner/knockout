# Data Model: LinkedIn content-kalender

**Feature**: 023-content-kalender | **Date**: 2026-10-14 | **Reconcilie**: 2026-10-14 — dit document volgt de parallel ontstane implementatie (`supabase/migrations/022_content_calendar.sql`, `src/actions/content.ts`, `src/lib/content/calendar.ts`, `src/lib/content/queries.ts`).

## Overzicht

Drie nieuwe tabellen (RLS, user-scoped), één nieuwe route met SSR-prefetch, en pure afleidingslogica client-side in één module (`src/lib/content/calendar.ts`). Bestanden staan in Supabase Postgres; slot-voorkomens worden nergens opgeslagen — ze zijn afgeleid.

## Nieuwe entiteiten

### kk_content_pillars (contentsoort/"pillar")

| Kolom | Type | Regels | Rol |
|-------|------|--------|-----|
| id | uuid pk default gen_random_uuid() | — | Identificator |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope |
| name | text not null | — | Naam (verplicht, FR-001) |
| audience | text | — | Doelgroep |
| description | text | — | Korte beschrijving |
| color | text not null default 'blue' | CHECK in ('blue','green','orange','purple','pink','yellow','teal','gray') | Kleurcodering kalender (FR-001) |
| archived | boolean not null default false | — | Archiveren i.p.v. verwijderen (FR-003) |
| position | int not null default 0 | — | Volgorde in de beheer-dialoog |
| created_at / updated_at | timestamptz not null | default now() / trigger `set_updated_at` | Audit |

### kk_content_slots (weekslot)

| Kolom | Type | Regels | Rol |
|-------|------|--------|-----|
| id | uuid pk default gen_random_uuid() | — | Identificator |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope |
| pillar_id | uuid not null | references kk_content_pillars(id) on delete cascade | Soort waartoe het slot hoort |
| weekday | smallint not null | CHECK 1-7; ISO: 1 = maandag … 7 = zondag | Weekdag (FR-002) |
| post_time | time not null default '08:00' | — | Slottijd (FR-002) |
| active | boolean not null default true | — | Per dag aan/uit (FR-002) |
| created_at | timestamptz not null default now() | — | **Geldigheidsstart van het slot** (FR-005) |
| updated_at | timestamptz | trigger | Audit |

- `UNIQUE (pillar_id, weekday)` — één slot per soort per weekdag (spec-aanname).

### kk_content_posts (post)

| Kolom | Type | Regels | Rol |
|-------|------|--------|-----|
| id | uuid pk default gen_random_uuid() | — | Identificator |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope |
| pillar_id | uuid | references kk_content_pillars(id) on delete **set null** | Soort, optioneel (FR-017); SET NULL als vangnet bij handmatige verwijdering (app archived, deleted nooit) |
| title | text not null | — | Interne titel (verplicht) |
| body | text not null default '' | — | Volledige posttekst (geen DB-lengtegrens: een Concept mag tijdelijk >3.000; app bewaakt bij statusovergangen) |
| format | text not null default 'tekst' | CHECK in ('tekst','afbeelding','carrousel','video','poll') | Format (FR-019) |
| status | text not null default 'idee' | CHECK in ('idee','concept','klaar','gepland','live') | Status in vaste volgorde (FR-023) |
| planned_date | date | nullable | Geplande dag; NULL = ideeënbak (FR-018) |
| planned_time | time | nullable | Tijd; NULL = zonder tijdlabel (sorteert na de posts mét tijd) |
| source_url | text | — | Bron-URL |
| linkedin_url | text | — | Live-post URL; moet beginnen met `https://www.linkedin.com/` (FR-025, app-gevalideerd) |
| notes | text | — | Notities |
| scheduled_on_linkedin_at | timestamptz | nullable | Moment van inplannen in LinkedIn (FR-024): gezet bij overgang naar Gepland, gewist bij lagere status |
| created_at / updated_at | timestamptz not null | default now() / trigger | Audit |

- **DB-vingnet** `kk_content_posts_datetime_required`: `status NOT IN ('gepland','live') OR (planned_date IS NOT NULL AND planned_time IS NOT NULL)` — Gepland/Live vereisen altijd datum+tijd, ook bij directe SQL (app weigert eerst met NL-melding).
- Indexen: `idx_kk_content_posts_user_date (user_id, planned_date)`, `idx_kk_content_slots_user`, `idx_kk_content_pillars_user`.

## RLS

Alle drie tabellen: `enable row level security` + vier policies per tabel (select/insert/update/delete op `user_id = auth.uid()`) — 007-patroon, 12 policies totaal. Gearchiveerde soorten zijn een UI-filter (`archived = false`), geen RLS-verschil.

## Pure afleidingslogica — `src/lib/content/calendar.ts` (geïmplementeerd)

Geen React, geen Supabase; volledig unit-testbaar (`tests/e2e/content-calendar-logic.spec.ts`, decimal-helper-patroon). Datums zijn `YYYY-MM-DD`-strings (lexicografisch = chronologisch); "vandaag" via het Intl-patroon uit `src/lib/hours/dates.ts` (Europe/Amsterdam — nooit `toISOString()` op lokale datums).

| Export | Doel |
|--------|------|
| `buildMonthGrid(year, month)` / `buildMonthGridForYm(ym)` | Weken (ma t/m zo) van het raster; dagen buiten de maand inbegrepen met `inMonth: false` (weekmatching loopt per ISO-week, FR-008) |
| `computeSlotOccurrences(...)` | Lege slot-voorkomens per maand: weekday 1-7 × `active` × datum ≥ slot.`created_at`-datum (FR-005) |
| `matchSlots(occurrences, posts)` | Koppelregel FR-016: voorkomens op volgorde (datum, tijd) ↔ posts van de soort in die ISO-week op volgorde; retourneert de ongevulde voorkomens |
| `slotState(date, today)` → `'open' \| 'gemist'` | Open (klikbaar) vs. gemist (grijs, niet klikbaar, FR-014) |
| `isOverdue(post, today)` | Verlopen: datum < vandaag én status in (idee, concept, klaar) (FR-015) |
| `validateStatusChange(post, next)` / `isLowerStatus` | Statusregels FR-023/FR-024 (tekst ≤3.000 bij Klaar/Gepland/Live; datum+tijd bij Gepland/Live); server-side in elke mutatie aangeroepen |
| `isValidLinkedInUrl(url)` | Prefix `https://www.linkedin.com/` (FR-025) |
| `charCount` / `hookPreview` | Tekenteller (FR-020) en hook-preview: tot 3e regeleinde of 210 tekens + "…meer" (FR-021) |
| `resolveDropTime(...)` | Tijdregel bij slepen (FR-029): open slot van de soort op de doeldag → slottijd; anders bestaande tijd; anders 08:00 |
| `statusLabel` / `formatLabel` / `displayTime` | Weergave-labels |
| Constanten | `MAX_BODY_LENGTH = 3000`, `HOOK_CHAR_LIMIT = 210`, `DEFAULT_DROP_TIME = '08:00'` |

## Status-machine (post)

```text
idee ⇄ concept ⇄ klaar ⇄ gepland ⇄ live   (vrij te wisselen, alle richtingen)
→ klaar/gepland/live : body niet-leeg AND ≤ 3.000          [FR-023, app + validateStatusChange]
→ gepland/live       : planned_date en planned_time        [FR-023, app + DB-vingnet]
→ gepland            : scheduled_on_linkedin_at := now()   [FR-024]
→ lager dan gepland  : scheduled_on_linkedin_at := null    [FR-024]
```

## Query-vormen — `src/lib/content/queries.ts` (geïmplementeerd, uren-patroon)

Gedeeld server (SSR-prefetch) en browser (reads na hydratie); géén 'use server'; errors throwen; `UntypedClient`-patroon als in hours/queries.ts.

```text
fetchPillarsWithSlots(supabase, userId)  → PillarWithSlots[]   (kk_content_pillars + kk_content_slots, één round-trip)
fetchMonthPosts(supabase, userId, ...)   → ContentPost[]       (planned_date binnen maandvenster, op datum/tijd)
fetchIdeas(supabase, userId)             → ContentPost[]       (planned_date IS NULL, nieuwste eerst — ideeënbak)
contentKeys                              → React Query-keys (pillars / maand-posts / ideas), gedeeld met page.tsx
```

## Mutatievormen — `src/actions/content.ts` (geïmplementeerd)

| Action | Gedrag |
|--------|--------|
| `createPillar` / `updatePillar` / `setPillarArchived` | Soort-CRUD + archiveren (FR-001/FR-003); position append |
| `upsertSlot` / `deleteSlot` | Weekslot per (pillar, weekday) aan/uit + tijd (FR-002); upsert behoudt created_at bij ongewijzigde dagen |
| `createPost` / `updatePost` | Statusregels server-side via `validateStatusChange` (FR-023); `scheduled_on_linkedin_at`-logica (FR-024); LinkedIn-URL-check (FR-025) |
| `movePost(postId, date, time)` | Eén action voor dag → dag, dag → ideeënbak (`date = null`) en idee → dag (FR-029/FR-030/FR-032-weigeringen server-side) |
| `deletePost` | Rij verwijderen; **uitbreidingspunt feature 024** (bijlagen opruimen vóór verwijderen) |

## Database-impact

- **Nieuwe tabellen**: 3 (`kk_content_pillars`, `kk_content_slots`, `kk_content_posts`)
- **Nieuwe migraties**: 1 — `supabase/migrations/022_content_calendar.sql` (idempotent; 007-stijl); toegepast via SQL Editor (kanban-R3)
- **RLS-wijzigingen**: 12 nieuwe policies (4 per tabel)
- **Nieuwe RPC's**: geen
- **Types**: `src/types/database.types.ts` handmatig uitgebreid met `ContentPillar`/`ContentSlot`/`ContentPost` + DB-mapping (na toepassen van de migratie op een lokale/remote database kan `npm run types:update` ze genereren)