'use server'

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, 'public', any>

async function getSupabase(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient
}

export async function toggleStar(data: { cardId: string; isStarred: boolean }) {
  try {
    const supabase = await getSupabase()
    const { error } = await supabase.from('kk_cards').update({ is_starred: data.isStarred }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/starred')

    const { data: column } = await supabase
      .from('kk_columns')
      .select('board_id')
      .eq('id', (await supabase.from('kk_cards').select('column_id').eq('id', data.cardId).single()).data?.column_id ?? '')
      .single()

    if (column?.board_id) {
      revalidatePath(`/boards/${column.board_id}`)
    }
    revalidatePath('/boards')

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function batchToggleStars(data: { cardIds: string[]; isStarred: boolean }) {
  try {
    const supabase = await getSupabase()
    await Promise.all(data.cardIds.map((id) =>
      supabase.from('kk_cards').update({ is_starred: data.isStarred }).eq('id', id)
    ))
    revalidatePath('/starred')
    revalidatePath('/boards')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}