# RSS Feed API Contract

**Feature**: 001-multi-kanban-workspace
**Phase**: 1 — Contract Design
**Date**: 2026-06-02

## Architecture

```
Client (browser)
  ↓ Next.js API Route: GET /api/rss?feedId=xxx
Next.js Route Handler (server-side)
  ↓ rss-parser.parseURL(url)
  ↓ in-memory cache (5 min TTL)
RSS/Atom Feed Server
```

## API Route

```
GET /api/rss?feedId=<uuid>
```

### Request
- Authenticated (middleware check)
- `feedId`: UUID van de opgeslagen feed

### Response (200)
```json
{
  "items": [
    {
      "title": "Understanding React Server Components",
      "link": "https://example.com/react-server-components",
      "pubDate": "2026-06-01T10:00:00Z",
      "contentSnippet": "A deep dive into React Server Components and how they change the rendering paradigm..."
    }
  ]
}
```

### Response (4xx/5xx)
```json
{
  "error": "Feed niet gevonden" 
}
```

of

```json
{
  "error": "Feed kon niet worden opgehaald (timeout/netwerkfout)"
}
```

## Caching Strategy

```typescript
// src/lib/rss/cache.ts

interface CacheEntry {
  items: FeedItem[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function get(feedId: string): FeedItem[] | null {
  const entry = cache.get(feedId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(feedId);
    return null;
  }
  return entry.items;
}

function set(feedId: string, items: FeedItem[]): void {
  cache.set(feedId, { items, timestamp: Date.now() });
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Feed URL onbereikbaar (timeout >10s) | Retourneer `error: "Feed kon niet worden opgehaald"`, widget toont waarschuwing |
| Feed XML malformed | Retourneer `error: "Ongeldige feed data"`, widget toont waarschuwing |
| Feed leeg (0 items) | Retourneer lege array `items: []` |
| CORS block | Werkt niet van toepassing — fetch gebeurt server-side |
| Rate limited door feed server | Cache voorkomt overmatig pollen; widget pollt handmatig via user-actie |

## Feed → Kaart Conversie

Wanneer gebruiker klikt op "Naar bord" bij een feed-item:

1. Client roept `convertToCard` server action aan met `feedId`, `itemTitle`, `itemLink`
2. Server action zoekt het ingestelde "Inspiratie"-bord (bord met `is_inbox = false` en naam "Inspiratie", of het eerste beschikbare bord)
3. Maakt kaart aan in de eerste kolom van dat bord met `title = itemTitle`, `url = itemLink`
4. Retourneert `{ cardId }` voor navigatie
