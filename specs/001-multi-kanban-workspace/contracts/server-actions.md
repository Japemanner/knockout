# API & Server Action Contracts

**Feature**: 001-multi-kanban-workspace
**Phase**: 1 — Contract Design
**Date**: 2026-06-02

## Overview

Alle mutaties verlopen via Next.js server actions. Deze zijn type-safe, CSRF-beschermd (Next.js ingebouwd), en valideren de Supabase sessie server-side via cookies. Client-side reads gebruiken `supabase` browser client met RLS.

---

## Boards

```typescript
// src/actions/boards.ts

/** Maak een nieuw bord met 4 default kolommen */
export async function createBoard(data: {
  name: string;
}): Promise<{ id: string; error?: string }>

/** Hernoem een bestaand bord */
export async function updateBoard(data: {
  boardId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }>

/** Verwijder een bord (CASCADE: kolommen + kaarten + time sessions) */
export async function deleteBoard(data: {
  boardId: string;
}): Promise<{ success: boolean; error?: string }>

/** Reorder borden in het overzicht */
export async function reorderBoards(data: {
  orderedIds: string[];
}): Promise<{ success: boolean; error?: string }>
```

---

## Columns

```typescript
// src/actions/columns.ts

/** Maak een nieuwe kolom */
export async function createColumn(data: {
  boardId: string;
  name: string;
}): Promise<{ id: string; error?: string }>

/** Hernoem een kolom */
export async function updateColumn(data: {
  columnId: string;
  name: string;
}): Promise<{ success: boolean; error?: string }>

/** Verwijder een kolom (verplaatst kaarten naar targetColumnId, of eerstvolgende kolom) */
export async function deleteColumn(data: {
  columnId: string;
  targetColumnId?: string;
}): Promise<{ success: boolean; error?: string }>

/** Reorder kolommen binnen een bord */
export async function reorderColumns(data: {
  boardId: string;
  orderedIds: string[];
}): Promise<{ success: boolean; error?: string }>
```

---

## Cards

```typescript
// src/actions/cards.ts

/** Maak een nieuwe kaart */
export async function createCard(data: {
  columnId: string;
  title: string;
}): Promise<{ id: string; error?: string }>

/** Update kaart (titel, omschrijving, URL, deadline) */
export async function updateCard(data: {
  cardId: string;
  title?: string;
  description?: string;
  url?: string;
  deadline?: string | null; // ISO 8601
}): Promise<{ success: boolean; error?: string }>

/** Move kaart naar andere kolom + positie (drag-and-drop) */
export async function moveCard(data: {
  cardId: string;
  targetColumnId: string;
  position: number;
}): Promise<{ success: boolean; error?: string }>

/** Move kaart naar ander bord (eerste kolom) */
export async function moveCardToBoard(data: {
  cardId: string;
  targetBoardId: string;
}): Promise<{ success: boolean; error?: string }>

/** Reorder kaarten binnen kolom (batch update posities) */
export async function reorderCards(data: {
  columnId: string;
  orderedCardIds: string[];
}): Promise<{ success: boolean; error?: string }>

/** Archiveer/dearchiveer kaart */
export async function toggleArchiveCard(data: {
  cardId: string;
  isArchived: boolean;
}): Promise<{ success: boolean; error?: string }>

/** Verwijder kaart permanent */
export async function deleteCard(data: {
  cardId: string;
}): Promise<{ success: boolean; error?: string }>
```

---

## Starred

```typescript
// src/actions/starred.ts

/** Toggle ster op een kaart (optimistic update) */
export async function toggleStar(data: {
  cardId: string;
  isStarred: boolean;
}): Promise<{ success: boolean; error?: string }>

/** Batch toggle (gebruikt voor bulk unstar vanaf /starred) */
export async function batchToggleStars(data: {
  cardIds: string[];
  isStarred: boolean;
}): Promise<{ success: boolean; error?: string }>
```

---

## Time Tracking

```typescript
// src/actions/time-tracking.ts

/** Start timer op een kaart (stopt automatisch eventuele vorige actieve timer) */
export async function startTimer(data: {
  cardId: string;
}): Promise<{ sessionId: string; startedAt: string; error?: string }>

/** Stop actieve timer */
export async function stopTimer(data: {
  sessionId: string;
}): Promise<{ duration: number; error?: string }>

/** Haal actieve timer op (voor page restore na refresh) */
export async function getActiveTimer(): Promise<{
  sessionId: string | null;
  cardId: string | null;
  startedAt: string | null;
}>

/** Verwijder een time session */
export async function deleteTimeSession(data: {
  sessionId: string;
}): Promise<{ success: boolean; error?: string }>
```

