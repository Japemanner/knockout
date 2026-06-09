'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

export async function createColumn(data: { boardId: string; name: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { data: maxCol } = await supabase
      .from('kk_columns')
      .select('position')
      .eq('board_id', data.boardId)
      .order('position', { ascending: false })
      .limit(1)
    const position = (maxCol?.[0]?.position ?? -1) + 1

    const { data: column, error } = await supabase
      .from('kk_columns')
      .insert({ board_id: data.boardId, name: data.name, position })
      .select()
      .single()
    if (error || !column) return { id: '', error: error?.message ?? 'Kon kolom niet aanmaken' }
    revalidatePath(`/boards/${data.boardId}`)
    return { id: column.id }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateColumn(data: { columnId: string; name: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_columns').update({ name: data.name }).eq('id', data.columnId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteColumn(data: { columnId: string; boardId: string; targetColumnId?: string }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    if (data.targetColumnId) {
      await supabase.from('kk_cards').update({ column_id: data.targetColumnId }).eq('column_id', data.columnId)
    }
    await supabase.from('kk_columns').delete().eq('id', data.columnId)
    revalidatePath(`/boards/${data.boardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderColumns(data: { boardId: string; orderedIds: string[] }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    await Promise.all(data.orderedIds.map((id, i) =>
      supabase.from('kk_columns').update({ position: i }).eq('id', id)
    ))
    revalidatePath(`/boards/${data.boardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}