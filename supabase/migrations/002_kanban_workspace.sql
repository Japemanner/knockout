-- Migration: 002_kanban_workspace.sql
-- Description: Add Kanban workspace tables with RLS policies
-- Date: 2026-06-02

-- ============================================================
-- TABLES
-- ============================================================

-- Boards
CREATE TABLE public.boards (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    is_inbox    boolean DEFAULT false,
    position    integer DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Columns
CREATE TABLE public.columns (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id    uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name        text NOT NULL,
    position    integer NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Cards
CREATE TABLE public.cards (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    column_id   uuid NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
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

-- Time sessions
CREATE TABLE public.time_sessions (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id     uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    started_at  timestamptz NOT NULL,
    ended_at    timestamptz,
    created_at  timestamptz DEFAULT now(),
    CONSTRAINT ended_after_started CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- DB connections (encrypted connection strings)
CREATE TABLE public.db_connections (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                text NOT NULL,
    encrypted_conn_str  text NOT NULL,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- RSS feeds
CREATE TABLE public.rss_feeds (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        text NOT NULL,
    url         text NOT NULL,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

-- Focus notes (one per user per day)
CREATE TABLE public.focus_notes (
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

CREATE INDEX idx_boards_user_id ON public.boards(user_id);
CREATE INDEX idx_columns_board_id ON public.columns(board_id);
CREATE INDEX idx_cards_column_id_position ON public.cards(column_id, position);
CREATE INDEX idx_cards_starred_archived ON public.cards(is_starred, is_archived) WHERE is_starred = true AND is_archived = false;
CREATE INDEX idx_cards_deadline ON public.cards(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_time_sessions_card_id ON public.time_sessions(card_id, started_at);
CREATE INDEX idx_db_connections_user_id ON public.db_connections(user_id);
CREATE INDEX idx_rss_feeds_user_id ON public.rss_feeds(user_id);
CREATE INDEX idx_focus_notes_user_date ON public.focus_notes(user_id, date);

-- ============================================================
-- RLS: ENABLE ON ALL TABLES
-- ============================================================

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.db_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: boards
-- ============================================================

CREATE POLICY "Users can view own boards"
    ON public.boards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boards"
    ON public.boards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards"
    ON public.boards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards"
    ON public.boards FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: columns (through board ownership)
-- ============================================================

CREATE POLICY "Users can view columns of own boards"
    ON public.columns FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE boards.id = columns.board_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create columns in own boards"
    ON public.columns FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE boards.id = columns.board_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update columns in own boards"
    ON public.columns FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE boards.id = columns.board_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete columns in own boards"
    ON public.columns FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.boards
            WHERE boards.id = columns.board_id
            AND boards.user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: cards (through column → board ownership)
-- ============================================================

CREATE POLICY "Users can view cards in own boards"
    ON public.cards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.columns
            JOIN public.boards ON boards.id = columns.board_id
            WHERE columns.id = cards.column_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create cards in own boards"
    ON public.cards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.columns
            JOIN public.boards ON boards.id = columns.board_id
            WHERE columns.id = cards.column_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update cards in own boards"
    ON public.cards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.columns
            JOIN public.boards ON boards.id = columns.board_id
            WHERE columns.id = cards.column_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete cards in own boards"
    ON public.cards FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.columns
            JOIN public.boards ON boards.id = columns.board_id
            WHERE columns.id = cards.column_id
            AND boards.user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: time_sessions (through card → column → board)
-- ============================================================

CREATE POLICY "Users can view time sessions for own cards"
    ON public.time_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.columns ON columns.id = cards.column_id
            JOIN public.boards ON boards.id = columns.board_id
            WHERE cards.id = time_sessions.card_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create time sessions for own cards"
    ON public.time_sessions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.columns ON columns.id = cards.column_id
            JOIN public.boards ON boards.id = columns.board_id
            WHERE cards.id = time_sessions.card_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update time sessions for own cards"
    ON public.time_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.columns ON columns.id = cards.column_id
            JOIN public.boards ON boards.id = columns.board_id
            WHERE cards.id = time_sessions.card_id
            AND boards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete time sessions for own cards"
    ON public.time_sessions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            JOIN public.columns ON columns.id = cards.column_id
            JOIN public.boards ON boards.id = columns.board_id
            WHERE cards.id = time_sessions.card_id
            AND boards.user_id = auth.uid()
        )
    );

-- ============================================================
-- RLS POLICIES: db_connections
-- ============================================================

CREATE POLICY "Users can view own db connections"
    ON public.db_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own db connections"
    ON public.db_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own db connections"
    ON public.db_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own db connections"
    ON public.db_connections FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: rss_feeds
-- ============================================================

CREATE POLICY "Users can view own rss feeds"
    ON public.rss_feeds FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rss feeds"
    ON public.rss_feeds FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rss feeds"
    ON public.rss_feeds FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rss feeds"
    ON public.rss_feeds FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================
-- RLS POLICIES: focus_notes
-- ============================================================

CREATE POLICY "Users can view own focus notes"
    ON public.focus_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own focus notes"
    ON public.focus_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus notes"
    ON public.focus_notes FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================

CREATE TRIGGER set_updated_at_boards
    BEFORE UPDATE ON public.boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_columns
    BEFORE UPDATE ON public.columns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_cards
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_db_connections
    BEFORE UPDATE ON public.db_connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_rss_feeds
    BEFORE UPDATE ON public.rss_feeds
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_focus_notes
    BEFORE UPDATE ON public.focus_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
