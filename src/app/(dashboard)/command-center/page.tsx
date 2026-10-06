import { createClient, getUserId } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CommandCenterClient } from '@/components/command-center/CommandCenterClient'
import { getProfile } from '@/lib/supabase/profile'

export interface StarredKanbanSubtask {
  id: string
  title: string
  position: number
  column_id: string
}

export interface StarredKanbanCard {
  id: string
  title: string
  description: string | null
  url: string | null
  deadline: string | null
  is_starred: true
  boardId: string
  boardName: string
  sourceColumnName: string
  position: number
  subtasks: StarredKanbanSubtask[]
}

export type StarredBoardColumns = Record<
  string,
  { id: string; name: string; position: number }[]
>

interface StarredCardRow {
  id: string
  title: string
  description: string | null
  url: string | null
  deadline: string | null
  position: number
  is_starred: boolean
  column_id: string
  kk_columns: {
    id: string
    name: string
    position: number
    board_id: string
    kk_boards: { id: string; name: string }
  } | null
}

interface SubtaskRow {
  id: string
  title: string
  position: number
  column_id: string
  parent_id: string
}

export default async function CommandCenterPage() {
  const userId = await getUserId()
  if (!userId) redirect('/login')

  const supabase = await createClient()

  const [profile, { data: starredCards }] = await Promise.all([
    getProfile(supabase, userId),
    supabase
      .from('kk_cards')
      .select(
        'id, title, description, url, deadline, position, is_starred, column_id, kk_columns!inner(id, name, position, board_id, kk_boards!inner(id, name))',
      )
      .eq('is_starred', true)
      .eq('is_archived', false)
      .is('parent_id', null)
      .eq('kk_columns.kk_boards.user_id', userId),
  ])

  const rows = (starredCards ?? []) as unknown as StarredCardRow[]
  const starredIds = rows.map((card) => card.id)

  const [{ data: subtaskRows }, { data: columnRows }] = await Promise.all([
    starredIds.length > 0
      ? supabase
          .from('kk_cards')
          .select('id, title, position, column_id, parent_id')
          .in('parent_id', starredIds)
          .eq('is_archived', false)
      : Promise.resolve({ data: [] as SubtaskRow[] | null }),
    starredIds.length > 0
      ? supabase
          .from('kk_columns')
          .select('id, name, position, board_id')
          .in(
            'board_id',
            rows.map((card) => card.kk_columns?.board_id).filter((id): id is string => !!id),
          )
          .order('position')
      : Promise.resolve({ data: [] as { id: string; name: string; position: number; board_id: string }[] | null }),
  ])

  const subtasksByParent = new Map<string, StarredKanbanSubtask[]>()
  for (const sub of (subtaskRows ?? []) as SubtaskRow[]) {
    const list = subtasksByParent.get(sub.parent_id) ?? []
    list.push({ id: sub.id, title: sub.title, position: sub.position, column_id: sub.column_id })
    subtasksByParent.set(sub.parent_id, list)
  }

  const boardColumns: StarredBoardColumns = {}
  for (const col of (columnRows ?? []) as { id: string; name: string; position: number; board_id: string }[]) {
    const list = boardColumns[col.board_id] ?? []
    list.push({ id: col.id, name: col.name, position: col.position })
    boardColumns[col.board_id] = list
  }

  const cards: StarredKanbanCard[] = rows
    .filter((card) => card.kk_columns?.kk_boards)
    .map((card) => ({
      id: card.id,
      title: card.title,
      description: card.description,
      url: card.url,
      deadline: card.deadline,
      is_starred: true,
      boardId: card.kk_columns!.kk_boards.id,
      boardName: card.kk_columns!.kk_boards.name,
      sourceColumnName: card.kk_columns!.name,
      position: card.position,
      subtasks: (subtasksByParent.get(card.id) ?? []).sort((a, b) => a.position - b.position),
    }))

  const firstName = (profile as { full_name: string } | null)?.full_name?.split(' ')[0] ?? 'gebruiker'

  return (
    <CommandCenterClient
      firstName={firstName}
      starredCards={cards}
      boardColumns={boardColumns}
    />
  )
}