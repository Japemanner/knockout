# Data Model: Multi-Kanban Workspace

**Feature**: 001-multi-kanban-workspace
**Phase**: 1 — Data Model Design
**Date**: 2026-06-02

## Nieuwe Tabellen (Supabase App-DB)

Alle tabellen krijgen `user_id` kolom met RLS policy `auth.uid() = user_id`.
Timestamps via `created_at` en `updated_at` met auto-update trigger.

---

### boards

Kanban-borden per gebruiker.

| Column      | Type                     | Constraints                  | Description                        |
|-------------|--------------------------|------------------------------|------------------------------------|
| id          | uuid                     | PK, DEFAULT gen_random_uuid()| Uniek bord-ID                      |
| user_id     | uuid                     | NOT NULL, FK → auth.users    | Eigenaar                           |
| name        | text                     | NOT NULL                     | Bordnaam (bijv. "Klantprojecten")  |
| is_inbox    | boolean                  | DEFAULT false                | Is dit het quick-capture inbox-bord|
| position    | integer                  | DEFAULT 0                    | Volgorde in bordoverzicht          |
| created_at  | timestamptz              | DEFAULT now()                |                                    |
| updated_at  | timestamptz              | DEFAULT now()                |                                    |

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

---

### columns

Kolommen binnen een bord (configureerbaar).

| Column      | Type                     | Constraints                  | Description                        |
|-------------|--------------------------|------------------------------|------------------------------------|
| id          | uuid                     | PK, DEFAULT gen_random_uuid()| Uniek kolom-ID                     |
| board_id    | uuid                     | NOT NULL, FK → boards ON DELETE CASCADE | Parent bord             |
| name        | text                     | NOT NULL                     | Kolomnaam (bijv. "Backlog")        |
| position    | integer                  | NOT NULL, DEFAULT 0          | Volgorde (links→rechts)            |
| created_at  | timestamptz              | DEFAULT now()                |                                    |
| updated_at  | timestamptz              | DEFAULT now()                |                                    |

**RLS Policies**: Via `board_id` join op `boards.user_id`.

---

### cards

Kaarten binnen een kolom.

| Column        | Type                     | Constraints                  | Description                      |
|---------------|--------------------------|------------------------------|----------------------------------|
| id            | uuid                     | PK, DEFAULT gen_random_uuid()| Uniek kaart-ID                   |
| column_id     | uuid                     | NOT NULL, FK → columns ON DELETE CASCADE | Parent kolom       |
| title         | text                     | NOT NULL                     | Kaarttitel                       |
| description   | text                     |                              | Markdown omschrijving            |
| url           | text                     |                              | Externe URL/link                 |
| is_starred    | boolean                  | DEFAULT false                | Ster-status                      |
| is_archived   | boolean                  | DEFAULT false                | Gearchiveerd                     |
| position      | integer                  | NOT NULL, DEFAULT 0          | Volgorde binnen kolom            |
| deadline      | timestamptz              |                              | Optionele deadline                |
| created_at    | timestamptz              | DEFAULT now()                |                                  |
| updated_at    | timestamptz              | DEFAULT now()                |                                  |

**RLS Policies**: Via `column_id` → `board_id` → `user_id`.

**Index**: `(column_id, position)` voor gesorteerde queries.  
**Index**: `(is_starred, is_archived)` voor `/starred` aggregatie (via join).  
**Index**: `(deadline)` voor focus-modus filtering.

---

### time_sessions

Gelogde tijdsessies per kaart.

| Column      | Type                     | Constraints                  | Description                        |
|-------------|--------------------------|------------------------------|------------------------------------|
| id          | uuid                     | PK, DEFAULT gen_random_uuid()|                                    |
| card_id     | uuid                     | NOT NULL, FK → cards ON DELETE CASCADE |                          |
| started_at  | timestamptz              | NOT NULL                     | Starttijd                          |
| ended_at    | timestamptz              |                              | Eindtijd (NULL als actief)         |
| created_at  | timestamptz              | DEFAULT now()                |                                    |

