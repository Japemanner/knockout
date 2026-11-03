# Contract: Server Actions — Content-ideeën

**Feature**: 026-content-ideas-views | **Date**: 2026-11-03

Alle acties staan in `src/actions/content.ts`, gebruiken `getAuthenticatedClient()` en geven het bestaande `ActionResult<T>`-patroon terug. Er is geen `revalidatePath`: de client invalideert de React Query-keys (`contentKeys`). Elke actie valideert server-side; de UI-validatie is alleen voor snelle feedback.

```ts
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }
```

## Contentsoorten (ongewijzigd)

### createPillar

```ts
createPillar(input: {
  name: string
  audience?: string | null
  description?: string | null
  color: PillarColor
}): Promise<ActionResult<ContentPillar>>
```

- `name` wordt getrimd; leeg → `{ success: false, error: 'De naam van de contentsoort is verplicht.' }`.
- `color` moet een van de acht vaste kleuren zijn.
- `position` = hoogste bestaande positie + 1.
- Retourneert de aangemaakte rij.
- Er is geen `deletePillar`-actie; migratie 025 verwijdert ook de DELETE-policy op `kk_content_pillars`, zodat archiveren de enige weg is (FR-019).

### updatePillar

```ts
updatePillar(
  pillarId: string,
  patch: Partial<Pick<ContentPillar, 'name' | 'audience' | 'description' | 'color'>>,
): Promise<ActionResult<ContentPillar>>
```

- Alleen meegegeven velden worden bijgewerkt.
- `name` leeg → fout; `color` onbekend → fout.
- Lege `audience`/`description` → NULL.

### setPillarArchived

```ts
setPillarArchived(pillarId: string, archived: boolean): Promise<ActionResult<ContentPillar>>
```

- Zet `archived`; verwijdert niets. Bestaande posts houden hun `pillar_id`.

## Ideeën

### createPost

```ts
createPost(input: {
  title: string
  pillar_id?: string | null
  body?: string
  source_url?: string | null
  notes?: string | null
  status?: ContentStatus
}): Promise<ActionResult<ContentPost>>
```

Validatie en gedrag:

1. `title` trimmen; leeg → `{ success: false, error: 'De titel is verplicht.' }`.
2. `status` default `'idee'`; moet een bestaande statuswaarde zijn.
3. Als `pillar_id` is gezet:
   - haal de soort op met `id = pillar_id` **en** `user_id = auth.uid()`;
   - niet gevonden of `archived = true` → `{ success: false, error: 'Deze contentsoort is gearchiveerd of bestaat niet meer.' }`.
4. Valideer de status op `{ body, status }` met `validateStatusChange`:
   - `klaar`/`gepland`/`live` vereisen een niet-lege body van ≤3.000 tekens;
   - géén datum-, tijd- of URL-eis.
5. Insert alleen via `buildPostWritePayload`: `user_id`, `title`, `status`, `body`, optioneel `pillar_id`, `source_url`, `notes`.
6. Geen `format`, `planned_date`, `planned_time`, `linkedin_url` of `scheduled_on_linkedin_at` in de insert; die blijven op default/NULL. De whitelist negeert deze keys ook als een aanroeper ze meestuurt.
7. Retourneert de aangemaakte rij (`.select().single()`).

Aanbevolen foutmeldingen:

| Situatie | Melding |
|----------|---------|
| Lege titel | `De titel is verplicht.` |
| Gearchiveerde/onbekende soort | `Deze contentsoort is gearchiveerd of bestaat niet meer.` |
| Klaar/Gepland/Live zonder tekst | `Vul eerst een idee-tekst in voordat je deze status kiest.` |
| Tekst > 3.000 | `De tekst is te lang (maximaal 3.000 tekens).` |
| Databasefout | `Kon het idee niet opslaan` |

### updatePost

```ts
updatePost(
  postId: string,
  patch: Partial<Pick<ContentPost, 'title' | 'pillar_id' | 'body' | 'status' | 'source_url' | 'notes'>>,
): Promise<ActionResult<ContentPost>>
```

Validatie en gedrag:

1. Haal de huidige post op (user-scoped via RLS); niet gevonden → fout.
2. `title` als meegegeven: trimmen; leeg → fout.
3. `pillar_id` als meegegeven **en gewijzigd**:
   - `null` is toegestaan;
   - anders: doelsoort moet van de gebruiker zijn en niet gearchiveerd;
   - de huidige soort mag ongewijzigd blijven, ook als die inmiddels gearchiveerd is.
4. Valideer de samengevoegde staat (`patch` bovenop `current`) met `validateStatusChange`.
5. Update alleen via `buildPostWritePayload`: `title`, `pillar_id`, `body`, `status`, `source_url`, `notes`.
6. **Niet** aanraken: `format`, `planned_date`, `planned_time`, `linkedin_url`, `scheduled_on_linkedin_at`. Bestaande waarden blijven staan, ook als een patch deze keys onverwacht bevat.
7. Retourneert de bijgewerkte rij.

### deletePost

```ts
deletePost(postId: string): Promise<ActionResult<null>>
```

- Ongewijzigd. Rij verwijderen; de UI vraagt eerst om bevestiging.

## Verwijderde acties

De volgende acties horen bij de kalender en verdwijnen:

- `upsertSlot`
- `deleteSlot`
- `movePost`

## Client-invalidatie

| Mutatie | Geïnvalideerde keys |
|---------|---------------------|
| create/update/delete post | `contentKeys.posts` |
| create/update/archive pillar | `contentKeys.pillars` |

- Posts en pillars worden na een geslaagde mutatie geïnvalideerd; de tellingen worden opnieuw afgeleid uit de verse data.
- Voor een directe UI-update mag de hook de cache optimistisch bijwerken (nieuw idee vooraan, gewijzigd idee vervangen, verwijderd idee eruit), gevolgd door invalidatie.
- Bij een fout blijft de bestaande cache intact en toont de UI een destructieve toast.

## Whitelist voor post-schrijfacties

`buildPostWritePayload(patch)` staat in `src/lib/content/ideas.ts` en is de enige plek die bepaalt welke keys naar `kk_content_posts` mogen:

```ts
type PostWritePatch = Partial<Pick<ContentPost, 'title' | 'pillar_id' | 'body' | 'status' | 'source_url' | 'notes'>>

function buildPostWritePayload(patch: PostWritePatch): Record<string, unknown>
```

- Alleen `title`, `pillar_id`, `body`, `status`, `source_url` en `notes` komen in de payload.
- Onbekende of legacy-keys worden genegeerd, ook bij een cast of een direkte API-aanroep.
- De unit-tests in `tests/e2e/content-ideas-logic.spec.ts` voeden een patch met `format`, `planned_date`, `planned_time`, `linkedin_url` en `scheduled_on_linkedin_at` en asserten dat die keys niet in de payload zitten.

## Autorisatie en fouten

- Elke actie gebruikt `getAuthenticatedClient()`; zonder sessie volgt een fout.
- RLS op `kk_content_pillars` en `kk_content_posts` blijft de laatste grens: `user_id = auth.uid()`.
- Geen service-role, geen Edge Function, geen secrets.
