'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, 'public', any>

async function getSupabase(): Promise<{ supabase: UntypedClient; user: { id: string } | null }> {
  const supabase = (await createClient()) as unknown as UntypedClient
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user: user as { id: string } | null }
}

export async function createBoard(data: { name: string }) {
  try {
    const { supabase, user } = await getSupabase()
    if (!user) return { id: '', error: 'Niet ingelogd' }

    const { data: board, error } = await supabase
      .from('boards').insert({ name: data.name, user_id: user.id }).select().single()

    if (error || !board) return { id: '', error: error?.message ?? 'Kon bord niet aanmaken' }

    await supabase.from('columns').insert([
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
    const { supabase } = await getSupabase()
    const { error } = await supabase.from('boards').update({ name: data.name }).eq('id', data.boardId)
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
    const { supabase } = await getSupabase()
    const { error } = await supabase.from('boards').delete().eq('id', data.boardId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/boards')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function reorderBoards(data: { orderedIds: string[] }) {
  try {
    const { supabase } = await getSupabase()
    await Promise.all(data.orderedIds.map((id, i) =>
      supabase.from('boards').update({ position: i }).eq('id', id)
    ))
    revalidatePath('/boards')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}
