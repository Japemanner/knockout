# Data Model: Content-ideeën snel vastleggen en overzicht per soort

**Feature**: 026-content-ideas-views | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

## Overzicht

De feature hergebruikt de bestaande content-tabellen (`kk_content_pillars`, `kk_content_posts`) en laat de kalender-only tabel `kk_content_slots` ongemoeid. Er komen geen nieuwe tabellen en geen nieuwe kolommen. Eén idempotente migratie dropt de datum/tijd-constraint en voegt een index toe voor de nieuwe lijstquery.

De zichtbare entiteiten zijn:

- **Idee** = een rij in `kk_content_posts`, getoond in de ideeënlijst en meegeteld in het overzicht.
- **Contentsoort** = een rij in `kk_content_pillars`, gebruikt als groep en kleur.
- **Weekslot** = een rij in `kk_content_slots`; legacy, wordt niet meer gelezen of geschreven.

## Bestaande tabellen en hun nieuwe rol

### kk_content_posts (idee)

| Kolom | Type | Regels | Nieuwe rol |
|-------|------|--------|------------|
| id | uuid pk | default gen_random_uuid() | Identificator |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope |
| pillar_id | uuid | references kk_content_pillars(id) on delete set null | Contentsoort, optioneel; NULL = "Geen soort" |
| title | text not null | app: getrimd niet-leeg (FR-006) | Verplichte titel |
| body | text not null | default `''`; app: ≤3.000 bij Klaar/Gepland/Live | Idee-tekst / posttekst |
| status | text not null | default `'idee'`; CHECK in (`idee`,`concept`,`klaar`,`gepland`,`live`) | Optioneel label (FR-012) |
| source_url | text | nullable | Bron-URL |
| notes | text | nullable | Notities |
| created_at | timestamptz not null | default now() | Sorteersleutel lijst (nieuwste eerst) |
| updated_at | timestamptz not null | trigger `set_updated_at` | Audit/resync editor |
| format | text not null | default `'tekst'`; CHECK | **Legacy** — niet meer gelezen/geschreven |
| planned_date | date | nullable | **Legacy** — niet meer gelezen/geschreven |
| planned_time | time | nullable | **Legacy** — niet meer gelezen/geschreven |
| linkedin_url | text | nullable | **Legacy** — niet meer gelezen/geschreven |
| scheduled_on_linkedin_at | timestamptz | nullable | **Legacy** — niet meer gelezen/geschreven |

- De DB-constraint `kk_content_posts_datetime_required` wordt in migratie 025 gedropt. Zonder die stap kan een statuswijziging naar Gepland/Live zonder datum/tijd niet worden opgeslagen, terwijl de nieuwe UI die velden niet meer aanbiedt.
- Index `idx_kk_content_posts_user_date (user_id, planned_date)` blijft bestaan (ongebruikt door de nieuwe UI, onschadelijk).
- Nieuwe index `idx_kk_content_posts_user_created (user_id, created_at DESC)` ondersteunt de lijst- en telquery.

### kk_content_pillars (contentsoort)

| Kolom | Type | Regels | Rol |
|-------|------|--------|-----|
| id | uuid pk | default gen_random_uuid() | Identificator |
| user_id | uuid not null | references auth.users(id) on delete cascade | Eigenaar; RLS-scope |
| name | text not null | app: getrimd niet-leeg | Naam (FR-018) |
| audience | text | nullable | Doelgroep |
| description | text | nullable | Korte beschrijving |
| color | text not null | default `'blue'`; CHECK 8 kleuren | Kleur in lijst en overzicht |
| archived | boolean not null | default false | Archiveren i.p.v. verwijderen (FR-019) |
| position | int not null | default 0 | Volgorde in beheer en overzicht |
| created_at / updated_at | timestamptz not null | default now() / trigger | Audit |

- Geen schemawijziging. `kk_content_slots` wordt niet meer als relatie opgehaald.

### kk_content_slots (weekslot — legacy)

| Kolom | Type | Nieuwe rol |
|-------|------|------------|
| id / user_id / pillar_id / weekday / post_time / active / created_at / updated_at | bestaand | **Niet meer gelezen of geschreven.** Tabel en RLS blijven staan; bestaande rijen worden genegeerd. |

## Migratie 025_content_ideas.sql

