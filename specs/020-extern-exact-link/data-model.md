# Data Model: Extern Exact Link

**Feature**: 020-extern-exact-link | **Date**: 2026-09-23

## Overzicht

De feature introduceert geen nieuwe database-entiteiten, tabellen of migraties. De "data" bestaat uitsluitend uit één statisch frontend-configuratieobject.

## Entiteit: Extern link-item

Een statisch object in de `externalLinks`-array in `src/components/layout/AppShell.tsx`.

| Attribuut | Waarde | Type |
|-----------|--------|------|
| href | `https://portaal.hrsg.nl/` | string (URL) |
| label | `Exact` | string |
| icon | `Calculator` (lucide-react) | React component |

**Relaties**: Onderdeel van de `externalLinks`-array (12 bestaande items + 1 nieuw). Geen relatie met database-objecten.

**Validatie**: Geen — hard-coded statische waarde, geen gebruikersinvoer.

## Database-impact

Geen. De feature raakt geen database-schema, geen RLS-policies, geen storage-buckets en geen Edge Functions. De bestaande `externalLinks`-lijst is puur frontend-configuratie.

## State transitions

Niet van toepassing — statisch item zonder lifecycle.