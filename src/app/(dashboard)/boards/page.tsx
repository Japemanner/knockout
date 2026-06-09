import { createClient } from '@/lib/supabase/server'
import { CreateBoardButton } from '@/components/kanban/CreateBoardButton'
import { BoardCard } from '@/components/kanban/BoardCard'
import type { Board } from '@/types/database.types'

export default async function BoardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('kk_boards')
    .select('*')
    .eq('user_id', user!.id)
    .order('position', { ascending: true })

  const boards: Board[] = data ?? []

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