Bestand: `supabase/migrations/025_content_ideas.sql` (volgende vrije nummer; 023 is gereserveerd voor feature 024). Idempotent, handmatig toe te passen via de Supabase SQL Editor of Supabase MCP.

```sql
-- 025_content_ideas.sql
-- Content-ideeën (feature 026): status is een vrij label geworden, dus de
-- datum/tijd-eis voor gepland/live vervalt. Niet-destructief: geen data weg;
-- de pillar-delete-policy wordt wel strikter (archiveren is de enige weg).
ALTER TABLE kk_content_posts
  DROP CONSTRAINT IF EXISTS kk_content_posts_datetime_required;

DROP POLICY IF EXISTS "Users can delete own content pillars" ON kk_content_pillars;

CREATE INDEX IF NOT EXISTS idx_kk_content_posts_user_created
  ON kk_content_posts (user_id, created_at DESC);
```

- **Prerequisite**: migratie `022_content_calendar.sql` moet zijn toegepast (de tabel moet bestaan).
- **Data-impact**: geen. Alleen een constraint, een striktere policy en een index.
- **RLS-impact**: de DELETE-policy op `kk_content_pillars` vervalt; de overige policies blijven gelden.
- **Types**: `src/types/database.types.ts` hoeft niet opnieuw gegenereerd te worden voor deze migratie (geen kolomwijziging). De legacy-kolommen blijven in het type staan met een toelichting.

## Velden die de UI niet meer gebruikt

| Oud veld | Nieuwe UI | Opgeslagen waarde |
|----------|-----------|-------------------|
| `format` | Niet getoond, niet bewerkt | Blijft staan (default `tekst` voor nieuwe rijen) |
| `planned_date` | Niet getoond, niet bewerkt | Blijft staan |
| `planned_time` | Niet getoond, niet bewerkt | Blijft staan |
| `linkedin_url` | Niet getoond, niet bewerkt | Blijft staan |
| `scheduled_on_linkedin_at` | Niet getoond, niet bewerkt | Blijft staan; wordt niet meer gezet of gewist |

Nieuwe ideeën laten deze kolommen op hun default/NULL. Bestaande waarden worden nooit overschreven door de nieuwe acties.

## Validatieregels

### Idee (create)

- `title`: verplicht; `trim()` mag niet leeg zijn.
- `pillar_id`: optioneel. Als gezet: moet bestaan, van de gebruiker zijn en **niet gearchiveerd** (FR-021).
- `status`: default `idee`; moet een van de vijf bestaande waarden zijn.
- `body`: default `''`. Bij status `klaar`, `gepland` of `live`: niet-leeg en ≤3.000 tekens (bestaande regel, zonder datum/tijd/URL-eis).
- `source_url`, `notes`: optioneel; worden getrimd en leeg → NULL.
- Geen `format`, `planned_date`, `planned_time`, `linkedin_url` of `scheduled_on_linkedin_at` in de input.

### Idee (update)

- `title` als meegegeven: verplicht en getrimd niet-leeg.
- `pillar_id` als meegegeven en **gewijzigd**: doelsoort moet bestaan, van de gebruiker zijn en niet gearchiveerd. `null` is toegestaan. De bestaande (mogelijk gearchiveerde) soort van de post mag ongewijzigd blijven.
- `status` als meegegeven:zelfde tekstregel als bij create, gevalideerd op de samengevoegde staat (bestaande body/status + patch).
- Overige velden: `body`, `source_url`, `notes`.
- Geen schrijfactie op legacy-kolommen; `scheduled_on_linkedin_at` wordt niet meer aangeraakt.

### Contentsoort

- `name`: verplicht en getrimd niet-leeg.
- `color`: een van `blue`, `green`, `orange`, `purple`, `pink`, `yellow`, `teal`, `gray`.
- `audience`, `description`: optioneel; leeg → NULL.
- `archived`: boolean; verwijderen bestaat niet.

## Telmodel

`countIdeasByPillar(posts, pillars)` retourneert:

```ts
interface IdeaCountRow {
  pillarId: string | null   // null = "Geen soort"
  name: string              // soortnaam of "Geen soort"
  color: PillarColor | null
  archived: boolean
  count: number
}

interface IdeaCounts {
  rows: IdeaCountRow[]      // alle soorten in position/naam-volgorde, ook met count 0
  total: number             // aantal posts
  unassigned: number        // aantal posts met pillar_id = null
}
```

