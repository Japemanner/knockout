# Contract: Server actions — content-kalender

**Feature**: 023-content-kalender | **Date**: 2026-10-14 | **Reconcilie**: 2026-10-14 — dit contract volgt de geïmplementeerde acties in `src/actions/content.ts`.

## Locatie

`src/actions/content.ts`. Alle actions via `getAuthenticatedClient()` (ingelogde gebruiker; RLS geldt). Retourtype `ActionResult<T>` conform het uren-patroon. **Geen `revalidatePath`**: na mutaties invalideert de client de React Query-caches (besluit `2026-09-22-uren-reads-browser-client.md`). Elke action die status of tekst wijzigt roept `validateStatusChange` aan en weigert ongeldige combinaties server-side, zodat API-bypass onmogelijk is.

## Contentsoorten (pillars)

### createPillar

```typescript
export async function createPillar(input: {
  name: string                       // verplicht, getrimd
  audience?: string | null
  description?: string | null
  color: PillarColor                 // 1 van de 8 vaste waarden
}): Promise<ActionResult<ContentPillar>>
```

- Valideert naam en kleur (NL-meldingen); `position` = `MAX(position) + 1` (append in de beheer-dialoog).

### updatePillar

```typescript
export async function updatePillar(pillarId: string, patch: ...): Promise<ActionResult<ContentPillar>>
```

- Wijzigt naam/doelgroep/beschrijving/kleur van een eigen soort.

### setPillarArchived

```typescript
export async function setPillarArchived(pillarId: string, archived: boolean): Promise<ActionResult<ContentPillar>>
```

- Archiveren (FR-003): gearchiveerde soorten krijgen geen nieuwe lege slots (pure slotberekening filtert) en zijn in de editor niet kiesbaar; posts behouden hun soort. Geen verwijder-action voor pillars.

## Weekslots

### upsertSlot

```typescript
export async function upsertSlot(input: {
  pillarId: string
  weekday: number        // 1-7 (ISO: 1 = maandag)
  time: string          // 'HH:MM'
  active?: boolean      // default true
}): Promise<ActionResult<ContentSlot>>
```

- Ownership-check: pillar behoort aan de gebruiker; `weekday` gevalideerd op 1-7.
- Upsert op `(pillar_id, weekday)`: een **nieuwe** slot-rij krijgt `created_at = now()` (geldigheidsstart, FR-005); een bestaande rij behoudt zijn `created_at` zolang de dag al een slot had.

### deleteSlot

```typescript
export async function deleteSlot(slotId: string): Promise<ActionResult<null>>
```

- Verwijdert één weekdag-slot (dag volledig uit).

## Posts

### createPost

```typescript
export async function createPost(input: {
  title: string
  pillar_id?: string | null
  format?: ContentFormat            // default 'tekst'
  status?: ContentStatus            // default 'idee'
  planned_date?: string | null      // 'YYYY-MM-DD' | null (null = ideeënbak)
  planned_time?: string | null      // 'HH:MM' | null
  body?: string
  source_url?: string | null
  linkedin_url?: string | null
  notes?: string | null
}): Promise<ActionResult<ContentPost>>
```

- `validateStatusChange` server-side (Klaar/Gepland/Live eisen body ≤ 3.000; Gepland/Live eisen datum + tijd — zie ook DB-vingnet); status `gepland` bij aanmaak → `scheduled_on_linkedin_at := now()` (FR-024).

### updatePost

```typescript
export async function updatePost(postId: string, patch: ...): Promise<ActionResult<ContentPost>>
```

- Patch + huidige waarden samengevoegd → `validateStatusChange` op het resultaat; weigering → NL-melding (FR-023).
- Overgang naar Gepland → `scheduled_on_linkedin_at := now()`; overgang naar een status lager dan Gepland (`isLowerStatus`) → gewist (FR-024).
- `linkedin_url` gevuld → `isValidLinkedInUrl` (prefix `https://www.linkedin.com/`, FR-025); anders weigering.
- Datum-/tijdwijziging bij status Gepland → `linkedinHint: true` in het resultaat zodat de client "Pas de datum ook aan in LinkedIn" toont (FR-031).

### movePost

```typescript
export async function movePost(
  postId: string,
  date: string | null,   // 'YYYY-MM-DD' = dagcel; null = ideeënbak
  time: string | null,
): Promise<ActionResult<ContentPost>>
```

- Eén action voor alle sleep-richtingen (FR-029/FR-030/FR-032):
  - status Live → weigering "Een live post kan niet verplaatst worden." (server-side guard).
  - doel = ideeënbak (`date = null`) bij status Gepland → weigering met uitleg (FR-030); wist bij Idee/Concept/Klaar `planned_date` en `planned_time`.
  - doel = dagcel: tijd via `resolveDropTime` (open slot van de soort op de doeldag → slottijd; anders bestaande tijd; anders 08:00); status ongewijzigd.
  - status Gepland → `linkedinHint` voor de LinkedIn-melding (FR-031).

### deletePost

```typescript
export async function deletePost(postId: string): Promise<ActionResult<null>>
```

- Verwijdert de rij (RLS: alleen eigen posts). Bevestiging vraagt de client vóór de aanroep (FR-027).
- **Uitbreidingspunt feature 024**: vóór verwijderen eerst bijlagen uit Storage opruimen (`specs/024-post-bijlagen/contracts/attachments.md`).

## Pre/post-conditions (alle actions)

| Voorwaarde | Verwachting |
|------------|-------------|
| Pre: ingelogde gebruiker | `getAuthenticatedClient()`; anders fout |
| Pre: eigen data | RLS dwingt af; actions checken bovendien expliciet op bestaan/eigenaarschap |
| Pre: statuswijziging | `validateStatusChange` weigert ongeldige combinaties server-side |
| Post: mutatie persistent | Eén insert/update/delete; retourneert actuele rij |
| Post: client-cache vers | Client invalideert `contentKeys` na succes; géén `revalidatePath` |
| Invariant: slot-voorkomens worden nooit opgeslagen | Alleen `kk_content_slots`-rijen; voorkomens blijven afgeleid (`calendar.ts`) |