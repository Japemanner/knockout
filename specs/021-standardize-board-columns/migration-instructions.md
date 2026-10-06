# Migratie 021 — Copy-paste pakket voor Supabase SQL Editor

**Feature**: 021-standardize-board-columns | **Doel**: alle bestaande borden normaliseren naar Backlog/Doing/Done | **Datum**: 2026-10-06

## Stappen

1. Open **Supabase Dashboard** → project `ythjnatklbnjtvvgpwlr` → **SQL Editor** → "New query"
2. Plak **Deel 1 — Pre-check** hieronder en klik **Run** — noteer de resultaten
3. Plak **Deel 2 — Migratie** en klik **Run** — dit past de wijzigingen toe (atomair, idempotent)
4. Plak **Deel 3 — Post-check** en klik **Run** — alles moet voldoen
5. Als Deel 3 iets anders toont: plak Deel 2 opnieuw (idempotent) of rapporteer de output terug

---

## Deel 1 — Pre-check (alleen lezen)

```sql
-- Hoe zien de borden er nu uit?
SELECT
  b.id            AS board_id,
  b.name          AS board,
  count(DISTINCT c.id)                    AS kolommen,
  string_agg(c.name, ', ' ORDER BY c.position) AS kolomnamen,
  count(DISTINCT k.id)                   AS kaarten
FROM kk_boards b
LEFT JOIN kk_columns c ON c.board_id = b.id
LEFT JOIN kk_cards  k ON k.column_id = c.id
GROUP BY b.id, b.name
ORDER BY b.name;
```

**Verwacht**: borden met 4 kolommen (Backlog, Doing, Review, Done) — mogelijk variaties.

---

## Deel 2 — Migratie (voert de normalisatie uit)

> Volledige inhoud van `supabase/migrations/021_standardize_board_columns.sql` — atomair DO-blok, veilig bij herhaalde uitvoering.

