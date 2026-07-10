-- 009_performance.sql
-- Performance RPCs: collapse multi-round-trip server actions into single Postgres calls.
-- All functions use SECURITY INVOKER so RLS policies still apply.

-- ============================================================
-- create_card_in_inbox: find inbox board → first column → count → insert in one call
-- ============================================================
CREATE OR REPLACE FUNCTION kk_create_card_in_inbox(
  p_user_id    uuid,
  p_title      text,
  p_description text DEFAULT NULL,
  p_url        text DEFAULT NULL,
  p_deadline   timestamptz DEFAULT NULL
)
RETURNS kk_cards
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_board_id  uuid;
  v_column_id uuid;
  v_count     integer;
  v_card      kk_cards;
BEGIN
  SELECT id INTO v_board_id
  FROM kk_boards
  WHERE user_id = p_user_id AND is_inbox = true
  LIMIT 1;

  IF v_board_id IS NULL THEN
    RAISE EXCEPTION 'Inbox board not found';
  END IF;

  SELECT id INTO v_column_id
  FROM kk_columns
  WHERE board_id = v_board_id
  ORDER BY position ASC
  LIMIT 1;

  IF v_column_id IS NULL THEN
    RAISE EXCEPTION 'No columns found in inbox board';
  END IF;

  SELECT count(*) INTO v_count
  FROM kk_cards
  WHERE column_id = v_column_id;

  INSERT INTO kk_cards (column_id, parent_id, title, description, url, deadline, position, is_starred, is_archived)
  VALUES (v_column_id, NULL, p_title, p_description, p_url, p_deadline, v_count, false, false)
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ============================================================
-- create_card_in_column: count cards in column → insert in one call
-- ============================================================
CREATE OR REPLACE FUNCTION kk_create_card_in_column(
  p_column_id   uuid,
  p_title       text,
  p_description text DEFAULT NULL,
  p_url         text DEFAULT NULL,
  p_deadline    timestamptz DEFAULT NULL
)
RETURNS kk_cards
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_count integer;
  v_card  kk_cards;
BEGIN
  SELECT count(*) INTO v_count
  FROM kk_cards
  WHERE column_id = p_column_id;

  INSERT INTO kk_cards (column_id, parent_id, title, description, url, deadline, position, is_starred, is_archived)
  VALUES (p_column_id, NULL, p_title, p_description, p_url, p_deadline, v_count, false, false)
  RETURNING * INTO v_card;

  RETURN v_card;
END;
$$;

-- ============================================================
-- move_card_under_parent: recursive CTE cycle check + update in one call
-- Replaces 6+ sequential round-trips including the unbounded while-loop
-- ============================================================
CREATE OR REPLACE FUNCTION kk_move_card_under_parent(
  p_card_id   uuid,
  p_parent_id uuid
)
RETURNS kk_cards
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_parent        kk_cards;
  v_parent_column kk_columns;
  v_is_done       boolean;
  v_sub_count     integer;
  v_updated_card  kk_cards;
  v_cycle_exists  integer;
BEGIN
  -- Fetch the parent card
  SELECT * INTO v_parent
  FROM kk_cards
  WHERE id = p_parent_id;

  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Parent card not found';
  END IF;

  IF v_parent.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot nest under a subtask';
  END IF;

  -- Check done column
  SELECT * INTO v_parent_column
  FROM kk_columns
  WHERE id = v_parent.column_id;

  v_is_done := v_parent_column.name ILIKE 'done';

  -- Cycle detection: does p_parent_id appear in the ancestor chain of p_card_id?
  -- If p_card_id is an ancestor of p_parent_id, then making p_parent_id the parent of p_card_id creates a cycle.
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id FROM kk_cards WHERE id = p_parent_id
    UNION ALL
    SELECT c.id, c.parent_id FROM kk_cards c
    JOIN ancestors a ON c.id = a.parent_id
  )
  SELECT count(*) INTO v_cycle_exists
  FROM ancestors
  WHERE id = p_card_id;

  IF v_cycle_exists > 0 THEN
    RAISE EXCEPTION 'Cyclic reference detected';
  END IF;

  -- Count existing subtasks
  SELECT count(*) INTO v_sub_count
  FROM kk_cards
  WHERE parent_id = p_parent_id;

  -- Update the card
  UPDATE kk_cards
  SET parent_id = p_parent_id,
      column_id = v_parent.column_id,
      position = v_sub_count,
      is_starred = CASE WHEN v_is_done THEN false ELSE is_starred END,
      updated_at = now()
  WHERE id = p_card_id
  RETURNING * INTO v_updated_card;

  IF v_updated_card IS NULL THEN
    RAISE EXCEPTION 'Failed to move card under parent';
  END IF;

  RETURN v_updated_card;
