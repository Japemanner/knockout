'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

export async function createBoard(data: { name: string }) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: board, error } = await supabase
      .from('kk_boards')
      .insert({ name: data.name, user_id: userId })
      .select()
      .single()

    if (error || !board) return { id: '', error: error?.message ?? 'Kon bord niet aanmaken' }

    await supabase.from('kk_columns').insert([
      { board_id: board.id, name: 'Backlog', position: 0 },
      { board_id: board.id, name: 'Doing', position: 1 },
      { board_id: board.id, name: 'Review', position: 2 },
      { board_id: board.id, name: 'Done', position: 3 },
    ])

    revalidatePath('/boards')
    return { id: board.id }
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