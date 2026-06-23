import { createClient, getUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommandCenterClient } from '@/components/command-center/CommandCenterClient'

interface BoardRow { id: string; name: string }
interface ColumnRow { id: string; name: string; board_id: string }
interface CardRow { id: string; title: string; column_id: string }

export const revalidate = 60

export default async function CommandCenterPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const supabase = await createClient()

  const [{ data: profile }, { data: boards }] = await Promise.all([
    supabase
      .from('kk_profiles')
      .select('full_name')
      .eq('id', userId)
      .single(),
    supabase
      .from('kk_boards')
      .select('id, name')
      .eq('user_id', userId),
  ])

  const firstName = (profile as { full_name: string } | null)?.full_name?.split(' ')[0] ?? 'gebruiker'

  const starredItems: { boardId: string; boardName: string; cards: { id: string; title: string }[] }[] = []

  if (boards && boards.length > 0) {
    const boardIds = boards.map((b: BoardRow) => b.id)
    const boardMap = new Map(boards.map((b: BoardRow) => [b.id, b.name]))

    const { data: columns } = await supabase
      .from('kk_columns')
      .select('id, name, board_id')
      .in('board_id', boardIds)

    const columnIds = (columns ?? []).map((c: ColumnRow) => c.id)

    if (columnIds.length > 0) {
      const columnToBoard = new Map((columns ?? []).map((c: ColumnRow) => [c.id, c.board_id]))

      const { data: starredCards } = await supabase
        .from('kk_cards')
        .select('id, title, column_id')
        .in('column_id', columnIds)
        .eq('is_starred', true)
        .eq('is_archived', false)
        .order('title')

      const groupedByBoard = new Map<string, { boardName: string; cards: { id: string; title: string }[] }>()

      for (const card of (starredCards ?? []) as CardRow[]) {
        const boardId = columnToBoard.get(card.column_id)
        if (!boardId) continue
        const boardName = boardMap.get(boardId) ?? 'Onbekend'
        if (!groupedByBoard.has(boardId)) {
          groupedByBoard.set(boardId, { boardName, cards: [] })
        }
        groupedByBoard.get(boardId)!.cards.push({ id: card.id, title: card.title })
      }

      for (const [boardId, { boardName, cards }] of groupedByBoard) {
        starredItems.push({ boardId, boardName, cards })
      }
    }
  }

  return <CommandCenterClient firstName={firstName} starredItems={starredItems} />
}