END;
$$;

-- ============================================================
-- reorder_cards: batch update positions using unnest WITH ORDINALITY
-- ============================================================
CREATE OR REPLACE FUNCTION kk_reorder_cards(
  p_card_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE kk_cards
  SET position = ord.position,
      updated_at = now()
  FROM unnest(p_card_ids) WITH ORDINALITY AS t(id, position) AS ord
  WHERE kk_cards.id = ord.id;
END;
$$;

-- ============================================================
-- reorder_boards: batch update positions using unnest WITH ORDINALITY
-- ============================================================
CREATE OR REPLACE FUNCTION kk_reorder_boards(
  p_board_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE kk_boards
  SET position = ord.position
  FROM unnest(p_board_ids) WITH ORDINALITY AS t(id, position) AS ord
  WHERE kk_boards.id = ord.id;
END;
$$;

-- ============================================================
-- batch_toggle_stars: batch update is_starred for multiple cards
-- ============================================================
CREATE OR REPLACE FUNCTION kk_batch_toggle_stars(
  p_card_ids   uuid[],
  p_is_starred boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE kk_cards
  SET is_starred = p_is_starred,
      updated_at = now()
  WHERE id = ANY(p_card_ids);
END;
$$;

-- ============================================================
-- move_card: check done column + update in one call
-- ============================================================
CREATE OR REPLACE FUNCTION kk_move_card(
  p_card_id      uuid,
  p_column_id    uuid,
  p_position     integer
)
RETURNS kk_cards
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_column_name  text;
  v_is_done      boolean;
  v_updated_card kk_cards;
BEGIN
  SELECT name INTO v_column_name
  FROM kk_columns
  WHERE id = p_column_id;

  v_is_done := v_column_name ILIKE 'done';

  UPDATE kk_cards
  SET column_id = p_column_id,
      position = p_position,
      is_starred = CASE WHEN v_is_done THEN false ELSE is_starred END,
      updated_at = now()
  WHERE id = p_card_id
  RETURNING * INTO v_updated_card;

  IF v_updated_card IS NULL THEN
    RAISE EXCEPTION 'Failed to move card';
  END IF;

  RETURN v_updated_card;
END;
$$;

-- ============================================================
-- move_card_to_board: find first column of target board + move card + move subtasks
-- ============================================================
CREATE OR REPLACE FUNCTION kk_move_card_to_board(
  p_card_id    uuid,
  p_board_id   uuid
)
RETURNS kk_cards
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_target_column_id uuid;
  v_column_name      text;
  v_is_done          boolean;
  v_updated_card     kk_cards;
BEGIN
  SELECT id, name INTO v_target_column_id, v_column_name
  FROM kk_columns
  WHERE board_id = p_board_id
  ORDER BY position ASC
  LIMIT 1;

  IF v_target_column_id IS NULL THEN
    RAISE EXCEPTION 'Target board has no columns';
  END IF;

  v_is_done := v_column_name ILIKE 'done';

  UPDATE kk_cards
  SET column_id = v_target_column_id,
      parent_id = NULL,
      is_starred = CASE WHEN v_is_done THEN false ELSE is_starred END,
      updated_at = now()
  WHERE id = p_card_id
  RETURNING * INTO v_updated_card;

  IF v_updated_card IS NULL THEN
    RAISE EXCEPTION 'Failed to move card';
  END IF;

  -- Move subtasks to same column
  UPDATE kk_cards
  SET column_id = v_target_column_id,
      updated_at = now()
  WHERE parent_id = p_card_id;

  RETURN v_updated_card;
END;
$$;