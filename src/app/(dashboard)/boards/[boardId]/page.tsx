import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import type { KColumn, Card, Board } from '@/types/database.types'
import { notFound } from 'next/navigation'

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) notFound()

  const { data: board } = await supabase
    .from('kk_boards')
    .select('*')
    .eq('id', boardId)
    .eq('user_id', user.id)
    .single()

  if (!board) notFound()

  const [{ data: allBoards }, { data: columnData }] = await Promise.all([
    supabase
      .from('kk_boards')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('kk_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true }),
  ])

  const columns: KColumn[] = columnData ?? []

  const { data: cardData } = columns.length > 0
    ? await supabase
        .from('kk_cards')
        .select('*')
        .in('column_id', columns.map((c) => c.id))
        .eq('is_archived', false)
        .order('position', { ascending: true })
    : { data: [] as Card[] }

  const cards: Card[] = cardData ?? []

  return (
    <KanbanBoard
      board={board}
      allBoards={(allBoards as Pick<Board, 'id' | 'name'>[]) ?? []}
      columns={columns}
      cards={cards}
    />
  )
}
