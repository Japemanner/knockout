-- Migration: 002_kanban_workspace.sql
-- Description: Add Kanban workspace tables with RLS policies
-- Date: 2026-06-02

-- ============================================================
-- TABLES
-- ============================================================

-- Boards
CREATE TABLE IF NOT EXISTS kk_boards (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    is_inbox    boolean DEFAULT false,
    position    integer DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Columns
CREATE TABLE IF NOT EXISTS kk_columns (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id    uuid NOT NULL REFERENCES kk_boards(id) ON DELETE CASCADE,
    name        text NOT NULL,
    position    integer NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Cards
CREATE TABLE IF NOT EXISTS kk_cards (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    column_id   uuid NOT NULL REFERENCES kk_columns(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text,
    url         text,
    is_starred  boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    position    integer NOT NULL DEFAULT 0,
    deadline    timestamptz,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Time entries (replaces time_sessions with app-compatible schema)
CREATE TABLE IF NOT EXISTS kk_time_entries (
    id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id           uuid,
    board_id          uuid,
    start_time        timestamptz NOT NULL DEFAULT now(),
    end_time          timestamptz,
    duration_seconds  integer,
    description       text,
    created_at        timestamptz DEFAULT now(),
    updated_at        timestamptz DEFAULT now()
);

-- DB connections (encrypted connection strings)
CREATE TABLE IF NOT EXISTS kk_db_connections (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                text NOT NULL,
    encrypted_conn_str  text NOT NULL,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- RSS feeds
CREATE TABLE IF NOT EXISTS kk_rss_feeds (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    url         text NOT NULL,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Focus notes (one per user per day)
CREATE TABLE IF NOT EXISTS kk_focus_notes (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date        date NOT NULL,
    content     text DEFAULT '',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE (user_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kk_boards_user_id ON kk_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_kk_columns_board_id ON kk_columns(board_id);
CREATE INDEX IF NOT EXISTS idx_kk_cards_column_id_position ON kk_cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_kk_cards_starred_archived ON kk_cards(is_starred, is_archived) WHERE is_starred = true AND is_archived = false;
CREATE INDEX IF NOT EXISTS idx_kk_cards_deadline ON kk_cards(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kk_time_entries_user_id ON kk_time_entries(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_kk_db_connections_user_id ON kk_db_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_kk_rss_feeds_user_id ON kk_rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_kk_focus_notes_user_date ON kk_focus_notes(user_id, date);

-- ============================================================
-- RLS: ENABLE ON ALL TABLES
-- ============================================================

ALTER TABLE kk_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_db_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE kk_focus_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: boards
-- ============================================================

DROP POLICY IF EXISTS "Users can view own boards" ON kk_boards;
CREATE POLICY "Users can view own boards"
    ON kk_boards FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own boards" ON kk_boards;
CREATE POLICY "Users can create own boards"
    ON kk_boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boards" ON kk_boards;
CREATE POLICY "Users can update own boards"
    ON kk_boards FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own boards" ON kk_boards;
CREATE POLICY "Users can delete own boards"
    ON kk_boards FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: columns (through board ownership)
-- ============================================================

DROP POLICY IF EXISTS "Users can view columns of own boards" ON kk_columns;
CREATE POLICY "Users can view columns of own boards"
    ON kk_columns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kk_boards
            WHERE kk_boards.id = kk_columns.board_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create columns in own boards" ON kk_columns;
CREATE POLICY "Users can create columns in own boards"
    ON kk_columns FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kk_boards
            WHERE kk_boards.id = kk_columns.board_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update columns in own boards" ON kk_columns;
CREATE POLICY "Users can update columns in own boards"
    ON kk_columns FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM kk_boards
            WHERE kk_boards.id = kk_columns.board_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete columns in own boards" ON kk_columns;
CREATE POLICY "Users can delete columns in own boards"
    ON kk_columns FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM kk_boards
            WHERE kk_boards.id = kk_columns.board_id
            AND kk_boards.user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: cards (through column → board ownership)
-- ============================================================

DROP POLICY IF EXISTS "Users can view cards in own boards" ON kk_cards;
CREATE POLICY "Users can view cards in own boards"
    ON kk_cards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kk_columns
            JOIN kk_boards ON kk_boards.id = kk_columns.board_id
            WHERE kk_columns.id = kk_cards.column_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create cards in own boards" ON kk_cards;
CREATE POLICY "Users can create cards in own boards"
    ON kk_cards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM kk_columns
            JOIN kk_boards ON kk_boards.id = kk_columns.board_id
            WHERE kk_columns.id = kk_cards.column_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update cards in own boards" ON kk_cards;
CREATE POLICY "Users can update cards in own boards"
    ON kk_cards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM kk_columns
            JOIN kk_boards ON kk_boards.id = kk_columns.board_id
            WHERE kk_columns.id = kk_cards.column_id
            AND kk_boards.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete cards in own boards" ON kk_cards;
CREATE POLICY "Users can delete cards in own boards"
    ON kk_cards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM kk_columns
            JOIN kk_boards ON kk_boards.id = kk_columns.board_id
            WHERE kk_columns.id = kk_cards.column_id
            AND kk_boards.user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: time_entries (on user_id)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own time entries" ON kk_time_entries;
CREATE POLICY "Users can view own time entries"
    ON kk_time_entries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own time entries" ON kk_time_entries;
CREATE POLICY "Users can create own time entries"
    ON kk_time_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own time entries" ON kk_time_entries;
CREATE POLICY "Users can update own time entries"
    ON kk_time_entries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own time entries" ON kk_time_entries;
CREATE POLICY "Users can delete own time entries"
    ON kk_time_entries FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: db_connections
-- ============================================================

DROP POLICY IF EXISTS "Users can view own db connections" ON kk_db_connections;
CREATE POLICY "Users can view own db connections"
    ON kk_db_connections FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own db connections" ON kk_db_connections;
CREATE POLICY "Users can create own db connections"
    ON kk_db_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own db connections" ON kk_db_connections;
CREATE POLICY "Users can update own db connections"
    ON kk_db_connections FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own db connections" ON kk_db_connections;
CREATE POLICY "Users can delete own db connections"
    ON kk_db_connections FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: rss_feeds
-- ============================================================

DROP POLICY IF EXISTS "Users can view own rss feeds" ON kk_rss_feeds;
CREATE POLICY "Users can view own rss feeds"
    ON kk_rss_feeds FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own rss feeds" ON kk_rss_feeds;
CREATE POLICY "Users can create own rss feeds"
    ON kk_rss_feeds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own rss feeds" ON kk_rss_feeds;
CREATE POLICY "Users can update own rss feeds"
    ON kk_rss_feeds FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own rss feeds" ON kk_rss_feeds;
CREATE POLICY "Users can delete own rss feeds"
    ON kk_rss_feeds FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: focus_notes
-- ============================================================

DROP POLICY IF EXISTS "Users can view own focus notes" ON kk_focus_notes;
CREATE POLICY "Users can view own focus notes"
    ON kk_focus_notes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own focus notes" ON kk_focus_notes;
CREATE POLICY "Users can create own focus notes"
    ON kk_focus_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own focus notes" ON kk_focus_notes;
CREATE POLICY "Users can update own focus notes"
    ON kk_focus_notes FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_boards ON kk_boards;
CREATE TRIGGER set_updated_at_boards
    BEFORE UPDATE ON kk_boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_columns ON kk_columns;
CREATE TRIGGER set_updated_at_columns
    BEFORE UPDATE ON kk_columns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_cards ON kk_cards;
CREATE TRIGGER set_updated_at_cards
    BEFORE UPDATE ON kk_cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_time_entries ON kk_time_entries;
CREATE TRIGGER set_updated_at_time_entries
    BEFORE UPDATE ON kk_time_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_db_connections ON kk_db_connections;
CREATE TRIGGER set_updated_at_db_connections
    BEFORE UPDATE ON kk_db_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_rss_feeds ON kk_rss_feeds;
CREATE TRIGGER set_updated_at_rss_feeds
    BEFORE UPDATE ON kk_rss_feeds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_focus_notes ON kk_focus_notes;
CREATE TRIGGER set_updated_at_focus_notes
    BEFORE UPDATE ON kk_focus_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();