Regels:

- Elke soort uit `pillars` levert precies één rij, ook bij 0 ideeën (FR-013/SC-006).
- Gearchiveerde soorten horen erbij, met `archived: true` (FR-017).
- De rij "Geen soort" wordt alleen toegevoegd als `unassigned > 0` (FR-014).
- `total` is het aantal posts, ongeacht status of soort (FR-015).
- Een post waarvan `pillar_id` naar een niet-bestaande soort wijst (kan alleen bij handmatige datawijziging) telt als "Geen soort"; de query levert door `ON DELETE SET NULL` normaal geen wezen.

## Query-vormen — src/lib/content/queries.ts

| Functie | Resultaat | Details |
|---------|-----------|---------|
| `fetchPillars(supabase, userId)` | `ContentPillar[]` | `select('*')`, `eq('user_id')`, `order('position')`, `order('name')`; inclusief gearchiveerd |
| `fetchPosts(supabase, userId)` | `ContentPost[]` | `select('*')`, `eq('user_id')`, `order('created_at', { ascending: false })`, `order('id')`; paginering in batches van 1.000 via `.range()` |
| `contentKeys` | React Query-keys | `{ pillars: ['content','pillars'], posts: ['content','posts'] }`; gedeeld met de SSR-prefetch |

Verwijderd: `PillarWithSlots`, `fetchPillarsWithSlots`, `fetchMonthPosts`, `fetchIdeas`, `contentKeys.month`, `contentKeys.ideas`.

## Mutatievormen — src/actions/content.ts

| Action | Gedrag |
|--------|--------|
| `createPillar` | Ongewijzigd; naam, doelgroep, beschrijving, kleur; positie = max + 1 |
| `updatePillar` | Ongewijzigd; naam/doelgroep/beschrijving/kleur |
| `setPillarArchived` | Ongewijzigd; archiveren/heractiveren |
| `createPost` | Titel verplicht; optionele soort (niet gearchiveerd), body, bron-URL, notities, status (default Idee); schrijft via `buildPostWritePayload` alleen de nieuwe velden |
| `updatePost` | Titel/soort/body/status/bron-URL/notities; valideert samengevoegde staat; schrijft via `buildPostWritePayload` en raakt legacy-kolommen niet aan |
| `deletePost` | Ongewijzigd; rij verwijderen |

Verwijderd: `upsertSlot`, `deleteSlot`, `movePost`.

## RLS

De DELETE-policy op `kk_content_pillars` wordt in migratie 025 verwijderd, zodat archiveren de enige weg is (FR-019). De overige policies blijven ongewijzigd: `select`/`insert`/`update` op pillars, alle vier op posts en alle vier op slots, telkens op `user_id = auth.uid()`. `kk_content_posts` houdt zijn delete-policy voor `deletePost`. De nieuwe queries en acties blijven binnen de user-scope. De F-01-controle na de feature bevestigt dat RLS op alle content-tabellen aanstaat en dat de pillar-delete-policy weg is.

## Statusovergangen

```text
idee ⇄ concept ⇄ klaar ⇄ gepland ⇄ live   (vrij te wisselen, alle richtingen)

→ klaar/gepland/live : body niet-leeg AND ≤ 3.000   [app + serveractie]
→ datum/tijd/URL     : geen eis meer                  [velden bestaan niet in de UI]
→ scheduled_on_linkedin_at : niet meer gezet of gewist
```

## Datacontinuïteit

- Alle bestaande rijen in `kk_content_posts` blijven bestaan en verschijnen in de lijst en het overzicht.
- Bestaande `pillar_id`-koppelingen blijven intact; gearchiveerde soorten blijven zichtbaar met markering.
- Bestaande `format`, `planned_date`, `planned_time`, `linkedin_url` en `scheduled_on_linkedin_at`-waarden blijven in de database staan.
- Bestaande `kk_content_slots`-rijen blijven staan maar hebben geen effect meer.
- De preservatietest gebruikt `tests/fixtures/legacy-content.sql` met één vaste legacy-rij, zodat SC-005 niet leeg kan slagen. `buildPostWritePayload` is de whitelist die voorkomt dat een insert/update ooit een legacy-kolom raakt.
