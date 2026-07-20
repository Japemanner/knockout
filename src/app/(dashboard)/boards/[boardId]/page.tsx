import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import type { KColumn, Card, Board } from '@/types/database.types'
import { notFound } from 'next/navigation'

interface BoardRow {
  id: string
  name: string
  user_id: string
  is_inbox: boolean
  position: number
  created_at: string
  updated_at: string
}

interface ColumnRow {
  id: string
  board_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
}

interface CardRow {
  id: string
  column_id: string
  parent_id: string | null
  title: string
  description: string | null
  url: string | null
  is_starred: boolean
  is_archived: boolean
  position: number
  deadline: string | null
  created_at: string
  updated_at: string
}

interface BoardQueryResult {
  board: BoardRow | null
  all_boards: { id: string; name: string }[]
  columns: ColumnRow[]
  cards: CardRow[]
}

// Eén SQL-CTE in plaats van twee PostgREST round-trips. Bespaart ~80-150ms
// per page-load (TLS-overhead + JSON-shaping in PostgREST vervalt).
// RLS-compensatie: expliciete `WHERE user_id = $1` filtering op board-niveau;
// cards erven isolatie via de join met kk_columns/kk_boards van deze user.
const BOARD_QUERY = `
  WITH target_board AS (
    SELECT * FROM kk_boards WHERE id = $1 AND user_id = $2
  ),
  all_boards AS (
    SELECT id, name FROM kk_boards WHERE user_id = $2 ORDER BY name
  ),
  board_columns AS (
    SELECT c.* FROM kk_columns c
    JOIN target_board tb ON c.board_id = tb.id
    ORDER BY c.position
  ),
  board_cards AS (
    SELECT card.* FROM kk_cards card
    JOIN board_columns col ON card.column_id = col.id
    WHERE card.is_archived = false
    ORDER BY col.position, card.position
  )
  SELECT
    (SELECT to_jsonb(tb) FROM target_board tb) AS board,
    COALESCE((SELECT json_agg(ab ORDER BY ab.name) FROM all_boards ab), '[]'::json) AS all_boards,
    COALESCE((SELECT json_agg(col) FROM board_columns col), '[]'::json) AS columns,
    COALESCE((SELECT json_agg(card) FROM board_cards card), '[]'::json) AS cards
`

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const pool = getLocalPool()
  const { rows } = await pool.query<BoardQueryResult>(BOARD_QUERY, [boardId, userId])
  const result = rows[0]

  if (!result?.board) notFound()

  const board = result.board as Board
  const allBoards = result.all_boards as Pick<Board, 'id' | 'name'>[]
  const columns: KColumn[] = result.columns as KColumn[]
  const cards: Card[] = result.cards as Card[]

  return (
    <KanbanBoard
      board={board as Pick<Board, 'id' | 'name'>}
      allBoards={allBoards}
      columns={columns}
      cards={cards}
    />
  )
}