```sql
DO $$
DECLARE
  v_board          record;
  v_canon_id       uuid;
  v_doing_id       uuid;
  v_doing_max      integer;
BEGIN
  FOR v_board IN SELECT id FROM kk_boards LOOP

    -- Stap 1: Ontbrekende standaardkolommen leeg aanvullen
    IF NOT EXISTS (SELECT 1 FROM kk_columns WHERE board_id = v_board.id AND name = 'Backlog') THEN
      INSERT INTO kk_columns (board_id, name, position)
      VALUES (v_board.id, 'Backlog', 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM kk_columns WHERE board_id = v_board.id AND name = 'Doing') THEN
      INSERT INTO kk_columns (board_id, name, position)
      VALUES (v_board.id, 'Doing', 1);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM kk_columns WHERE board_id = v_board.id AND name = 'Done') THEN
      INSERT INTO kk_columns (board_id, name, position)
      VALUES (v_board.id, 'Done', 2);
    END IF;

    -- Stap 2: Case-varianten canoniseren naar exacte standaardnamen
    UPDATE kk_columns SET name = 'Backlog', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'backlog' AND name <> 'Backlog';

    UPDATE kk_columns SET name = 'Doing', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'doing' AND name <> 'Doing';

    UPDATE kk_columns SET name = 'Done', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'done' AND name <> 'Done';

    -- Stap 3: Duplicaat-kolommen per standaardnaam mergen
    -- Backlog
    SELECT id INTO v_canon_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Backlog'
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    IF v_canon_id IS NOT NULL THEN
      WITH dup_cards AS (
        SELECT c.id, c.position, c.created_at
        FROM kk_cards c
        JOIN kk_columns col ON col.id = c.column_id
        WHERE col.board_id = v_board.id
          AND col.name = 'Backlog'
          AND col.id <> v_canon_id
      ),
      numbered AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) AS rn
        FROM dup_cards
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + n.rn,
          updated_at = now()
      FROM numbered n
      WHERE c.id = n.id;

      DELETE FROM kk_columns
      WHERE board_id = v_board.id AND name = 'Backlog' AND id <> v_canon_id;
    END IF;

    -- Doing
    SELECT id INTO v_canon_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Doing'
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    IF v_canon_id IS NOT NULL THEN
      WITH dup_cards AS (
        SELECT c.id, c.position, c.created_at
        FROM kk_cards c
        JOIN kk_columns col ON col.id = c.column_id
        WHERE col.board_id = v_board.id
          AND col.name = 'Doing'
          AND col.id <> v_canon_id
      ),
      numbered AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) AS rn
        FROM dup_cards
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + n.rn,
          updated_at = now()
      FROM numbered n
      WHERE c.id = n.id;

      DELETE FROM kk_columns
      WHERE board_id = v_board.id AND name = 'Doing' AND id <> v_canon_id;
    END IF;

    -- Done
    SELECT id INTO v_canon_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Done'
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    IF v_canon_id IS NOT NULL THEN
      WITH dup_cards AS (
        SELECT c.id, c.position, c.created_at
        FROM kk_cards c
        JOIN kk_columns col ON col.id = c.column_id
        WHERE col.board_id = v_board.id
          AND col.name = 'Done'
          AND col.id <> v_canon_id
      ),
      numbered AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) AS rn
        FROM dup_cards
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + n.rn,
          updated_at = now()
      FROM numbered n
      WHERE c.id = n.id;

      DELETE FROM kk_columns
      WHERE board_id = v_board.id AND name = 'Done' AND id <> v_canon_id;
    END IF;

    -- Stap 4: Kaarten uit niet-standaard kolommen -> Doing (geappend)
    SELECT id INTO v_doing_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Doing'
    LIMIT 1;

    SELECT COALESCE(MAX(position), -1) INTO v_doing_max
    FROM kk_cards
    WHERE column_id = v_doing_id;

    WITH nonstd_cards AS (
      SELECT card.id, card.position, card.created_at
      FROM kk_cards card
      JOIN kk_columns col ON col.id = card.column_id
      WHERE col.board_id = v_board.id
        AND col.name NOT IN ('Backlog', 'Doing', 'Done')
    ),
    numbered AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY position ASC, created_at ASC) AS rn
      FROM nonstd_cards
    )
    UPDATE kk_cards card
    SET column_id = v_doing_id,
        position = v_doing_max + n.rn,
        updated_at = now()
    FROM numbered n
    WHERE card.id = n.id;

    -- Stap 5: Niet-standaard kolommen verwijderen
    DELETE FROM kk_columns
    WHERE board_id = v_board.id
      AND name NOT IN ('Backlog', 'Doing', 'Done');

    -- Stap 6: Subtask-veiligheidsnet — subtask volgt de parent-kolom
    UPDATE kk_cards sub
    SET column_id = parent.column_id,
        updated_at = now()
    FROM kk_cards parent, kk_columns pcol
    WHERE sub.parent_id = parent.id
      AND parent.column_id = pcol.id
      AND pcol.board_id = v_board.id
      AND pcol.name IN ('Backlog', 'Doing', 'Done')
      AND sub.column_id <> parent.column_id;

    -- Stap 7: Posities hernormaliseren naar 0/1/2
    UPDATE kk_columns SET position = 0, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Backlog';

    UPDATE kk_columns SET position = 1, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Doing';

    UPDATE kk_columns SET position = 2, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Done';

  END LOOP;
END $$;
```

---

## Deel 3 — Post-check (verificatie)

```sql
-- A) Elk bord moet exact 3 standaardkolommen hebben met posities 0/1/2
SELECT
  b.id  AS board_id,
  b.name AS board,
  count(c.id) AS kolommen,
  string_agg(c.name || ' (' || c.position || ')', ', ' ORDER BY c.position) AS kolommen_met_positie,
  CASE
    WHEN string_agg(c.name, ',' ORDER BY c.position) = 'Backlog,Doing,Done'
     AND string_agg(c.position::text, ',' ORDER BY c.position) = '0,1,2'
    THEN 'OK'
    ELSE 'FOUT — migratie opnieuw draaien'
  END AS status
FROM kk_boards b
LEFT JOIN kk_columns c ON c.board_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;

-- B) RLS moet nog aanstaan op beide tabellen
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('kk_columns', 'kk_cards');
-- Verwacht: beide rijen rowsecurity = true

-- C) Geen kaartverlies — totaal aantal kaarten ongewijzigd t.o.v. pre-check
SELECT count(*) AS totaal_kaarten FROM kk_cards;

-- D) Geen weeskaarten: elke kaart moet in een kolom van een bestaand bord liggen
SELECT count(*) AS wees_kaarten
FROM kk_cards k
LEFT JOIN kk_columns c ON k.column_id = c.id
WHERE c.id IS NULL;
-- Verwacht: 0
```

**Acceptatie**: alle borden status OK, RLS true, totaal kaarten gelijk aan pre-check, 0 wezen.