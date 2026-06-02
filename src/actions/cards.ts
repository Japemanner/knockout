'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, 'public', any>

async function getSupabase(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient
}

export async function createCard(data: { columnId: string; title: string }) {
  try {
    const supabase = await getSupabase()
    const { data: maxCard } = await supabase.from('cards').select('position')
      .eq('column_id', data.columnId).eq('is_archived', false)
      .order('position', { ascending: false }).limit(1)
    const position = (maxCard?.[0]?.position ?? -1) + 1

    const { data: card, error } = await supabase.from('cards')
      .insert({ column_id: data.columnId, title: data.title, position })
      .select('id, columns!inner(board_id)').single()

    if (error || !card) return { id: '', error: error?.message ?? 'Kon kaart niet aanmaken' }
    const boardId = (card.columns as { board_id: string }[])?.[0]?.board_id
    if (boardId) revalidatePath(`/boards/${boardId}`)
    return { id: card.id }
  } catch (err) {
    return { id: '', error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function updateCard(data: {
  cardId: string; title?: string; description?: string; url?: string; deadline?: string | null
}) {
  try {
    const supabase = await getSupabase()
    const update: Record<string, unknown> = {}
    if (data.title !== undefined) update.title = data.title
    if (data.description !== undefined) update.description = data.description
    if (data.url !== undefined) update.url = data.url
    if (data.deadline !== undefined) update.deadline = data.deadline
    const { error } = await supabase.from('cards').update(update).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function moveCard(data: { cardId: string; targetColumnId: string; position: number }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('cards')
      .update({ column_id: data.targetColumnId, position: data.position }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function moveCardToBoard(data: { cardId: string; targetBoardId: string }) {
  try {
    const supabase = await getSupabase()
    const { data: firstCol } = await supabase.from('columns').select('id')
      .eq('board_id', data.targetBoardId).order('position').limit(1).single()
    if (!firstCol) return { success: false, error: 'Doelbord heeft geen kolommen' }

    const { data: maxCard } = await supabase.from('cards').select('position')
      .eq('column_id', firstCol.id).eq('is_archived', false)
      .order('position', { ascending: false }).limit(1)
    const position = (maxCard?.[0]?.position ?? -1) + 1

    const { error } = await supabase.from('cards')
      .update({ column_id: firstCol.id, position }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    revalidatePath(`/boards/${data.targetBoardId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderCards(data: { columnId: string; orderedCardIds: string[] }) {
  try {
    const supabase = await getSupabase()
    await Promise.all(data.orderedCardIds.map((id, i) =>
      supabase.from('cards').update({ position: i }).eq('id', id)
    ))
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function toggleArchiveCard(data: { cardId: string; isArchived: boolean }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('cards').update({ is_archived: data.isArchived }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function deleteCard(data: { cardId: string }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('cards').delete().eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
