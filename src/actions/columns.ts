'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, 'public', any>

async function getSupabase(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient
}

export async function createColumn(data: { boardId: string; name: string }) {
  try {
    const supabase = await getSupabase()
    const { data: maxCol } = await supabase.from('columns').select('position')
      .eq('board_id', data.boardId).order('position', { ascending: false }).limit(1)
    const position = (maxCol?.[0]?.position ?? -1) + 1

    const { data: column, error } = await supabase.from('columns')
      .insert({ board_id: data.boardId, name: data.name, position }).select().single()
    if (error || !column) return { id: '', error: error?.message ?? 'Kon kolom niet aanmaken' }
    revalidatePath(`/boards/${data.boardId}`)
    return { id: column.id }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateColumn(data: { columnId: string; name: string }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('columns').update({ name: data.name }).eq('id', data.columnId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteColumn(data: { columnId: string; boardId: string; targetColumnId?: string }) {
  try {
    const supabase = await getSupabase()
    if (data.targetColumnId) {
      await supabase.from('cards').update({ column_id: data.targetColumnId }).eq('column_id', data.columnId)
    }
    await supabase.from('columns').delete().eq('id', data.columnId)
    revalidatePath(`/boards/${data.boardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderColumns(data: { boardId: string; orderedIds: string[] }) {
  try {
    const supabase = await getSupabase()
    await Promise.all(data.orderedIds.map((id, i) =>
      supabase.from('columns').update({ position: i }).eq('id', id)
    ))
    revalidatePath(`/boards/${data.boardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