---

## DB Connections

```typescript
// src/actions/db-connections.ts

/** Voeg een nieuwe externe DB-connectie toe (encrypt connection string server-side) */
export async function createConnection(data: {
  name: string;
  connectionString: string;
}): Promise<{ id: string; error?: string }>

/** Update connectie naam of connection string */
export async function updateConnection(data: {
  connectionId: string;
  name?: string;
  connectionString?: string;
}): Promise<{ success: boolean; error?: string }>

/** Verwijder connectie (+ destroy pool) */
export async function deleteConnection(data: {
  connectionId: string;
}): Promise<{ success: boolean; error?: string }>

/** Test connectie (probeert verbinding te maken, geeft success/error terug) */
export async function testConnection(data: {
  connectionId: string;
}): Promise<{ success: boolean; error?: string }>
```

---

## External DB Operations

```typescript
// src/actions/external-db.ts

/** Haal alle tabellen op voor een connectie */
export async function getTables(data: {
  connectionId: string;
}): Promise<{
  tables: Array<{
    name: string;
    schema: string;
    columns: Array<{
      name: string;
      dataType: string;
      isNullable: boolean;
      isPrimaryKey: boolean;
      defaultValue: string | null;
      foreignKey?: {
        referencedTable: string;
        referencedColumn: string;
      };
    }>;
  }>;
  error?: string;
}>

/** Haal records op uit een tabel (gepagineerd) */
export async function getTableRecords(data: {
  connectionId: string;
  tableName: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}): Promise<{
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  error?: string;
}>

/** Maak een nieuw record */
export async function createRecord(data: {
  connectionId: string;
  tableName: string;
  values: Record<string, unknown>;
}): Promise<{ id?: unknown; error?: string }>

/** Update een bestaand record */
export async function updateRecord(data: {
  connectionId: string;
  tableName: string;
  primaryKey: { column: string; value: unknown };
  values: Record<string, unknown>;
}): Promise<{ success: boolean; error?: string }>

/** Verwijder een record (met bevestigingscheck) */
export async function deleteRecord(data: {
  connectionId: string;
  tableName: string;
  primaryKey: { column: string; value: unknown };
}): Promise<{ success: boolean; error?: string }>

/** Haal foreign key waarden op voor dropdowns */
export async function getForeignKeyOptions(data: {
  connectionId: string;
  referencedTable: string;
  referencedColumn: string;
}): Promise<{ options: Array<{ value: unknown; label: string }>; error?: string }>
```

---

## RSS Feeds

```typescript
// src/actions/rss-feeds.ts

/** Voeg een RSS-feed toe */
export async function addFeed(data: {
  name: string;
  url: string;
}): Promise<{ id: string; error?: string }>

/** Verwijder een RSS-feed */
export async function removeFeed(data: {
  feedId: string;
}): Promise<{ success: boolean; error?: string }>

/** Haal items op voor een feed (server-side gecached, 5 min TTL) */
export async function fetchFeedItems(data: {
  feedId: string;
}): Promise<{
  items: Array<{
    title: string;
    link: string;
    pubDate: string;
    contentSnippet?: string;
  }>;
  error?: string;
}>

/** Converteer feed-item naar kanban-kaart (maakt kaart op ingesteld bord) */
export async function convertToCard(data: {
  feedId: string;
  itemTitle: string;
  itemLink: string;
}): Promise<{ cardId: string; error?: string }>
```

---

## Focus Notes

```typescript
// src/actions/focus-notes.ts

/** Sla focus-note op voor vandaag (upsert) */
export async function saveFocusNote(data: {
  content: string;
}): Promise<{ success: boolean; error?: string }>

/** Haal focus-note op voor vandaag */
export async function getTodayFocusNote(): Promise<{ content: string }>

/** Haal gesterde kaarten + deadline-kaarten op voor focus-modus */
export async function getFocusData(): Promise<{
  starredCards: Array<{ id: string; title: string; boardName: string; boardId: string; deadline: string | null }>;
  deadlineCards: Array<{ id: string; title: string; boardName: string; boardId: string }>;
}>
```

---

## Shared Response Types

```typescript
// src/actions/types.ts

export type ActionResult<T = void> = T & { error?: string };

export type ValidationError = {
  field: string;
  message: string;
};

export type PaginatedResponse<T> = {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
};
```
