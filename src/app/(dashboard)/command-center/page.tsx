import { createClient, getUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommandCenterClient } from '@/components/command-center/CommandCenterClient'
import { getProfile } from '@/lib/supabase/profile'

interface BoardRow { id: string; name: string }

export default async function CommandCenterPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const supabase = await createClient()

  const [profile, { data: starredCards }] = await Promise.all([
    getProfile(supabase, userId),
    supabase
      .from('kk_cards')
      .select('id, title, column_id, kk_columns!inner(board_id, kk_boards!inner(id, name, user_id))')
      .eq('kk_columns.kk_boards.user_id', userId)
      .eq('is_starred', true)
      .eq('is_archived', false)
      .order('title'),
  ])

  const firstName = (profile as { full_name: string } | null)?.full_name?.split(' ')[0] ?? 'gebruiker'

  const starredItems: { boardId: string; boardName: string; cards: { id: string; title: string }[] }[] = []
  const groupedByBoard = new Map<string, { boardName: string; cards: { id: string; title: string }[] }>()

  for (const card of (starredCards ?? []) as Array<{ id: string; title: string; column_id: string; kk_columns: { board_id: string; kk_boards: { id: string; name: string } } | null }>) {
    const col = card.kk_columns
    if (!col) continue
    const board = col.kk_boards
    if (!board) continue
    const boardId = board.id
    const boardName = board.name
    if (!groupedByBoard.has(boardId)) {
      groupedByBoard.set(boardId, { boardName, cards: [] })
    }
    groupedByBoard.get(boardId)!.cards.push({ id: card.id, title: card.title })
  }

  for (const [boardId, { boardName, cards }] of groupedByBoard) {
    starredItems.push({ boardId, boardName, cards })
  }

  return <CommandCenterClient firstName={firstName} starredItems={starredItems} />
}