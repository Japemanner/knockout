import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import { CreateBoardButton } from '@/components/kanban/CreateBoardButton'
import { BoardCard } from '@/components/kanban/BoardCard'
import type { Board } from '@/types/database.types'

const BOARDS_QUERY = `
  SELECT id, user_id, name, is_inbox, position, created_at, updated_at
  FROM kk_boards
  WHERE user_id = $1
  ORDER BY position ASC
`

export default async function BoardsPage() {
  const userId = await getUserId()
  if (!userId) return null

  const pool = getLocalPool()
  const { rows } = await pool.query<Board>(BOARDS_QUERY, [userId])

  const boards: Board[] = rows

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Borden</h1>
          <p className="text-muted-foreground">Je Kanban-borden</p>
        </div>
        <CreateBoardButton boards={boards.map((b) => ({ id: b.id, name: b.name }))} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.length > 0 ? (
          boards.map((board: Board) => (
            <BoardCard
              key={board.id}
              id={board.id}
              name={board.name}
              is_inbox={board.is_inbox}
            />
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-12">
            Nog geen borden. Maak je eerste bord aan met de knop hierboven.
          </p>
        )}
      </div>
    </div>
  )
}