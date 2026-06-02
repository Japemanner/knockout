import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import type { KColumn, Card } from '@/types/database.types'

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: board } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .eq('user_id', user!.id)
    .single()

  const { data: columnData } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position', { ascending: true })

  const columns: KColumn[] = columnData ?? []

  const { data: cardData } = columns.length > 0
    ? await supabase
        .from('cards')
        .select('*')
        .in('column_id', columns.map((c) => c.id))
        .eq('is_archived', false)
        .order('position', { ascending: true })
    : { data: [] as Card[] }

  const cards: Card[] = cardData ?? []

  if (!board) {
    return <p className="text-muted-foreground">Bord niet gevonden.</p>
  }

  return (
    <KanbanBoard
      board={board}
      columns={columns}
      cards={cards}
    />
  )
}
