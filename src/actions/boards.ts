'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import { revalidatePath } from 'next/cache'

// Eén SQL-CTE vervangt insert board + insert 4 default kolommen (2 round-trips
// → 1). Bespaart ~50ms per bord-aanmaak. RLS-compensatie: user_id = $1.
const CREATE_BOARD_QUERY = `
  WITH inserted_board AS (
    INSERT INTO kk_boards (name, user_id)
    VALUES ($1, $2)
    RETURNING id
  )
  INSERT INTO kk_columns (board_id, name, position)
  SELECT id, col.name, col.position
  FROM inserted_board, (VALUES
    ('Backlog'::text, 0),
    ('Doing', 1),
    ('Review', 2),
    ('Done', 3)
  ) AS col(name, position)
  RETURNING (SELECT id FROM inserted_board)
`

export async function createBoard(data: { name: string }) {
  try {
    const userId = await getUserId()
    if (!userId) return { id: '', error: 'Niet ingelogd' }

    const pool = getLocalPool()
    let boardId: string | undefined
    try {
      const result = await pool.query<{ id: string }>(CREATE_BOARD_QUERY, [
        data.name,
        userId,
      ])
      boardId = result.rows[0]?.id
    } catch (err) {
      return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
    }

    if (!boardId) return { id: '', error: 'Kon bord niet aanmaken' }

    revalidatePath('/boards')
    return { id: boardId }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateBoard(data: { boardId: string; name: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_boards').update({ name: data.name }).eq('id', data.boardId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/boards')
    revalidatePath(`/boards/${data.boardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteBoard(data: { boardId: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_boards').delete().eq('id', data.boardId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/boards')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderBoards(data: { orderedIds: string[] }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.rpc('kk_reorder_boards', { p_board_ids: data.orderedIds })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}