import { createClient, getUserId } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import type { KColumn, Card, Board } from '@/types/database.types'
import { notFound } from 'next/navigation'

interface NestedColumn extends KColumn { kk_cards?: Card[] }
interface NestedBoard extends Board { kk_columns?: NestedColumn[] }

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params
  const userId = await getUserId()
  if (!userId) notFound()

  const supabase = await createClient()

  // Two parallel queries: (a) nested board→columns→cards, (b) all boards list.
  // Previously: board → (allBoards ∥ columns) → cards = 3 sequential stages.
  const [{ data: boardWithNested }, { data: allBoards }] = await Promise.all([
    supabase
      .from('kk_boards')
      .select('*, kk_columns(*, kk_cards(*))')
      .eq('id', boardId)
      .eq('user_id', userId)
      .eq('kk_columns.kk_cards.is_archived', false)
      .order('position', { ascending: true, foreignTable: 'kk_columns' })
      .order('position', { ascending: true, foreignTable: 'kk_columns.kk_cards' })
      .single(),
    supabase
      .from('kk_boards')
      .select('id, name')
      .eq('user_id', userId)
      .order('name'),
  ])

  if (!boardWithNested) notFound()

  const nested = boardWithNested as unknown as NestedBoard

  // Flatten nested result into the same shape KanbanBoard expects
  const columns: KColumn[] = (nested.kk_columns ?? []).map(({ kk_cards: _, ...col }) => col)
  const cards: Card[] = (nested.kk_columns ?? []).flatMap((col) => col.kk_cards ?? [])

  return (
    <KanbanBoard
      board={nested as Pick<Board, 'id' | 'name'>}
      allBoards={(allBoards as Pick<Board, 'id' | 'name'>[]) ?? []}
      columns={columns}
      cards={cards}
    />
  )
}