**RLS Policies**: Via `card_id` → `column_id` → `board_id` → `user_id`.

**Constraint**: `ended_at > started_at` via CHECK constraint.  
**Index**: `(card_id, started_at)` voor tijdsoverzichten per kaart.

---

### db_connections

Externe PostgreSQL-database connecties (encrypted connection string).

| Column              | Type                     | Constraints                  | Description                  |
|---------------------|--------------------------|------------------------------|------------------------------|
| id                  | uuid                     | PK, DEFAULT gen_random_uuid()|                              |
| user_id             | uuid                     | NOT NULL, FK → auth.users    | Eigenaar                     |
| name                | text                     | NOT NULL                     | Vriendelijke naam            |
| encrypted_conn_str  | text                     | NOT NULL                     | AES-256-GCM encrypted conn. string |
| created_at          | timestamptz              | DEFAULT now()                |                              |
| updated_at          | timestamptz              | DEFAULT now()                |                              |

**RLS Policies**:
- SELECT: `auth.uid() = user_id` (encrypted_conn_str wordt in server action gedecrypt, nooit naar client)
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

**Security note**: De `encrypted_conn_str` kolom wordt NOOIT geretourneerd in client-side queries. Server actions halen hem op met service role key indien nodig voor decryptie.

---

### rss_feeds

RSS/Atom feed configuraties.

| Column      | Type                     | Constraints                  | Description                        |
|-------------|--------------------------|------------------------------|------------------------------------|
| id          | uuid                     | PK, DEFAULT gen_random_uuid()|                                    |
| user_id     | uuid                     | NOT NULL, FK → auth.users    | Eigenaar                           |
| name        | text                     | NOT NULL                     | Vriendelijke naam (bijv. "CSS-Tricks") |
| url         | text                     | NOT NULL                     | Feed URL                           |
| created_at  | timestamptz              | DEFAULT now()                |                                    |
| updated_at  | timestamptz              | DEFAULT now()                |                                    |

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

**Index**: `(user_id)` voor feed-lijst per gebruiker.

---

### focus_notes

Dagelijkse focus-notities ("Wat ga je vandaag doen?").

| Column      | Type                     | Constraints                  | Description                        |
|-------------|--------------------------|------------------------------|------------------------------------|
| id          | uuid                     | PK, DEFAULT gen_random_uuid()|                                    |
| user_id     | uuid                     | NOT NULL, FK → auth.users    | Eigenaar                           |
| date        | date                     | NOT NULL                     | Datum van de notitie               |
| content     | text                     | DEFAULT ''                   | Vrije tekst                        |
| created_at  | timestamptz              | DEFAULT now()                |                                    |
| updated_at  | timestamptz              | DEFAULT now()                |                                    |

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`

**Unique constraint**: `(user_id, date)` — één notitie per gebruiker per dag.

---

## Entiteit-Relatie Diagram (Conceptueel)

```
User (auth.users)
 ├── Board (1:N)
 │    └── Column (1:N)
 │         └── Card (1:N)
 │              └── TimeSession (1:N)
 ├── DBConnection (1:N)
 ├── RSSFeed (1:N)
 └── FocusNote (1:N, één per dag)
```

## Relatie met Bestaande Tabellen

De nieuwe tabellen zijn geïsoleerd van de bestaande Knockout AI-platform tabellen (`organizations`, `profiles`, `ai_assistants`, `knowledge_bases`, etc.). De enige overlap is `auth.users` via de `user_id` foreign keys en RLS policies.

## Default Data

Bij aanmaken van een nieuw bord worden automatisch 4 standaardkolommen aangemaakt:

| Position | Name     |
|----------|----------|
| 0        | Backlog  |
| 1        | Doing    |
| 2        | Review   |
| 3        | Done     |

Bij eerste login (of bij ontbreken van een inbox-bord) wordt automatisch een "Inbox"-bord aangemaakt met dezelfde 4 kolommen, en `is_inbox = true`.
