-- Migration: 021_standardize_board_columns.sql
-- Description: Normaliseer alle borden naar vaste kolommen Backlog/Doing/Done.
--   - Case-varianten canoniseren (ILIKE 'backlog'/'doing'/'done' -> exacte naam)
--   - Duplicaat-kolommen per standaardnaam mergen (kaarten -> canonieke kolom)
--   - Kaarten uit niet-standaard kolommen (bijv. Review) -> Doing (geappend)
--   - Subtasks volgen de kolom van hun parent (invariant subtask = kolom parent)
--   - Posities hernormaliseren naar 0/1/2; ontbrekende standaardkolommen aanvullen
-- Atomic: DO-block in één transactie. Idempotent: borden die al voldoen blijven ongewijzigd.
-- Date: 2026-10-06

DO $$
DECLARE
  v_board          record;
  v_canon_id       uuid;
  v_doing_id       uuid;
  v_doing_max      integer;
BEGIN
  FOR v_board IN SELECT id FROM kk_boards LOOP

    -- ---------------------------------------------------------
    -- Stap 1: Ontbrekende standaardkolommen leeg aanvullen
    -- (vóór verplaatsingen, zodat 'Doing' als bestemming kan dienen)
    -- ---------------------------------------------------------
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

    -- ---------------------------------------------------------
    -- Stap 2: Case-varianten canoniseren naar exacte standaardnamen
    -- ---------------------------------------------------------
    UPDATE kk_columns SET name = 'Backlog', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'backlog' AND name <> 'Backlog';

    UPDATE kk_columns SET name = 'Doing', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'doing' AND name <> 'Doing';

    UPDATE kk_columns SET name = 'Done', updated_at = now()
    WHERE board_id = v_board.id AND name ILIKE 'done' AND name <> 'Done';

    -- ---------------------------------------------------------
    -- Stap 3: Duplicaat-kolommen per standaardnaam mergen.
    -- Canoniek = laagste position. Kaarten uit duplicaten worden
    -- geappend aan de canonieke kolom (behoud relatieve volgorde).
    -- ---------------------------------------------------------
    -- Backlog
    SELECT id INTO v_canon_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Backlog'
    ORDER BY position ASC, created_at ASC
    LIMIT 1;

    IF v_canon_id IS NOT NULL THEN
      WITH dup_cols AS (
        SELECT id FROM kk_columns
        WHERE board_id = v_board.id AND name = 'Backlog' AND id <> v_canon_id
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + ROW_NUMBER() OVER (ORDER BY c.position ASC, c.created_at ASC),
          updated_at = now()
      WHERE c.column_id IN (SELECT id FROM dup_cols);

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
      WITH dup_cols AS (
        SELECT id FROM kk_columns
        WHERE board_id = v_board.id AND name = 'Doing' AND id <> v_canon_id
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + ROW_NUMBER() OVER (ORDER BY c.position ASC, c.created_at ASC),
          updated_at = now()
      WHERE c.column_id IN (SELECT id FROM dup_cols);

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
      WITH dup_cols AS (
        SELECT id FROM kk_columns
        WHERE board_id = v_board.id AND name = 'Done' AND id <> v_canon_id
      ),
      max_pos AS (
        SELECT COALESCE(MAX(position), -1) AS mx FROM kk_cards WHERE column_id = v_canon_id
      )
      UPDATE kk_cards c
      SET column_id = v_canon_id,
          position = (SELECT mx FROM max_pos) + ROW_NUMBER() OVER (ORDER BY c.position ASC, c.created_at ASC),
          updated_at = now()
      WHERE c.column_id IN (SELECT id FROM dup_cols);

      DELETE FROM kk_columns
      WHERE board_id = v_board.id AND name = 'Done' AND id <> v_canon_id;
    END IF;

    -- ---------------------------------------------------------
    -- Stap 4: Kaarten uit niet-standaard kolommen -> Doing,
    -- geappend na bestaande Doing-kaarten (behoud relatieve volgorde).
    -- ---------------------------------------------------------
    SELECT id INTO v_doing_id
    FROM kk_columns
    WHERE board_id = v_board.id AND name = 'Doing'
    LIMIT 1;

    SELECT COALESCE(MAX(position), -1) INTO v_doing_max
    FROM kk_cards
    WHERE column_id = v_doing_id;

    WITH nonstd_cols AS (
      SELECT c.id
      FROM kk_columns c
      WHERE c.board_id = v_board.id
        AND c.name NOT IN ('Backlog', 'Doing', 'Done')
    )
    UPDATE kk_cards card
    SET column_id = v_doing_id,
        position = v_doing_max + ROW_NUMBER() OVER (ORDER BY card.position ASC, card.created_at ASC),
        updated_at = now()
    WHERE card.column_id IN (SELECT id FROM nonstd_cols);

    -- ---------------------------------------------------------
    -- Stap 5: Niet-standaard kolommen verwijderen
    -- (kaarten zijn in stap 4 al verplaatst — geen kaartverlies)
    -- ---------------------------------------------------------
    DELETE FROM kk_columns
    WHERE board_id = v_board.id
      AND name NOT IN ('Backlog', 'Doing', 'Done');

    -- ---------------------------------------------------------
    -- Stap 6: Subtask-veiligheidsnet — subtask volgt de kolom
    -- van de parent wanneer de parent in een standaardkolom ligt.
    -- (invariant: subtask in dezelfde kolom als parent)
    -- ---------------------------------------------------------
    UPDATE kk_cards sub
    SET column_id = parent.column_id,
        updated_at = now()
    FROM kk_cards parent, kk_columns pcol
    WHERE sub.parent_id = parent.id
      AND parent.column_id = pcol.id
      AND pcol.board_id = v_board.id
      AND pcol.name IN ('Backlog', 'Doing', 'Done')
      AND sub.column_id <> parent.column_id;

    -- ---------------------------------------------------------
    -- Stap 7: Posities hernormaliseren naar 0/1/2
    -- ---------------------------------------------------------
    UPDATE kk_columns SET position = 0, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Backlog';

    UPDATE kk_columns SET position = 1, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Doing';

    UPDATE kk_columns SET position = 2, updated_at = now()
    WHERE board_id = v_board.id AND name = 'Done';

  END LOOP;
END $$;