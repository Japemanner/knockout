# Data Model: Command Center gesterde items als kanban bord

**Feature**: 022-command-center-starred-kanban | **Date**: 2026-10-06

## Overzicht

De feature introduceert **geen nieuwe tabellen, kolommen of migraties**. Het command center-bord is een weergave-aggregatie over de bestaande entiteiten `kk_cards`, `kk_columns` en `kk_boards`. Mutaties verlopen via de bestaande RPC `kk_move_card`. RLS-policies blijven ongewijzigd van kracht (alle mutaties lopen via de geauthenticeerde user-scoped client).

## Bestaande entiteiten in deze feature

### kk_cards

| Attribuut | Rol in deze feature |
|-----------|---------------------|
| id | Unieke kaart-id; drag-identificator in DndContext |
| title | Kaartlabel in het CC-bord |
| column_id | Bepaalt (via join op kk_columns.name) de CC-kolom (Backlog/Doing/Done) |
| parent_id | Filter: alleen `NULL` (top-level) komt op het CC-bord |
| is_starred | Filter: alleen `TRUE` komt op het CC-bord; wordt door RPC `kk_move_card` op `false` gezet bij verplaatsen naar Done |
| is_archived | Filter: alleen `FALSE` komt op het CC-bord |
| position | Secundaire sortering binnen een CC-kolom (na bronbordnaam) |

### kk_columns

| Attribuut | Rol in deze feature |
|-----------|---------------------|
| id | Doel van de mutatie: de gelijknamige kolom op het bronbord |
| name | Mapping-bron: `ILIKE 'backlog' / 'doing' / 'done'` → CC-kolom (hoofdletterongevoelig, conform 021) |
| board_id | Verbindt kaart met bronbord |
| position | Vaste volgorde 0/1/2 (conform 021-normalisatie) |

### kk_boards

| Attribuut | Rol in deze feature |
|-----------|---------------------|
| id | Link-doel en revalidate-target (`/boards/<id>`) bij een mutatie |
| name | Bronbord-label op elke CC-kaart (FR-004) + primaire sortering binnen een CC-kolom (FR-012) |

## Nieuwe query-vorm (server component)

Eén nested select op `kk_cards`, vervanging van de huidige query in `command-center/page.tsx`:

```text
kk_cards
  .select(id, title, column_id, is_starred, is_archived, parent_id,
          position, description, url, deadline,
          kk_columns!inner(id, name, position,
            kk_boards!inner(id, name)))
  .eq('is_starred', true)
  .eq('is_archived', false)
  .eq('parent_id', null)
  .eq('kk_columns.kk_boards.user_id', userId)
```

Plus één aanvullende select voor subtasks van gesterde kaarten:

```text
kk_cards
  .select(id, title, parent_id, column_id, position, is_archived, description, url, deadline)
  .in('parent_id', <gesterde kaart-ids>)
  .eq('is_archived', false)
```

En per bronbord de drie kolommen (voor de CardDetailModal `columns`-prop):

```text
kk_columns.select(id, name, position).in('board_id', <bronbord-ids>).order('position')
```

## Kolom-mapping (stateless, geen opslag)

| CC-kolom | Bronbord-kolom | Matching |
|----------|----------------|----------|
| Backlog | `kk_columns.name ILIKE 'backlog'` | Hoofdletterongevoelig |
| Doing | `kk_columns.name ILIKE 'doing'` | Hoofdletterongevoelig |
| Done | `kk_columns.name ILIKE 'done'` | Hoofdletterongevoelig |

Kaarten zonder ILIKE-match (kan niet meer voorkomen na 021-normalisatie; opgevangen als edge case) vallen terug op de CC-kolom **Backlog** tot de gebruiker ze verplaatst (spec edge case).

## State transitions (kaart op CC-bord)

```text
[Backlog] --drag--> [Doing]   : kk_move_card(card, doing_kolom, append-pos); ster behouden
[Doing]   --drag--> [Backlog]  : kk_move_card(card, backlog_kolom, append-pos); ster behouden
[*/Doing] --drag--> [Done]     : kk_move_card(card, done_kolom, append-pos); is_starred := false (RPC)
                                 → kaart verdwijnt bij revalidate uit het CC-bord
mislukte RPC                  : rollback naar oorspronkelijke kolom + foutmelding (FR-010)
```

Positieberekening bij verplaatsen: `MAX(position) + 1` binnen de doelkolom op het bronbord (append). De volgorde binnen een CC-kolom wordt niet gemuteerd (FR-012: sortering is afgeleid: bordnaam → position).

## Validatieregels

- Alleen kaarten van het eigen user_id (`kk_columns.kk_boards.user_id = auth.uid()` via bestaande RLS + query-filter).
- Doelkolom moet behoren tot het bronbord van de kaart (server-side check in de action; anders fout).
- Geen nieuwe kaarten aanmaakbaar op het CC-bord (geen create-flow in het CC-component).

## Database-impact

- **Nieuwe tabellen**: geen
- **Nieuwe kolommen**: geen
- **Nieuwe migraties**: geen
- **RLS-wijzigingen**: geen (bestaande policies dekken de mutaties; alle acties draaien onder de ingelogde gebruiker)
- **Nieuwe RPC's**: geen (hergebruik `kk_move_card`)