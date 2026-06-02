# External Database Query Interface

**Feature**: 001-multi-kanban-workspace
**Phase**: 1 — Contract Design
**Date**: 2026-06-02

## Architecture

```
Client (browser)
  ↓ serverAction(formData)
Next.js Server Action
  ↓ decrypt(encrypted_conn_str)
pg.Pool (per-connection)
  ↓ parameterized SQL
External PostgreSQL Database
```

## Connection Pool Lifecycle

```typescript
// src/lib/db/pool.ts

const pools = new Map<string, Pool>();

function getPool(connectionId: string, connectionString: string): Pool {
  const existing = pools.get(connectionId);
  if (existing) return existing;
  
  const pool = new Pool({
    connectionString,
    max: 5,                    // Max 5 connections per pool
    idleTimeoutMillis: 30000,  // Close idle after 30s
    statement_timeout: 10000,  // 10s query timeout
  });
  
  pools.set(connectionId, pool);
  return pool;
}

function destroyPool(connectionId: string): void {
  const pool = pools.get(connectionId);
  if (pool) {
    pool.end();
    pools.delete(connectionId);
  }
}
```

## Schema Introspection Queries

```sql
-- Get all user tables (exclude system schemas)
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND table_type = 'BASE TABLE'
ORDER BY table_schema, table_name;

-- Get columns for a specific table
SELECT 
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length,
  tc.constraint_type = 'PRIMARY KEY' AS is_primary_key
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
  ON c.table_schema = kcu.table_schema
  AND c.table_name = kcu.table_name
  AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name
  AND tc.constraint_type = 'PRIMARY KEY'
WHERE c.table_schema = $1
  AND c.table_name = $2
ORDER BY c.ordinal_position;

-- Get foreign keys for a table
SELECT
  kcu.column_name,
  ccu.table_schema AS referenced_table_schema,
  ccu.table_name AS referenced_table_name,
  ccu.column_name AS referenced_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.referential_constraints rc
  ON kcu.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE kcu.table_schema = $1
  AND kcu.table_name = $2;
```

## Parameterized Query Builder

```typescript
// src/lib/db/query-builder.ts

/**
 * Bouwt een veilige parameterized INSERT query.
 * Gebruikt $1, $2, ... placeholders om SQL injection te voorkomen.
 */
function buildInsert(
  tableName: string,
  values: Record<string, unknown>
): { text: string; params: unknown[] } {
  const keys = Object.keys(values);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  return {
    text: `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    params: Object.values(values),
  };
}

/**
 * Bouwt een veilige parameterized UPDATE query.
 */
function buildUpdate(
  tableName: string,
  primaryKey: { column: string; value: unknown },
  values: Record<string, unknown>
): { text: string; params: unknown[] } {
  const keys = Object.keys(values);
  const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
  const params = [...Object.values(values), primaryKey.value];
  return {
    text: `UPDATE "${tableName}" SET ${setClauses.join(', ')} WHERE "${primaryKey.column}" = $${params.length} RETURNING *`,
    params,
  };
}

/**
 * Bouwt een veilige parameterized SELECT query met paginering.
 * tableName, orderBy, orderDir zijn gezuiverd via whitelist.
 */
function buildSelect(
  tableName: string,
  options: {
    page: number;
    pageSize: number;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
  }
): { dataQuery: string; countQuery: string; params: unknown[] } {
  const offset = (options.page - 1) * options.pageSize;
  const order = options.orderBy ? `"${options.orderBy}" ${options.orderDir || 'asc'}` : '1';
  return {
    dataQuery: `SELECT * FROM "${tableName}" ORDER BY ${order} LIMIT $1 OFFSET $2`,
    countQuery: `SELECT COUNT(*) FROM "${tableName}"`,
    params: [options.pageSize, offset],
  };
}
```

## Type Mapping

| PostgreSQL Type      | Form Field         | Validation                           |
|----------------------|--------------------|--------------------------------------|
| text, varchar, char  | `<input type="text">` | maxLength from character_maximum_length |
| integer, smallint, bigint | `<input type="number">` | step=1, min/max from type range |
| numeric, real, double precision | `<input type="number">` | step=any |
| boolean              | `<Switch>`          |                                      |
| date                 | `<input type="date">` |                                    |
| timestamp, timestamptz | `<input type="datetime-local">` |                          |
| text (long, >500 chars) | `<Textarea>`     |                                      |
| json, jsonb          | `<Textarea>`        | Valid JSON on submit                 |
| enum types           | `<Select>`          | Options from enum values             |
| Foreign Key          | `<Select>`          | Options from FK table lookup         |

## Safety Constraints

1. **Table name whitelist**: Alleen tabellen uit `information_schema.tables` (excl. systeemschema's) zijn toegankelijk.
2. **Column name whitelist**: Alleen kolommen uit `information_schema.columns` worden in queries gebruikt.
3. **Query timeout**: 10 seconden per query via `statement_timeout`.
4. **No multi-statement**: Single query per call, geen `;` in query text.
5. **Read-only by default**: Destructive operations (INSERT, UPDATE, DELETE) vereisen expliciete user confirmatie via confirmatie-dialog in de UI.
6. **Encryption at rest**: Connection strings opgeslagen als AES-256-GCM ciphertext in Supabase.
7. **No client exposure**: Connection strings, pool instances, en encryptie/decryptie gebeuren uitsluitend server-side.
